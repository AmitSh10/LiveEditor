/**
 * Filesystem-backed workspace slice
 * Projects are real OS directories, files are real OS files
 * .leditor file tracks project metadata
 * Personal state (cursor positions, open tabs) stored in localStorage separately
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FileSystemDirectoryHandle, LEditorManifest, ProjectPersonalState } from '../../types/filesystem';
import type { FolderNode, FSNode, FileNode } from '../../types/fs';
import {
	isFileSystemAccessSupported,
	pickDirectory,
	readLEditorFile,
	createLEditorManifest,
	readFile,
	writeFile,
	createDirectory,
	deleteFile,
	deleteDirectory,
	rescanAndUpdateManifest,
} from '../../utils/filesystemAPI';
import {
	saveProjectHandle as saveProjectHandleIDB,
	// loadProjectHandle as loadProjectHandleIDB, // Unused for now
	deleteProjectHandle as deleteProjectHandleIDB,
	loadAllProjectHandles,
	verifyHandleAccess,
} from '../../utils/handlePersistence';

// ========== Types ==========

interface FilesystemProject {
	id: string;
	name: string;
	rootPath: string; // User-friendly display path
	manifest: LEditorManifest;
	created: string;
	modified: string;

	// Virtual file tree built from manifest (for UI compatibility)
	root: FolderNode;
}

interface FilesystemWorkspace {
	projects: FilesystemProject[];
	activeProjectId: string | null;
	hexViewEnabled: boolean;
	// Counter to force re-renders when localStorage changes
	personalStateVersion: number;
}

// ========== In-memory storage for directory handles ==========
// FileSystemDirectoryHandle cannot be serialized to Redux, so we store them separately
// We use IndexedDB for persistence across page refreshes
const projectHandles = new Map<string, FileSystemDirectoryHandle>();

export function getProjectHandle(projectId: string): FileSystemDirectoryHandle | null {
	return projectHandles.get(projectId) || null;
}

export async function setProjectHandle(
	projectId: string,
	handle: FileSystemDirectoryHandle,
	name: string,
	rootPath: string
): Promise<void> {
	projectHandles.set(projectId, handle);
	// Persist to IndexedDB
	await saveProjectHandleIDB(projectId, handle, name, rootPath);
}

export async function removeProjectHandle(projectId: string): Promise<void> {
	projectHandles.delete(projectId);
	// Remove from IndexedDB
	await deleteProjectHandleIDB(projectId);
}

// ========== Personal State (localStorage) ==========

const PERSONAL_STATE_KEY = 'leditor_personal_state';

function getPersonalState(projectId: string): ProjectPersonalState | null {
	try {
		const stored = localStorage.getItem(PERSONAL_STATE_KEY);
		if (!stored) return null;

		const allStates = JSON.parse(stored) as Record<string, ProjectPersonalState>;
		return allStates[projectId] || null;
	} catch {
		return null;
	}
}

function savePersonalState(projectId: string, state: Partial<ProjectPersonalState>): void {
	try {
		const stored = localStorage.getItem(PERSONAL_STATE_KEY);
		const allStates = stored ? JSON.parse(stored) : {};

		allStates[projectId] = {
			...(allStates[projectId] || {}),
			...state,
			projectId,
		};

		localStorage.setItem(PERSONAL_STATE_KEY, JSON.stringify(allStates));
	} catch (err) {
		console.error('Failed to save personal state:', err);
	}
}

function deletePersonalState(projectId: string): void {
	try {
		const stored = localStorage.getItem(PERSONAL_STATE_KEY);
		if (!stored) return;

		const allStates = JSON.parse(stored);
		delete allStates[projectId];
		localStorage.setItem(PERSONAL_STATE_KEY, JSON.stringify(allStates));
	} catch (err) {
		console.error('Failed to delete personal state:', err);
	}
}

// ========== Helper Functions ==========

function genId(prefix: 'proj' | 'f' | 'd' = 'proj'): string {
	const uid =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? (crypto as Crypto).randomUUID()
			: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
	return `${prefix}_${uid}`;
}

/**
 * Generate a stable ID based on file/folder path
 * This ensures the same path always gets the same ID across tree rebuilds
 */
