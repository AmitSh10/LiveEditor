import { useMemo, useState } from 'react';
import type { FSNode } from '../../types/fs';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { projectOpened, setProjectHandle, openFile, manifestUpdated } from '../workspace/filesystemWorkspaceSlice';
import { selectRoot as selectFSRoot, selectActiveFileId as selectActiveFileIdFS, selectActiveProjectId, selectActiveProject } from '../workspace/filesystemWorkspaceSelectors';
import { FileTreeNode } from './FileTreeNode';
import { useExpandedFolders } from './useExpandedFolders';
import { useContextMenu } from './useContextMenu';
import { useFilesystemInlineRename } from './useFilesystemInlineRename';
import { pickDirectory, createLEditorManifest, rescanAndUpdateManifest } from '../../utils/filesystemAPI';

// Check if we're in filesystem mode (should match App.tsx and Sidebar.tsx)
// const USE_FILESYSTEM_MODE = true; // Currently always true, so not used

/**
 * Generate a stable project ID based on the directory handle
 * This ensures the same folder always gets the same project ID
 */
async function getStableProjectId(dirHandle: FileSystemDirectoryHandle): Promise<string> {
	const dirName = dirHandle.name;

	// Create a simple hash from the directory name
	let hash = 0;
	for (let i = 0; i < dirName.length; i++) {
		const char = dirName.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	// Use the hash to create a stable ID
	const stableId = `proj_${dirName}_${Math.abs(hash).toString(36)}`;
	return stableId;
}

function findNode(root: FSNode, id: string): FSNode | null {
	if (root.id === id) return root;
	if (root.type === 'folder') {
		for (const c of root.children) {
			const hit = findNode(c, id);
			if (hit) return hit;
		}
	}
	return null;
}

// Helper to build file/folder path
function buildNodePath(root: FSNode, targetId: string): string | null {
	function search(node: FSNode, path: string[], isRoot: boolean): string | null {
		if (node.id === targetId) {
			if (node.type === 'file') {
				const fileName = node.extension ? `${node.name}.${node.extension}` : node.name;
				return [...path, fileName].join('/');
			}
			return [...path, node.name].join('/');
		}
		if (node.type === 'folder') {
			for (const child of node.children) {
				// Skip adding root folder name to path
				const newPath = isRoot ? path : [...path, node.name];
				const result = search(child, newPath, false);
				if (result) return result;
			}
		}
		return null;
	}
	return search(root, [], true);
}

export function FileTree() {
	const dispatch = useAppDispatch();
	const projectId = useAppSelector(selectActiveProjectId);
	const root = useAppSelector(selectFSRoot);
	const activeId = useAppSelector(selectActiveFileIdFS);
	const activeProject = useAppSelector(selectActiveProject);

	// State for project name dialog
	const [showNameDialog, setShowNameDialog] = useState(false);
	const [projectName, setProjectName] = useState('');
	const [pendingDirHandle, setPendingDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

	// Expanded folders (persisted)
	const { expanded, toggleExpanded, ensureExpanded } = useExpandedFolders();

	// Context menu
	const { menu, setMenu, menuRef, openMenuAt, closeMenu } = useContextMenu();

	// Inline rename/create/delete rules - pass null root temporarily if not available
	const rootId = root?.id ?? '';
	const {
		editing,
		setEditing,
		beginRename,
		beginNewFile,
		beginNewFolder,
		confirmDelete,
		onKeyForInline,
		onBlurSmart,
	} = useFilesystemInlineRename({
		root: root!,
		rootId,
		projectId: projectId || '',
		dispatch,
		ensureExpanded: (folderId: string) => ensureExpanded(folderId, rootId),
		afterCommit: () => closeMenu(),
	});

	const setEditingValue = (value: string) => {
		setEditing((prev) => (prev ? { ...prev, value, error: null } : prev));
	};

	// Handle drag and drop files into a folder
	const handleDropFiles = async (folderId: string, files: FileList) => {
		if (!projectId || !root || !activeProject) return;

		try {
			// Get project handle
			const { getProjectHandle } = await import('../workspace/filesystemWorkspaceSlice');
			const { rescanAndUpdateManifest, writeLEditorFile } = await import('../../utils/filesystemAPI');
			const projectHandle = getProjectHandle(projectId);
			if (!projectHandle) return;

			// Get the target folder path
			function getNodePath(node: FSNode, targetId: string, rootNodeId: string, currentPath: string[] = []): string[] | null {
				if (node.id === targetId) {
					// If this is the root, return empty path
					if (node.id === rootNodeId) return [];
					// Otherwise, include this folder's name in the path
					return [...currentPath, node.name];
				}
				if (node.type === 'folder') {
					for (const child of node.children) {
						const newPath = node.id === rootNodeId ? currentPath : [...currentPath, node.name];
						const result = getNodePath(child, targetId, rootNodeId, newPath);
						if (result) return result;
					}
				}
				return null;
			}

			const folderPath = getNodePath(root, folderId, root.id) || [];

			// Navigate to target folder
			let targetDirHandle = projectHandle;
			for (const part of folderPath) {
				targetDirHandle = await targetDirHandle.getDirectoryHandle(part);
			}

			// Copy each dropped file
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const newFileHandle = await targetDirHandle.getFileHandle(file.name, { create: true });
				const writable = await newFileHandle.createWritable();
				await writable.write(file);
				await writable.close();
			}

			// Rescan and update manifest
			const updatedManifest = await rescanAndUpdateManifest(projectHandle, activeProject.manifest);
			await writeLEditorFile(projectHandle, updatedManifest, activeProject.name);
			dispatch(manifestUpdated({ projectId, manifest: updatedManifest }));

			console.log(`Imported ${files.length} file(s) via drag and drop`);
		} catch (err) {
			console.error('Failed to import files:', err);
			const errorMsg = (err as Error).message || 'Unknown error';
			alert(`Failed to import files: ${errorMsg}\n\nPlease check permissions.`);
		}
	};

	// Handle importing files into a folder
	const handleImportFiles = async (folderId: string) => {
		if (!projectId || !root || !activeProject) return;

		try {
			// Show file picker
			const fileHandles = await (window as any).showOpenFilePicker({
				multiple: true,
			});

			if (!fileHandles || fileHandles.length === 0) return;

			// Get the target folder path
			function getNodePath(node: FSNode, targetId: string, rootNodeId: string, currentPath: string[] = []): string[] | null {
				if (node.id === targetId) {
					// If this is the root, return empty path
					if (node.id === rootNodeId) return [];
					// Otherwise, include this folder's name in the path
					return [...currentPath, node.name];
				}
				if (node.type === 'folder') {
					for (const child of node.children) {
						const newPath = node.id === rootNodeId ? currentPath : [...currentPath, node.name];
						const result = getNodePath(child, targetId, rootNodeId, newPath);
						if (result) return result;
					}
				}
				return null;
			}

			const folderPath = getNodePath(root, folderId, root.id) || [];
			const folderPathStr = folderPath.join('/');

			// Get project handle
			const { getProjectHandle } = await import('../workspace/filesystemWorkspaceSlice');
			const { rescanAndUpdateManifest, writeLEditorFile } = await import('../../utils/filesystemAPI');
			const projectHandle = getProjectHandle(projectId);
			if (!projectHandle) return;

			// Navigate to target folder
			let targetDirHandle = projectHandle;
			for (const part of folderPath) {
				targetDirHandle = await targetDirHandle.getDirectoryHandle(part);
			}

			// Copy each selected file
			for (const fileHandle of fileHandles) {
				const file = await fileHandle.getFile();
				const newFileHandle = await targetDirHandle.getFileHandle(file.name, { create: true });
				const writable = await newFileHandle.createWritable();
				await writable.write(file);
				await writable.close();
			}

			// Rescan and update manifest
			const updatedManifest = await rescanAndUpdateManifest(projectHandle, activeProject.manifest);
			await writeLEditorFile(projectHandle, updatedManifest, activeProject.name);
			dispatch(manifestUpdated({ projectId, manifest: updatedManifest }));

			console.log(`Imported ${fileHandles.length} file(s) to ${folderPathStr || 'root'}`);
		} catch (err) {
			console.error('Failed to import files:', err);
			if ((err as Error).name !== 'AbortError') {
				const errorMsg = (err as Error).message || 'Unknown error';
				alert(`Failed to import files: ${errorMsg}\n\nPlease check permissions.`);
			}
		}
	};

	// Handle opening a new project
	const handleOpenProject = async () => {
		const dirHandle = await pickDirectory();
		if (!dirHandle) return;

		// Check for existing .leditor file (any name)
		let existingManifest = null;
		let leditorFileName = null;
		try {
			// Try to find a .leditor file
			for await (const [name] of dirHandle.entries()) {
				if (name.endsWith('.leditor')) {
					const fileHandle = await dirHandle.getFileHandle(name);
					const file = await fileHandle.getFile();
					const text = await file.text();
					existingManifest = JSON.parse(text);
					leditorFileName = name.replace('.leditor', ''); // Extract name without extension
					break;
				}
			}
		} catch (err) {
			console.error('Error checking for .leditor file:', err);
		}

		if (existingManifest && leditorFileName) {
			// Existing project - rescan and open it
			const projectId = await getStableProjectId(dirHandle);
			await setProjectHandle(projectId, dirHandle, leditorFileName, dirHandle.name);

			// Rescan the directory to get the current filesystem state
			const updatedManifest = await rescanAndUpdateManifest(dirHandle, existingManifest);

			// Fix the manifest name if it doesn't match the .leditor filename
			if (updatedManifest.name !== leditorFileName) {
				updatedManifest.name = leditorFileName;
				// Save the corrected manifest back to disk
				const { writeLEditorFile } = await import('../../utils/filesystemAPI');
				await writeLEditorFile(dirHandle, updatedManifest, leditorFileName);
			}

			dispatch(
				projectOpened({
					id: projectId,
					name: leditorFileName, // Use .leditor filename as display name
					rootPath: dirHandle.name,
					manifest: updatedManifest,
				})
			);
		} else {
			// New project - ask for name
			setPendingDirHandle(dirHandle);
			setProjectName(dirHandle.name); // Suggest folder name as default
			setShowNameDialog(true);
		}
	};

	const handleConfirmName = async () => {
		if (!pendingDirHandle || !projectName.trim()) return;

		const finalName = projectName.trim();
		const manifest = await createLEditorManifest(pendingDirHandle, finalName, finalName);

		const projectId = await getStableProjectId(pendingDirHandle);
		await setProjectHandle(projectId, pendingDirHandle, manifest.name, pendingDirHandle.name);

		dispatch(
			projectOpened({
				id: projectId,
				name: manifest.name,
				rootPath: pendingDirHandle.name,
				manifest,
			})
		);

		// Reset
		setPendingDirHandle(null);
		setProjectName('');
		setShowNameDialog(false);
	};

	const menuNode = useMemo(() => {
		if (!menu || !root) return null;
		return findNode(root, menu.nodeId);
	}, [menu, root]);

	// Early return AFTER all hooks
	if (!root) {
		return (
			<>
				<div className="p-4 text-center">
					<div className="text-slate-400 dark:text-slate-500 mb-2">📂</div>
					<div className="text-sm text-slate-600 dark:text-slate-400 mb-3">No Project Selected</div>
					<button
						onClick={handleOpenProject}
						className="w-full px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
					>
						Open Folder as Project
					</button>
					<div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
						Select a folder to create or open a project
					</div>
				</div>

				{/* Project Name Dialog */}
				{showNameDialog && (
					<div
						className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
						onClick={() => {
							setShowNameDialog(false);
							setPendingDirHandle(null);
							setProjectName('');
						}}
					>
						<div
							className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-4 min-w-[400px]"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-lg font-semibold mb-4">Name Your Project</h3>
							<p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
								This name will be used for the .leditor file (e.g., "{projectName || 'project'}.leditor")
							</p>
							<input
								type="text"
								value={projectName}
								onChange={(e) => setProjectName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') handleConfirmName();
									if (e.key === 'Escape') {
										setShowNameDialog(false);
										setPendingDirHandle(null);
										setProjectName('');
									}
								}}
								placeholder="Project name"
								className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
								autoFocus
							/>
							<div className="flex gap-2">
								<button
									onClick={handleConfirmName}
									disabled={!projectName.trim()}
									className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Create Project
								</button>
								<button
									onClick={() => {
										setShowNameDialog(false);
										setPendingDirHandle(null);
										setProjectName('');
									}}
									className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				)}
			</>
		);
	}

	const menuIsRoot = menuNode?.id === rootId;

	const handleCopyPath = (nodeId: string, relative: boolean) => {
		const targetPath = buildNodePath(root, nodeId);
		if (!targetPath) return;

		if (relative && activeId) {
			// Calculate relative path from active file to target file/folder
			const sourcePath = buildNodePath(root, activeId);
			if (sourcePath) {
				const sourceDir = sourcePath.split('/').slice(0, -1); // Remove filename
				const targetParts = targetPath.split('/');

				// Find common path
				let commonLength = 0;
				while (
					commonLength < sourceDir.length &&
					commonLength < targetParts.length - 1 &&
					sourceDir[commonLength] === targetParts[commonLength]
				) {
					commonLength++;
				}

				// Build relative path
				const upLevels = sourceDir.length - commonLength;
				const downPath = targetParts.slice(commonLength);

				const relativePath = upLevels > 0
					? '../'.repeat(upLevels) + downPath.join('/')
					: './' + downPath.join('/');

				navigator.clipboard.writeText(relativePath);
			} else {
				// Fallback to absolute if can't determine source
				navigator.clipboard.writeText('/' + targetPath);
			}
		} else {
			// Absolute path from root
			navigator.clipboard.writeText('/' + targetPath);
		}
		setMenu(null);
	};

	return (
		<>
			<div className="font-semibold mb-2">Explorer</div>

			<FileTreeNode
				node={root}
				rootId={rootId}
				activeId={activeId}
				expanded={expanded}
				toggleExpanded={toggleExpanded}
				editing={editing}
				setEditingValue={setEditingValue}
				onKeyForInline={onKeyForInline}
				onBlurSmart={() => {
					// preserve exact behavior: ignore event details
					onBlurSmart();
				}}
				beginRename={beginRename}
				beginNewFile={beginNewFile}
				beginNewFolder={beginNewFolder}
				onSelectFile={(fileId) => {
					if (projectId) {
						dispatch(openFile({ projectId, fileId }));
					}
				}}
				openMenuAt={openMenuAt}
				onDropFiles={handleDropFiles}
			/>

			{menu && menuNode && (
				<div
					ref={menuRef}
					className="fixed z-50 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden"
					style={{ left: menu.x, top: menu.y, minWidth: 180 }}
				>
					{/* Folder actions */}
					{menuNode.type === 'folder' && (
						<>
							<button
								className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
								onClick={() => {
									setMenu(null);
									beginNewFile(menuNode.id);
								}}
							>
								+ New file
							</button>
							<button
								className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
								onClick={() => {
									setMenu(null);
									beginNewFolder(menuNode.id);
								}}
							>
								+ New folder
							</button>
							<button
								className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
								onClick={() => {
									setMenu(null);
									handleImportFiles(menuNode.id);
								}}
							>
								📁 Import Files...
							</button>

							{!menuIsRoot && (
								<>
									<div className="h-px bg-slate-300 dark:bg-slate-700 my-1" />
									<button
										className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
										onClick={() => handleCopyPath(menuNode.id, false)}
									>
										Copy Path
									</button>
									<button
										className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
										onClick={() => handleCopyPath(menuNode.id, true)}
									>
										Copy Relative Path
									</button>
									<div className="h-px bg-slate-300 dark:bg-slate-700 my-1" />
									<button
										className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
										onClick={() => {
											setMenu(null);
											beginRename(menuNode);
										}}
									>
										Rename
									</button>
									<button
										className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-300 hover:bg-slate-100 dark:hover:bg-slate-800"
										onClick={() => confirmDelete(menuNode)}
									>
										Delete
									</button>
								</>
							)}
						</>
					)}

					{/* File actions */}
					{menuNode.type === 'file' && (
						<>
							<button
								className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
								onClick={() => handleCopyPath(menuNode.id, false)}
							>
								Copy Path
							</button>
							<button
								className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
								onClick={() => handleCopyPath(menuNode.id, true)}
							>
								Copy Relative Path
							</button>
							<div className="h-px bg-slate-300 dark:bg-slate-700 my-1" />
							<button
								className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
								onClick={() => {
									setMenu(null);
									beginRename(menuNode);
								}}
							>
								Rename
							</button>
							<button
								className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-300 hover:bg-slate-100 dark:hover:bg-slate-800"
								onClick={() => confirmDelete(menuNode)}
							>
								Delete
							</button>
						</>
					)}
				</div>
			)}
		</>
	);
}
