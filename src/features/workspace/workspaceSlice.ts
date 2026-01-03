import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Project, Workspace, StorageMode, SearchMode } from '../../types/workspace';
import type { FolderNode, FSNode } from '../../types/fs';
import { loadWorkspaceWithMigration } from './workspacePersistence';

// ---------- Helper Functions ----------

function genId(prefix: 'proj' | 'f' | 'd' = 'proj'): string {
	const uid =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? (crypto as Crypto).randomUUID()
			: `${Date.now().toString(36)}-${Math.random()
					.toString(36)
					.slice(2, 10)}`;
	return `${prefix}_${uid}`;
}

function createDefaultProject(name: string = 'New Project'): Project {
	const now = new Date().toISOString();
	return {
		id: genId('proj'),
		name,
		created: now,
		modified: now,
		storageMode: 'localstorage',
		root: {
			id: genId('d'),
			type: 'folder',
			name: 'root',
			children: [
				{
					id: genId('f'),
					type: 'file',
					name: 'README',
					extension: 'md',
					content: `# ${name}\n\nWelcome to your new project!\n`,
				},
			],
		},
		activeFileId: null,
		openFileIds: [],
		pinnedFileIds: [],
		searchQuery: '',
		searchMode: 'all',
		matchCase: false,
		extFilters: [],
	};
}

function getActiveProject(state: Workspace): Project | null {
	if (!state.activeProjectId) return null;
	return state.projects.find(p => p.id === state.activeProjectId) ?? null;
}

// ---------- File System Helper Functions ----------

type AnyNode = any;

function normalizeName(name: string) {
	return (name ?? '').trim();
}

/**
 * Parse user input like:
 * - "notes.md"   -> { name: "notes", extension: "md" }
 * - "notes"      -> { name: "notes", extension: "" }
 * - ".env"       -> { name: ".env", extension: "" }  (special-case)
 * - "archive.tar.gz" -> { name: "archive.tar", extension: "gz" } (last-dot split)
 */
function parseFileName(input: string) {
	const clean = normalizeName(input);
	if (!clean) return null;

	// ".env" or ".gitignore" style: treat as name-only
	if (clean.startsWith('.') && clean.indexOf('.', 1) === -1) {
		return { name: clean, extension: '' };
	}

	const lastDot = clean.lastIndexOf('.');
	if (lastDot > 0 && lastDot < clean.length - 1) {
		const name = clean.slice(0, lastDot);
		const extension = clean.slice(lastDot + 1);
		return { name, extension };
	}

	return { name: clean, extension: '' };
}

function findNode(root: AnyNode, id: string): AnyNode | null {
	if (!root) return null;
	if (root.id === id) return root;

	if (root.type === 'folder' && Array.isArray(root.children)) {
		for (const child of root.children) {
			const hit = findNode(child, id);
			if (hit) return hit;
		}
	}
	return null;
}

function findParentFolder(root: AnyNode, childId: string): AnyNode | null {
	if (!root || root.type !== 'folder' || !Array.isArray(root.children))
		return null;

	for (const child of root.children) {
		if (child?.id === childId) return root;
		const hit = findParentFolder(child, childId);
		if (hit) return hit;
	}
	return null;
}

function nameExistsInFolder(
	folder: AnyNode,
	nodeType: 'file' | 'folder',
	wanted: { name: string; extension?: string },
	exceptId?: string
) {
	if (!folder || folder.type !== 'folder' || !Array.isArray(folder.children))
		return false;

	if (nodeType === 'folder') {
		return folder.children.some(
			(c: AnyNode) =>
				c?.type === 'folder' &&
				c?.name === wanted.name &&
				c?.id !== exceptId
		);
	}

	const ext = wanted.extension ?? '';
	return folder.children.some((c: AnyNode) => {
		if (c?.type !== 'file') return false;
		return (
			c?.name === wanted.name &&
			(c?.extension ?? '') === ext &&
			c?.id !== exceptId
		);
	});
}