function getStableId(path: string, type: 'file' | 'folder'): string {
	// Simple hash function
	let hash = 0;
	const str = `${type}:${path}`;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	const prefix = type === 'file' ? 'f' : 'd';
	return `${prefix}_${Math.abs(hash).toString(36)}`;
}

/**
 * Build virtual file tree from manifest for UI compatibility
 */
function buildVirtualTree(manifest: LEditorManifest, rootPath: string): FolderNode {
	const root: FolderNode = {
		id: getStableId('', 'folder'), // Root folder always has empty path
		type: 'folder',
		name: rootPath,
		children: [],
	};

	// Create folder structure
	const folderMap = new Map<string, FolderNode>();
	folderMap.set('', root);

	// Sort folders by depth
	const sortedFolders = [...manifest.folders].sort((a, b) => {
		return a.split('/').length - b.split('/').length;
	});

	for (const folderPath of sortedFolders) {
		const parts = folderPath.split('/');
		const parentPath = parts.slice(0, -1).join('/');
		const folderName = parts[parts.length - 1];

		const parentFolder = folderMap.get(parentPath);
		if (!parentFolder) continue;

		const folder: FolderNode = {
			id: getStableId(folderPath, 'folder'),
			type: 'folder',
			name: folderName,
			children: [],
		};

		parentFolder.children.push(folder);
		folderMap.set(folderPath, folder);
	}

	// Add files
	for (const fileMetadata of manifest.files) {
		const pathParts = fileMetadata.path.split('/');
		const fileName = pathParts[pathParts.length - 1];
		const nameParts = fileName.split('.');
		const extension = nameParts.length > 1 ? nameParts.pop()! : '';
		const name = nameParts.join('.');

		const parentPath = pathParts.slice(0, -1).join('/');
		const parentFolder = folderMap.get(parentPath);
		if (!parentFolder) continue;

		const file: FileNode = {
			id: getStableId(fileMetadata.path, 'file'),
			type: 'file',
			name,
			extension,
			content: '', // Content loaded on demand
		};

		parentFolder.children.push(file);
	}

	return root;
}

/**
 * Find a node by ID in the virtual tree
 */
function findNode(root: FSNode, id: string): FSNode | null {
	if (root.id === id) return root;
	if (root.type === 'folder') {
		for (const child of root.children) {
			const found = findNode(child, id);
			if (found) return found;
		}
	}
	return null;
}

/**
 * Get the relative path of a node from root
 * (Currently unused, but available for future use)
 */
// function getNodePath(root: FolderNode, nodeId: string): string | null {
// 	function traverse(node: FSNode, currentPath: string[]): string | null {
// 		if (node.id === nodeId) {
// 			if (node.type === 'file') {
// 				const fileName = node.extension ? `${node.name}.${node.extension}` : node.name;
// 				return [...currentPath, fileName].join('/');
// 			} else {
// 				return currentPath.join('/');
// 			}
// 		}

// 		if (node.type === 'folder') {
// 			for (const child of node.children) {
// 				const result = traverse(child, [...currentPath, node.name]);
// 				if (result !== null) return result;
// 			}
// 		}

// 		return null;
// 	}

// 	const path = traverse(root, []);
// 	return path ? path.replace(/^root\//, '') : null;
// }

// ========== Workspace State Persistence (localStorage) ==========

const WORKSPACE_STATE_KEY = 'leditor_filesystem_workspace';

interface PersistedWorkspaceState {
	projects: Array<{
		id: string;
		name: string;
		rootPath: string;
		created: string;
		modified: string;
	}>;
	activeProjectId: string | null;
}

