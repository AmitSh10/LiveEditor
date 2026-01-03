import { useState } from 'react';
import { FileTree } from '../fs/FileTree';
import { GlobalSearchPanel } from '../search/GlobalSearchPanel';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { importNodes } from '../workspace/workspaceSlice';
import { processDroppedFiles } from '../fs/importFiles';
import { selectRoot as selectFSRoot } from '../workspace/filesystemWorkspaceSelectors';

type SidebarTab = 'files' | 'search';

// Check if we're in filesystem mode (should match App.tsx)
const USE_FILESYSTEM_MODE = true;

export function Sidebar() {
	const [tab, setTab] = useState<SidebarTab>('files');
	const [isDragging, setIsDragging] = useState(false);
	const dispatch = useAppDispatch();

	// In filesystem mode, disable drag & drop when no project is open
	const fsRoot = useAppSelector(selectFSRoot);
	const hasProject = USE_FILESYSTEM_MODE ? fsRoot !== null : true;

	// Drag & drop handlers (only active when files tab is open and project exists)
	const handleDragOver = (e: React.DragEvent) => {
		if (tab !== 'files' || !hasProject) return;
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = 'copy';
		// Ensure dragging state is true while over the area
		if (!isDragging) {
			setIsDragging(true);
		}
	};

	const handleDragEnter = (e: React.DragEvent) => {
		if (tab !== 'files' || !hasProject) return;
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		if (tab !== 'files' || !hasProject) return;
		e.preventDefault();
		e.stopPropagation();

		// Only hide if leaving the container itself (not child elements)
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setIsDragging(false);
		}
	};

	const handleDrop = async (e: React.DragEvent) => {
		if (tab !== 'files' || !hasProject) return;
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const items = e.dataTransfer.items;
		if (!items || items.length === 0) return;

		try {
			const nodes = await processDroppedFiles(items);
			if (nodes.length > 0) {
				dispatch(importNodes({ nodes }));
			}
		} catch (error) {
			console.error('Error processing dropped files:', error);
		}
	};

	return (
		<div className="h-full flex flex-col min-h-0">
			{/* Tab bar */}
			<div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2">
				<button
					className={[
						'px-2 py-1 rounded text-sm',
						tab === 'files'
							? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
							: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900',
					].join(' ')}
					onClick={() => setTab('files')}
					title="Files"
					aria-label="Files"
					aria-pressed={tab === 'files'}
				>
					📁
				</button>

				<button
					className={[
						'px-2 py-1 rounded text-sm',
						tab === 'search'
							? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
							: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900',
					].join(' ')}
					onClick={() => setTab('search')}
					title="Search"
					aria-label="Search"
					aria-pressed={tab === 'search'}
				>
					🔎
				</button>
			</div>

			{/* Panel content */}
			<div
				className="flex-1 min-h-0 overflow-auto pt-2 relative"
				onDragOver={handleDragOver}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{/* Drag overlay - appears above content without taking space */}
				{tab === 'files' && isDragging && hasProject && (
					<div className="absolute inset-0 z-50 bg-blue-50/25 dark:bg-blue-900/15 border-2 border-dashed border-blue-500 dark:border-blue-400 rounded-md pointer-events-none">
						<div className="absolute bottom-4 left-0 right-0 flex justify-center">
							<div className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
								📁 Drop files or folders here
							</div>
						</div>
					</div>
				)}
				{tab === 'files' ? <FileTree /> : <GlobalSearchPanel />}
			</div>
		</div>
	);
}