function firstFileId(root: AnyNode): string | null {
	if (!root) return null;
	if (root.type === 'file') return root.id ?? null;

	if (root.type === 'folder' && Array.isArray(root.children)) {
		for (const child of root.children) {
			const id = firstFileId(child);
			if (id) return id;
		}
	}
	return null;
}

function deleteNodeById(root: AnyNode, id: string): boolean {
	const parent = findParentFolder(root, id);
	if (!parent) return false;

	const idx = parent.children.findIndex((c: AnyNode) => c?.id === id);
	if (idx === -1) return false;

	parent.children.splice(idx, 1);
	return true;
}

function isFileIdStillValid(root: AnyNode, id: string): boolean {
	const n = findNode(root, id);
	return !!n && n.type === 'file';
}

function ensureOpen(project: Project, fileId: string) {
	if (!project.openFileIds.includes(fileId)) {
		project.openFileIds.push(fileId);
	}
}

function cleanupTabs(project: Project) {
	// Remove ids that are no longer real files
	project.openFileIds = project.openFileIds.filter((id) =>
		isFileIdStillValid(project.root, id)
	);

	// Active must be in open tabs if it exists
	if (
		project.activeFileId &&
		isFileIdStillValid(project.root, project.activeFileId)
	) {
		ensureOpen(project, project.activeFileId);
	} else {
		// If active is invalid, pick a sane replacement
		project.activeFileId =
			project.openFileIds[0] ?? firstFileId(project.root) ?? null;
		if (project.activeFileId) ensureOpen(project, project.activeFileId);
	}
}

// ---------- Initial State ----------

// Try to load from localStorage with automatic migration
const loadedWorkspace = loadWorkspaceWithMigration();

const initialState: Workspace = loadedWorkspace || {
	projects: [createDefaultProject('My Project')],
	activeProjectId: null,
	hexViewEnabled: false,
};

// Ensure there's always an active project
if (!initialState.activeProjectId && initialState.projects.length > 0) {
	initialState.activeProjectId = initialState.projects[0].id;
}

// ---------- Slice ----------