function saveWorkspaceState(state: FilesystemWorkspace): void {
	try {
		const persisted: PersistedWorkspaceState = {
			projects: state.projects.map((p) => ({
				id: p.id,
				name: p.name,
				rootPath: p.rootPath,
				created: p.created,
				modified: p.modified,
			})),
			activeProjectId: state.activeProjectId,
		};
		localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify(persisted));
	} catch (err) {
		console.error('Failed to save workspace state:', err);
	}
}

function loadWorkspaceState(): PersistedWorkspaceState | null {
	try {
		const stored = localStorage.getItem(WORKSPACE_STATE_KEY);
		if (!stored) return null;
		return JSON.parse(stored);
	} catch (err) {
		console.error('Failed to load workspace state:', err);
		return null;
	}
}

// ========== Initial State ==========

const initialState: FilesystemWorkspace = {
	projects: [],
	activeProjectId: null,
	hexViewEnabled: false,
	personalStateVersion: 0,
};

// ========== Slice ==========

const filesystemWorkspaceSlice = createSlice({
	name: 'filesystemWorkspace',
	initialState,
	reducers: {
		// ========== Project Management ==========

		// This is handled by async thunk - placeholder for state update
		projectOpened(
			state,
			action: PayloadAction<{
				id: string;
				name: string;
				rootPath: string;
				manifest: LEditorManifest;
			}>
		) {
			const { id, name, rootPath, manifest } = action.payload;

			// Check if project already exists
			const existingIndex = state.projects.findIndex((p) => p.id === id);
			if (existingIndex !== -1) {
				// Update existing project instead of creating duplicate
				state.projects[existingIndex].manifest = manifest;
				state.projects[existingIndex].modified = manifest.modified;
				state.projects[existingIndex].root = buildVirtualTree(manifest, rootPath);
				state.activeProjectId = id;
				saveWorkspaceState(state);
				return;
			}

			const project: FilesystemProject = {
				id,
				name,
				rootPath,
				manifest,
				created: manifest.created,
				modified: manifest.modified,
				root: buildVirtualTree(manifest, rootPath),
			};

			state.projects.push(project);
			state.activeProjectId = id;
			saveWorkspaceState(state);
		},

		projectClosed(state, action: PayloadAction<{ projectId: string }>) {
			const { projectId } = action.payload;
			const index = state.projects.findIndex((p) => p.id === projectId);
			if (index === -1) return;

			state.projects.splice(index, 1);
			removeProjectHandle(projectId);
			deletePersonalState(projectId);

			if (state.activeProjectId === projectId) {
				state.activeProjectId = state.projects[0]?.id || null;
			}
			saveWorkspaceState(state);
		},

		switchProject(state, action: PayloadAction<{ projectId: string }>) {
			const { projectId } = action.payload;
			if (state.projects.find((p) => p.id === projectId)) {
				state.activeProjectId = projectId;
				saveWorkspaceState(state);
			}
		},

		// ========== File Operations (async via thunks) ==========

		fileContentLoaded(
			state,
			action: PayloadAction<{ projectId: string; fileId: string; content: string }>
		) {
			const { projectId, fileId, content } = action.payload;
			const project = state.projects.find((p) => p.id === projectId);
			if (!project) return;

			const file = findNode(project.root, fileId);
			if (file && file.type === 'file') {
				file.content = content;
			}
		},

		fileContentUpdated(
			state,
			action: PayloadAction<{ projectId: string; fileId: string; content: string }>
		) {
			const { projectId, fileId, content } = action.payload;
			const project = state.projects.find((p) => p.id === projectId);
			if (!project) return;

			const file = findNode(project.root, fileId);
			if (file && file.type === 'file') {
				file.content = content;
			}
		},

		// Update manifest in state
		manifestUpdated(
			state,
			action: PayloadAction<{ projectId: string; manifest: LEditorManifest }>
		) {
			const { projectId, manifest } = action.payload;
			const project = state.projects.find((p) => p.id === projectId);
			if (!project) return;

			project.manifest = manifest;
			project.modified = manifest.modified;
			project.root = buildVirtualTree(manifest, project.rootPath);
		},

		// ========== Personal State ==========

		setActiveFile(state, action: PayloadAction<{ projectId: string; fileId: string | null }>) {
			const { projectId, fileId } = action.payload;
			savePersonalState(projectId, { activeFileId: fileId });
			// Increment version to trigger re-render
			state.personalStateVersion++;
		},

		openFile(state, action: PayloadAction<{ projectId: string; fileId: string }>) {
			const { projectId, fileId } = action.payload;
			const personalState = getPersonalState(projectId);

			const openFileIds = personalState?.openFileIds || [];
			if (!openFileIds.includes(fileId)) {
				openFileIds.push(fileId);
			}

			savePersonalState(projectId, {
				openFileIds,
				activeFileId: fileId,
			});
			// Increment version to trigger re-render
			state.personalStateVersion++;
		},

		closeFile(state, action: PayloadAction<{ projectId: string; fileId: string }>) {
			const { projectId, fileId } = action.payload;
			const personalState = getPersonalState(projectId);
			if (!personalState) return;

			const openFileIds = personalState.openFileIds.filter((id) => id !== fileId);
			const activeFileId =
				personalState.activeFileId === fileId
					? openFileIds[openFileIds.length - 1] || null
					: personalState.activeFileId;

			savePersonalState(projectId, { openFileIds, activeFileId });
			// Increment version to trigger re-render
			state.personalStateVersion++;
		},

		togglePinFile(state, action: PayloadAction<{ projectId: string; fileId: string }>) {
			const { projectId, fileId } = action.payload;
			const personalState = getPersonalState(projectId);

			const currentPinned = personalState?.pinnedFileIds || [];
			const pinnedFileIds = currentPinned.includes(fileId)
				? currentPinned.filter((id) => id !== fileId)
				: [...currentPinned, fileId];

			savePersonalState(projectId, { pinnedFileIds });
			// Increment version to trigger re-render
			state.personalStateVersion++;
		},

		// ========== Global Settings ==========

		toggleHexView(state) {
			state.hexViewEnabled = !state.hexViewEnabled;
		},

		setHexView(state, action: PayloadAction<boolean>) {
			state.hexViewEnabled = action.payload;
		},
	},
});

