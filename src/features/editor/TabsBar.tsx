import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActiveFileId, selectOpenFiles } from '../fs/fsSelectors';
import { closeFile, setActiveFile, togglePinFile } from '../fs/fsSlice';
import { getFileIcon } from '../../utils/fileIcons';
import type { FSNode } from '../../types/fs';

// Helper to build file path
function buildFilePath(root: FSNode, targetId: string): string | null {
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

type ContextMenu = {
	fileId: string;
	x: number;
	y: number;
} | null;

export function TabsBar() {
	const dispatch = useAppDispatch();
	const activeId = useAppSelector(selectActiveFileId);
	const openFiles = useAppSelector(selectOpenFiles);
	const pinnedFileIds = useAppSelector((s) => s.fs.pinnedFileIds);
	const root = useAppSelector((s) => s.fs.root);
	const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close context menu on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setContextMenu(null);
			}
		};

		if (contextMenu) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [contextMenu]);

	if (openFiles.length === 0) return null;

	// Sort files: pinned first, then unpinned
	const sortedFiles = [...openFiles].sort((a, b) => {
		const aIsPinned = pinnedFileIds.includes(a.id);
		const bIsPinned = pinnedFileIds.includes(b.id);
		if (aIsPinned && !bIsPinned) return -1;
		if (!aIsPinned && bIsPinned) return 1;
		return 0;
	});

	const handleCloseOthers = (fileId: string) => {
		openFiles.forEach((f) => {
			if (f.id !== fileId && !pinnedFileIds.includes(f.id)) {
				dispatch(closeFile({ id: f.id }));
			}
		});
		setContextMenu(null);
	};

	const handleCloseToRight = (fileId: string) => {
		const index = sortedFiles.findIndex((f) => f.id === fileId);
		if (index === -1) return;

		for (let i = index + 1; i < sortedFiles.length; i++) {
			if (!pinnedFileIds.includes(sortedFiles[i].id)) {
				dispatch(closeFile({ id: sortedFiles[i].id }));
			}
		}
		setContextMenu(null);
	};

	const handleCopyPath = (fileId: string, relative: boolean) => {
		const targetPath = buildFilePath(root, fileId);
		if (!targetPath) return;

		if (relative && activeId) {
			// Calculate relative path from active file to target file
			const sourcePath = buildFilePath(root, activeId);
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
		setContextMenu(null);
	};

	return (
		<>
			<div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 overflow-x-auto">
				<div className="flex items-center gap-1 px-2 py-1">
					{sortedFiles.map((f) => {
						const ext = (f.extension ?? '').trim();
						const label = ext ? `${f.name}.${ext}` : f.name;
						const isActive = f.id === activeId;
						const iconConfig = getFileIcon(ext);
						const isPinned = pinnedFileIds.includes(f.id);

						return (
							<div
								key={f.id}
								className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer select-none whitespace-nowrap
									${
										isActive
											? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
											: 'bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/60'
									}
								`}
								onClick={() => dispatch(setActiveFile(f.id))}
								onContextMenu={(e) => {
									e.preventDefault();
									setContextMenu({ fileId: f.id, x: e.clientX, y: e.clientY });
								}}
								title={label}
							>
								<span className={`text-sm ${iconConfig.color}`}>
									{iconConfig.icon}
								</span>
								<span className="text-sm">{label}</span>

								{/* Pin button */}
								<button
								type="button"
								className={`text-xs px-1 rounded hover:bg-slate-300 dark:hover:bg-black/20 ${
									isActive
										? 'text-slate-700 dark:text-slate-200'
										: 'text-slate-500 dark:text-slate-400'
								}`}
								onClick={(e) => {
									e.stopPropagation();
									dispatch(togglePinFile({ id: f.id }));
								}}
								title={isPinned ? 'Unpin' : 'Pin'}
							>
										{isPinned ? '📌' : '📍'}
								</button>

								{/* Close button */}
								<button
								type="button"
								className={`text-xs px-1 rounded hover:bg-slate-300 dark:hover:bg-black/20 ${
									isActive
										? 'text-slate-700 dark:text-slate-200'
										: 'text-slate-500 dark:text-slate-400'
								} ${isPinned ? 'opacity-50 cursor-not-allowed' : ''}`}
								onClick={(e) => {
									e.stopPropagation();
									if (!isPinned) {
										dispatch(closeFile({ id: f.id }));
									}
								}}
								title={isPinned ? 'Pinned (cannot close)' : 'Close'}
								disabled={isPinned}
								>
									✕
								</button>
							</div>
						);
					})}
				</div>
			</div>

		{/* Context Menu */}
		{contextMenu && (
			<div
				ref={menuRef}
				className="fixed z-50 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden"
				style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 180 }}
			>
				<button
					className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
					onClick={() => handleCloseOthers(contextMenu.fileId)}
				>
					Close Others
				</button>
				<button
					className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
					onClick={() => handleCloseToRight(contextMenu.fileId)}
				>
					Close to Right
				</button>
				<div className="h-px bg-slate-300 dark:bg-slate-700 my-1" />
				<button
					className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
					onClick={() => handleCopyPath(contextMenu.fileId, false)}
				>
					Copy Path
				</button>
				<button
					className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
					onClick={() => handleCopyPath(contextMenu.fileId, true)}
				>
					Copy Relative Path
				</button>
			</div>
		)}
	</>
	);
}
