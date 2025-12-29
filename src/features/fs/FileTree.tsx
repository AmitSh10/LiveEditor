import { useMemo } from 'react';
import type { FSNode } from '../../types/fs';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { setActiveFile } from './fsSlice';
import { FileTreeNode } from './FileTreeNode';
import { useExpandedFolders } from './useExpandedFolders';
import { useContextMenu } from './useContextMenu';
import { useInlineRename } from './useInlineRename';

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
	const root = useAppSelector((s) => s.fs.root);
	const activeId = useAppSelector((s) => s.fs.activeFileId);
	const rootId = root.id;

	// Expanded folders (persisted)
	const { expanded, toggleExpanded, ensureExpanded } = useExpandedFolders();

	// Context menu
	const { menu, setMenu, menuRef, openMenuAt, closeMenu } = useContextMenu();

	// Inline rename/create/delete rules
	const {
		editing,
		setEditing,
		beginRename,
		beginNewFile,
		beginNewFolder,
		confirmDelete,
		onKeyForInline,
		onBlurSmart,
	} = useInlineRename({
		root,
		rootId,
		dispatch,
		ensureExpanded: (folderId: string) => ensureExpanded(folderId, rootId),
		afterCommit: () => closeMenu(),
	});

	const setEditingValue = (value: string) => {
		setEditing((prev) => (prev ? { ...prev, value, error: null } : prev));
	};

	const menuNode = useMemo(() => {
		if (!menu) return null;
		return findNode(root, menu.nodeId);
	}, [menu, root]);

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
				onSelectFile={(fileId) => dispatch(setActiveFile(fileId))}
				openMenuAt={openMenuAt}
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