export const {
	projectOpened,
	projectClosed,
	switchProject,
	fileContentLoaded,
	fileContentUpdated,
	manifestUpdated,
	setActiveFile,
	openFile,
	closeFile,
	togglePinFile,
	toggleHexView,
	setHexView,
} = filesystemWorkspaceSlice.actions;

export default filesystemWorkspaceSlice.reducer;

// ========== Async Thunks (Manual) ==========

/**
 * Open a project from a directory
 */
export async function openProject(dispatch: any): Promise<void> {
	if (!isFileSystemAccessSupported()) {
		alert('File System Access API is not supported. Please use Chrome or Edge.');
		return;
	}

	const dirHandle = await pickDirectory();
	if (!dirHandle) return;

	// Check for existing .leditor file
	let manifest = await readLEditorFile(dirHandle);

	if (!manifest) {
		// No .leditor file - create new project
		const projectName = dirHandle.name;
		manifest = await createLEditorManifest(dirHandle, projectName);
	}

	const projectId = genId('proj');
	await setProjectHandle(projectId, dirHandle, manifest.name, dirHandle.name);

	dispatch(
		projectOpened({
			id: projectId,
			name: manifest.name,
			rootPath: dirHandle.name,
			manifest,
		})
	);
}

/**
 * Load file content from filesystem
 */
