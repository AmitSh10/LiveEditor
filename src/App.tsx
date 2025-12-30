import { useState, useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from './app/hooks';

import { Sidebar } from './features/sidebar/Sidebar';
import { EditorPanel } from './features/editor/EditorPanel';
import { ProjectSwitcher } from './features/workspace/ProjectSwitcher';
import { exportAsZip } from './features/fs/exportZip';
import { importFolder as importFolderFromFiles } from './features/fs/importFolder';
import { importFolder } from './features/workspace/workspaceSlice';
import { selectRoot } from './features/workspace/workspaceSelectors';
import { toggleTheme } from './features/theme/themeSlice';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 280;

export default function App() {
	const dispatch = useAppDispatch();
	const root = useAppSelector(selectRoot);
	const theme = useAppSelector((s) => s.theme.theme);
	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
	const [isResizing, setIsResizing] = useState(false);
	const startXRef = useRef(0);
	const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [showImportMenu, setShowImportMenu] = useState(false);

	// Apply theme class to document on mount and when theme changes
	useEffect(() => {
		if (theme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [theme]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing) return;

			const delta = e.clientX - startXRef.current;
			const newWidth = Math.min(
				MAX_SIDEBAR_WIDTH,
				Math.max(MIN_SIDEBAR_WIDTH, startWidthRef.current + delta)
			);
			setSidebarWidth(newWidth);
		};

		const handleMouseUp = () => {
			setIsResizing(false);
		};

		if (isResizing) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [isResizing]);

	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		startXRef.current = e.clientX;
		startWidthRef.current = sidebarWidth;
	};

	const handleImportClick = () => {
		setShowImportMenu(true);
	};

	const handleImportIntoProject = () => {
		setShowImportMenu(false);
		fileInputRef.current?.click();
	};

	const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		try {
			const folder = await importFolderFromFiles(files);
			dispatch(importFolder({ folder }));
		} catch (err) {
			console.error('Error importing folder:', err);
			alert('Failed to import folder. Please try again.');
		}

		// Reset input so the same folder can be imported again
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	return (
		<div className="h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
			<aside
				className="border-r border-slate-200 dark:border-slate-800 p-3 h-full min-h-0 flex flex-col relative"
				style={{ width: `${sidebarWidth}px` }}
			>
				<div className="flex-1 min-h-0">
					<Sidebar />
				</div>

				{/* Hidden file input for folder selection */}
				<input
					ref={fileInputRef}
					type="file"
					/* @ts-ignore - webkitdirectory is not in TypeScript types but works in all browsers */
					webkitdirectory=""
					directory=""
					multiple
					onChange={handleFolderSelect}
					style={{ display: 'none' }}
				/>

				{/* Import and Export buttons */}
				<div className="flex gap-2 mt-3">
					<button
						className="flex-1 text-sm px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
						onClick={handleImportClick}
						title="Import folder from your computer"
					>
						Import Folder
					</button>
					<button
						className="flex-1 text-sm px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
						onClick={() => root && exportAsZip(root)}
						title="Download as ZIP file"
					>
						Export ZIP
					</button>
				</div>

				{/* Import Mode Selection Modal */}
				{showImportMenu && (
					<div
						className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
						onClick={() => setShowImportMenu(false)}
					>
						<div
							className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-4 min-w-[300px]"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-lg font-semibold mb-4">Import Folder</h3>
							<div className="flex flex-col gap-2">
								<button
									className="w-full text-left px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
									onClick={handleImportIntoProject}
								>
									<div className="font-medium">Import into Project</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
										Add folder to current project
									</div>
								</button>
								<button
									className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded cursor-not-allowed opacity-50"
									disabled
									title="Coming soon"
								>
									<div className="font-medium">New Project</div>
									<div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
										Create a new project (Coming soon)
									</div>
								</button>
							</div>
							<button
								className="w-full mt-4 px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
								onClick={() => setShowImportMenu(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				)}

				{/* Resize handle */}
				<div
					className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors group"
					onMouseDown={handleMouseDown}
				>
					<div className="absolute inset-y-0 -left-1 -right-1" />
				</div>
			</aside>

			<main className="flex-1 p-3 h-screen flex flex-col overflow-hidden">
				<div className="flex items-center justify-between mb-2">
					<div className="font-semibold">Editor</div>
					<div className="flex items-center gap-2">
						<ProjectSwitcher />
						<button
							onClick={() => dispatch(toggleTheme())}
							className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
							title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
						>
							{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
						</button>
					</div>
				</div>
				<div className="flex-1 min-h-0">
					<EditorPanel />
				</div>
			</main>
		</div>
	);
}