const workspaceSlice = createSlice({
	name: 'workspace',
	initialState,
	reducers: {
		// ========== Project Management ==========

		createProject(
			state,
			action: PayloadAction<{ name: string; fromTemplate?: FolderNode }>
		) {
			const { name, fromTemplate } = action.payload;
			const project = createDefaultProject(name);

			if (fromTemplate) {
				project.root = fromTemplate;
			}

			state.projects.push(project);
			state.activeProjectId = project.id;
		},

		deleteProject(state, action: PayloadAction<{ projectId: string }>) {
			const { projectId } = action.payload;
			const index = state.projects.findIndex(p => p.id === projectId);
			if (index === -1) return;

			state.projects.splice(index, 1);

			// If deleted project was active, switch to another
			if (state.activeProjectId === projectId) {
				state.activeProjectId =
					state.projects[0]?.id ?? null;
			}
		},

		renameProject(
			state,
			action: PayloadAction<{ projectId: string; newName: string }>
		) {
			const { projectId, newName } = action.payload;
			const project = state.projects.find(p => p.id === projectId);
			if (!project) return;

			project.name = newName.trim() || project.name;
			project.modified = new Date().toISOString();
		},

		switchProject(state, action: PayloadAction<{ projectId: string }>) {
			const { projectId } = action.payload;
			if (state.projects.find(p => p.id === projectId)) {
				state.activeProjectId = projectId;
			}
		},

		importProject(state, action: PayloadAction<{ project: Project }>) {
			const { project } = action.payload;

			// Check for duplicate names
			let finalName = project.name;
			let counter = 1;
			while (state.projects.some(p => p.name === finalName)) {
				finalName = `${project.name} (${counter})`;
				counter++;
			}

			const importedProject: Project = {
				...project,
				id: genId('proj'),
				name: finalName,
				modified: new Date().toISOString(),
			};

			state.projects.push(importedProject);
			state.activeProjectId = importedProject.id;
		},

		// Import project from .leditor file format
		importProjectFromLeditor(state, action: PayloadAction<{ data: any }>) {
			const { data } = action.payload;

			// Validate basic structure
			if (!data || typeof data !== 'object' || !data.name || !data.root) {
				console.error('Invalid .leditor file format');
				return;
			}

			const project = createDefaultProject(data.name);
			project.root = data.root;
			project.activeFileId = data.activeFileId ?? null;
			project.openFileIds = data.openFileIds ?? [];
			project.pinnedFileIds = data.pinnedFileIds ?? [];
			project.searchQuery = data.searchQuery ?? '';
			project.searchMode = data.searchMode ?? 'all';
			project.matchCase = data.matchCase ?? false;
			project.extFilters = data.extFilters ?? [];

			// Check for duplicate names
			let finalName = project.name;
			let counter = 1;
			while (state.projects.some(p => p.name === finalName)) {
				finalName = `${data.name} (${counter})`;
				counter++;
			}
			project.name = finalName;

			state.projects.push(project);
			state.activeProjectId = project.id;
		},

		// ========== Active Project State ==========

		setActiveFile(state, action: PayloadAction<string | null>) {
			const project = getActiveProject(state);
			if (!project) return;

			const id = action.payload;
			if (!id) {
				project.activeFileId = null;
				return;
			}

			// Only allow activating real files
			const n = findNode(project.root, id);
			if (!n || n.type !== 'file') return;

			project.activeFileId = id;
			ensureOpen(project, id);

			project.modified = new Date().toISOString();
		},

		// Explicit open (idempotent)
		openFile(
			state,
			action: PayloadAction<{ id: string; setActive?: boolean }>
		) {
			const project = getActiveProject(state);
			if (!project) return;

			const { id, setActive = true } = action.payload;
			const n = findNode(project.root, id);
			if (!n || n.type !== 'file') return;

			ensureOpen(project, id);
			if (setActive) project.activeFileId = id;

			project.modified = new Date().toISOString();
		},

		// Close a tab. If closing the active tab, activates neighbor.
		// Pinned tabs cannot be closed.
		closeFile(state, action: PayloadAction<{ id: string }>) {
			const project = getActiveProject(state);
			if (!project) return;

			const { id } = action.payload;

			// Prevent closing pinned tabs
			if (project.pinnedFileIds.includes(id)) return;

			const idx = project.openFileIds.indexOf(id);
			if (idx === -1) return;

			const wasActive = project.activeFileId === id;

			project.openFileIds.splice(idx, 1);

			if (wasActive) {
				// Prefer left neighbor, else same index (which becomes right neighbor)
				const nextId =
					project.openFileIds[idx - 1] ??
					project.openFileIds[idx] ??
					null;

				project.activeFileId = nextId;
			}

			// If tabs are empty but there are files, choose first file
			if (!project.activeFileId) {
				const fallback = firstFileId(project.root);
				project.activeFileId = fallback;
				if (fallback) ensureOpen(project, fallback);
			}

			project.modified = new Date().toISOString();
		},

		// Toggle pin status for a file tab
		togglePinFile(state, action: PayloadAction<{ id: string }>) {
			const project = getActiveProject(state);
			if (!project) return;

			const { id } = action.payload;

			// Only allow pinning files that are actually open
			if (!project.openFileIds.includes(id)) return;

			const pinIdx = project.pinnedFileIds.indexOf(id);
			if (pinIdx === -1) {
				// Pin it
				project.pinnedFileIds.push(id);
			} else {
				// Unpin it
				project.pinnedFileIds.splice(pinIdx, 1);
			}

			project.modified = new Date().toISOString();
		},

		updateFileContent(
			state,
			action: PayloadAction<{ id: string; content: string }>
		) {
			const project = getActiveProject(state);
			if (!project) return;

			const { id, content } = action.payload;

			const updateNode = (node: any): boolean => {
				if (node.type === 'file' && node.id === id) {
					node.content = content;
					return true;
				}
				if (node.type === 'folder') {
					return node.children.some(updateNode);
				}
				return false;
			};

			updateNode(project.root);
			project.modified = new Date().toISOString();
		},

		// ========== Global Settings ==========

		toggleHexView(state) {
			state.hexViewEnabled = !state.hexViewEnabled;
		},

		setHexView(state, action: PayloadAction<boolean>) {
			state.hexViewEnabled = action.payload;
		},

		// ========== Search ==========

		setSearchQuery(state, action: PayloadAction<string>) {
			const project = getActiveProject(state);
			if (!project) return;
			project.searchQuery = action.payload ?? '';
		},

		setSearchMode(state, action: PayloadAction<SearchMode>) {
			const project = getActiveProject(state);
			if (!project) return;
			project.searchMode = action.payload;
		},

		setMatchCase(state, action: PayloadAction<boolean>) {
			const project = getActiveProject(state);
			if (!project) return;
			project.matchCase = !!action.payload;
		},

		setExtFilters(state, action: PayloadAction<string[]>) {
			const project = getActiveProject(state);
			if (!project) return;
			project.extFilters = Array.isArray(action.payload)
				? action.payload.filter(x => typeof x === 'string')
				: [];
		},

		clearSearch(state) {
			const project = getActiveProject(state);
			if (!project) return;
			project.searchQuery = '';
			project.searchMode = 'all';
			project.matchCase = false;
			project.extFilters = [];
		},

		// ========== File & Folder CRUD ==========

		createFolder(
			state,
			action: PayloadAction<{ parentFolderId: string; name: string }>
		) {
			const project = getActiveProject(state);
			if (!project) return;

			const { parentFolderId, name } = action.payload;
			const clean = normalizeName(name);
			if (!clean) return;

			const parent = findNode(project.root, parentFolderId);
			if (!parent || parent.type !== 'folder') return;

			if (nameExistsInFolder(parent, 'folder', { name: clean })) return;

			parent.children.push({
				id: genId('d'),
				type: 'folder',
				name: clean,
				children: [],
			} as FolderNode);

			project.modified = new Date().toISOString();
		},

		/**
		 * Create a file by "filename" (can be "a.md" or "a") or by { name, extension }.
		 * Prefer filename in UI; the reducer parses it safely.
		 */
		createFile(
			state,
			action: PayloadAction<{
				parentFolderId: string;
				filename: string; // e.g. "readme.md" or "notes"
				content?: string;
				setActive?: boolean;
			}>
		) {
			const project = getActiveProject(state);
			if (!project) return;

			const {
				parentFolderId,
				filename,
				content = '',
				setActive = true,
			} = action.payload;

			const parsed = parseFileName(filename);
			if (!parsed) return;

			const parent = findNode(project.root, parentFolderId);
			if (!parent || parent.type !== 'folder') return;

			if (nameExistsInFolder(parent, 'file', parsed)) return;

			const id = genId('f');
			parent.children.push({
				id,
				type: 'file',
				name: parsed.name,
				extension: parsed.extension,
				content,
			} as FSNode);

			if (setActive) {
				project.activeFileId = id;
				ensureOpen(project, id);
			}

			project.modified = new Date().toISOString();
		},

		/**
		 * Rename folder: newName is folder name
		 * Rename file: newName may be "a" or "a.md" (updates extension if provided)
		 */
		renameNode(
			state,
			action: PayloadAction<{ id: string; newName: string }>
		) {
			const project = getActiveProject(state);
			if (!project) return;

			const { id, newName } = action.payload;

			const node = findNode(project.root, id);
			if (!node) return;

			// safety: don't rename root
			if (node === project.root) return;

			const parent = findParentFolder(project.root, id);
			if (!parent) return;

			if (node.type === 'folder') {
				const clean = normalizeName(newName);
				if (!clean) return;
				if (nameExistsInFolder(parent, 'folder', { name: clean }, id))
					return;
				node.name = clean;
				project.modified = new Date().toISOString();
				return;
			}

			// file
			const parsed = parseFileName(newName);
			if (!parsed) return;

			if (nameExistsInFolder(parent, 'file', parsed, id)) return;

			node.name = parsed.name;
			node.extension = parsed.extension;

			project.modified = new Date().toISOString();
			// Tabs remain valid because id doesn't change.
		},

		deleteNode(state, action: PayloadAction<{ id: string }>) {
			const project = getActiveProject(state);
			if (!project) return;

			const { id } = action.payload;
			if (!id) return;

			// safety: do not delete root
			if ((project.root as any)?.id === id) return;

			const deleted = deleteNodeById(project.root, id);
			if (!deleted) return;

			// Remove from tabs if it was open
			const tabIdx = project.openFileIds.indexOf(id);
			if (tabIdx !== -1) project.openFileIds.splice(tabIdx, 1);

			// ensure activeFileId points to an existing file
			if (project.activeFileId === id) {
				project.activeFileId = null;
			}

			cleanupTabs(project);
			project.modified = new Date().toISOString();
		},

		// Import a folder into the root
		importFolder(state, action: PayloadAction<{ folder: FolderNode }>) {
			const project = getActiveProject(state);
			if (!project) return;

			const { folder } = action.payload;
			if (!folder || folder.type !== 'folder') return;

			// Check if a folder with the same name already exists
			const existingNames = project.root.children
				.filter((c: AnyNode) => c?.type === 'folder')
				.map((c: AnyNode) => c.name);

			let finalName = folder.name;

			// If name exists, append (1), (2), etc.
			if (existingNames.includes(finalName)) {
				let counter = 1;
				while (existingNames.includes(`${folder.name} (${counter})`)) {
					counter++;
				}
				finalName = `${folder.name} (${counter})`;
			}

			// Add the imported folder with the potentially renamed name
			project.root.children.push({
				...folder,
				name: finalName,
			});

			project.modified = new Date().toISOString();
		},

		// Import multiple files and folders into the root
		importNodes(
			state,
			action: PayloadAction<{ nodes: (FSNode | FolderNode)[] }>
		) {
			const project = getActiveProject(state);
			if (!project) return;

			const { nodes } = action.payload;
			if (!Array.isArray(nodes)) return;

			for (const node of nodes) {
				if (!node || !node.type) continue;

				if (node.type === 'folder') {
					// Reuse importFolder logic
					const existingNames = project.root.children
						.filter((c: AnyNode) => c?.type === 'folder')
						.map((c: AnyNode) => c.name);

					let finalName = node.name;

					if (existingNames.includes(finalName)) {
						let counter = 1;
						while (existingNames.includes(`${node.name} (${counter})`)) {
							counter++;
						}
						finalName = `${node.name} (${counter})`;
					}

					project.root.children.push({
						...node,
						name: finalName,
					});
				} else if (node.type === 'file') {
					// Check for duplicate file names
					const parsed = { name: node.name, extension: node.extension };

					let finalName = node.name;
					let finalExt = node.extension;

					if (nameExistsInFolder(project.root, 'file', parsed)) {
						let counter = 1;
						while (
							nameExistsInFolder(project.root, 'file', {
								name: `${node.name} (${counter})`,
								extension: node.extension,
							})
						) {
							counter++;
						}
						finalName = `${node.name} (${counter})`;
					}

					project.root.children.push({
						...node,
						name: finalName,
						extension: finalExt,
					});
				}
			}

			project.modified = new Date().toISOString();
		},

		// ========== Workspace Load ==========

		loadWorkspace(_state, action: PayloadAction<Workspace>) {
			return action.payload;
		},
	},
});

export const {
	// Project management
	createProject,
	deleteProject,
	renameProject,
	switchProject,
	importProject,
	importProjectFromLeditor,

	// File & tab management
	setActiveFile,
	openFile,
	closeFile,
	togglePinFile,
	updateFileContent,

	// File & folder CRUD
	createFile,
	createFolder,
	renameNode,
	deleteNode,
	importFolder,
	importNodes,

	// Global settings
	toggleHexView,
	setHexView,

	// Search
	setSearchQuery,
	setSearchMode,
	setMatchCase,
	setExtFilters,
	clearSearch,

	// Workspace
	loadWorkspace,
} = workspaceSlice.actions;

// Re-export types for convenience
export type { SearchMode, StorageMode };

export default workspaceSlice.reducer;