export async function loadFileContent(
	dispatch: any,
	projectId: string,
	fileId: string,
	filePath: string
): Promise<void> {
	const handle = getProjectHandle(projectId);
	if (!handle) return;

	try {
		// Check if this is an image file
		const extension = filePath.split('.').pop()?.toLowerCase() || '';
		const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];
		const isImage = imageExtensions.includes(extension);

		let content: string;
		if (isImage) {
			// Load image as data URL
			const pathParts = filePath.split('/');
			let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = handle;

			// Navigate through directories
			for (let i = 0; i < pathParts.length - 1; i++) {
				currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(
					pathParts[i]
				);
			}

			// Get the file
			const fileHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(
				pathParts[pathParts.length - 1]
			);
			const file = await fileHandle.getFile();

			// Convert to data URL
			content = await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
		} else {
			// Load as text
			content = await readFile(handle, filePath);
		}

		dispatch(fileContentLoaded({ projectId, fileId, content }));
	} catch (err) {
		console.error('Failed to load file:', err);
	}
}

/**
 * Save file content to filesystem
 */
// Debounce timers for file saves (one per file)
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function saveFileContent(
	_dispatch: any,
	projectId: string,
	fileId: string,
	filePath: string,
	content: string
): Promise<void> {
	const handle = getProjectHandle(projectId);
	if (!handle) return;

	// Clear existing timer for this file
	const timerKey = `${projectId}:${fileId}`;
	const existingTimer = saveTimers.get(timerKey);
	if (existingTimer) {
		clearTimeout(existingTimer);
	}

	// Debounce save to disk (500ms)
	const timer = setTimeout(async () => {
		try {
			await writeFile(handle, filePath, content);
			// Don't dispatch fileContentUpdated here - it's already been updated in memory by EditorPanel
		} catch (err) {
			console.error('Failed to save file:', err);
			alert('Failed to save file. Please check permissions.');
		} finally {
			saveTimers.delete(timerKey);
		}
	}, 500);

	saveTimers.set(timerKey, timer);
}

/**
 * Create a new file in the filesystem
 */
export async function createFileFS(
	dispatch: any,
	projectId: string,
	parentPath: string,
	fileName: string
): Promise<void> {
	const handle = getProjectHandle(projectId);
	if (!handle) return;

	try {
		const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
		await writeFile(handle, filePath, '');

		// Re-scan and update manifest
		const manifest = await rescanAndUpdateManifest(handle, getManifestForProject(projectId));
		dispatch(manifestUpdated({ projectId, manifest }));
	} catch (err) {
		console.error('Failed to create file:', err);
		alert('Failed to create file. Please check permissions.');
	}
}

/**
 * Create a new folder in the filesystem
 */
export async function createFolderFS(
	dispatch: any,
	projectId: string,
	parentPath: string,
	folderName: string
): Promise<void> {
	const handle = getProjectHandle(projectId);
	if (!handle) return;

	try {
		const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
		await createDirectory(handle, folderPath);

		// Re-scan and update manifest
		const manifest = await rescanAndUpdateManifest(handle, getManifestForProject(projectId));
		dispatch(manifestUpdated({ projectId, manifest }));
	} catch (err) {
		console.error('Failed to create folder:', err);
		alert('Failed to create folder. Please check permissions.');
	}
}

/**
 * Rename a file or folder in the filesystem
 */
export async function renameNodeFS(
	dispatch: any,
	projectId: string,
	oldPath: string,
	newPath: string,
	isFolder: boolean
): Promise<void> {
	const handle = getProjectHandle(projectId);
	if (!handle) return;

	try {
		// Read content if file
		let content = '';
		if (!isFolder) {
			content = await readFile(handle, oldPath);
		}

		// Create new location
		if (isFolder) {
			// For folders, we need to recursively copy and delete
			// This is complex, so for now we'll just rescan
			alert('Folder rename not yet implemented. Please rename manually in your file system.');
			return;
		} else {
			await writeFile(handle, newPath, content);
			await deleteFile(handle, oldPath);
		}

		// Re-scan and update manifest
		const manifest = await rescanAndUpdateManifest(handle, getManifestForProject(projectId));
		dispatch(manifestUpdated({ projectId, manifest }));
	} catch (err) {
		console.error('Failed to rename:', err);
		alert('Failed to rename. Please check permissions.');
	}
}

/**
 * Delete a file or folder from the filesystem
 */
export async function deleteNodeFS(
	dispatch: any,
	projectId: string,
	path: string,
	isFolder: boolean
): Promise<void> {
	const handle = getProjectHandle(projectId);
	if (!handle) return;

	try {
		if (isFolder) {
			await deleteDirectory(handle, path);
		} else {
			await deleteFile(handle, path);
		}

		// Re-scan and update manifest
		const manifest = await rescanAndUpdateManifest(handle, getManifestForProject(projectId));
		dispatch(manifestUpdated({ projectId, manifest }));
	} catch (err) {
		console.error('Failed to delete:', err);
		alert('Failed to delete. Please check permissions.');
	}
}

// Helper to get manifest from project
function getManifestForProject(projectId: string): LEditorManifest {
	// This is a bit of a hack - we need access to the state
	// For now, we'll create a minimal manifest and let rescan fill it
	return {
		name: projectId,
		version: '1.0',
		created: new Date().toISOString(),
		modified: new Date().toISOString(),
		files: [],
		folders: [],
		settings: {
			storageMode: 'filesystem',
			rootDirectory: './',
		},
	};
}

/**
 * Restore workspace from persisted state on app start
 * Reloads directory handles from IndexedDB and manifests from disk
 */
export async function restoreWorkspace(dispatch: any): Promise<void> {
	const workspaceState = loadWorkspaceState();
	if (!workspaceState || workspaceState.projects.length === 0) {
		return;
	}

	// Load all handles from IndexedDB
	const storedHandles = await loadAllProjectHandles();
	const handleMap = new Map(storedHandles.map((p) => [p.projectId, p]));

	// Track projects that should be removed (deleted from OS or access lost)
	const projectsToRemove: string[] = [];

	// Restore each project
	for (const projectInfo of workspaceState.projects) {
		const stored = handleMap.get(projectInfo.id);
		if (!stored) {
			projectsToRemove.push(projectInfo.id);
			continue;
		}

		// Verify we still have access to the handle
		const hasAccess = await verifyHandleAccess(stored.handle);
		if (!hasAccess) {
			console.warn(`Lost access to project: ${projectInfo.name}`);
			projectsToRemove.push(projectInfo.id);
			continue;
		}

		// Store handle in memory
		projectHandles.set(projectInfo.id, stored.handle);

		// Read .leditor file to get latest manifest
		try {
			// Try to find any .leditor file
			let manifest: LEditorManifest | null = null;
			for await (const [name] of stored.handle.entries()) {
				if (name.endsWith('.leditor')) {
					const fileHandle = await stored.handle.getFileHandle(name);
					const file = await fileHandle.getFile();
					const text = await file.text();
					manifest = JSON.parse(text);
					break;
				}
			}

			if (manifest) {
				// Rescan the directory to get the current filesystem state
				const updatedManifest = await rescanAndUpdateManifest(stored.handle, manifest);

				dispatch(
					projectOpened({
						id: projectInfo.id,
						name: updatedManifest.name,
						rootPath: projectInfo.rootPath,
						manifest: updatedManifest,
					})
				);
			}
		} catch (err) {
			console.error(`Failed to restore project ${projectInfo.name}:`, err);
			projectsToRemove.push(projectInfo.id);
		}
	}

	// Clean up projects that no longer exist
	if (projectsToRemove.length > 0) {
		console.log(`Cleaning up ${projectsToRemove.length} inaccessible project(s)`);

		// Remove from localStorage
		const updatedProjects = workspaceState.projects.filter(
			(p) => !projectsToRemove.includes(p.id)
		);
		saveWorkspaceState({ ...workspaceState, projects: updatedProjects });

		// Remove from IndexedDB
		for (const projectId of projectsToRemove) {
			try {
				await deleteProjectHandle(projectId);
				deletePersonalState(projectId);
			} catch (err) {
				console.error(`Failed to delete project ${projectId}:`, err);
			}
		}
	}
}

// Export helpers
export { getPersonalState, savePersonalState };
