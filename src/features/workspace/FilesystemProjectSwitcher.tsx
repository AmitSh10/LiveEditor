/**
 * Project Switcher for Filesystem Mode
 * Opens real OS directories as projects
 */

import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
	selectAllProjects,
	selectActiveProjectId,
} from './filesystemWorkspaceSelectors';
import {
	projectClosed,
	switchProject,
} from './filesystemWorkspaceSlice';
import {
	pickDirectory,
	createLEditorManifest,
	rescanAndUpdateManifest,
} from '../../utils/filesystemAPI';
import {
	projectOpened,
	setProjectHandle,
} from './filesystemWorkspaceSlice';

/**
 * Generate a stable project ID based on the directory handle
 * This ensures the same folder always gets the same project ID
 */
async function getStableProjectId(dirHandle: FileSystemDirectoryHandle): Promise<string> {
	// Try to get a stable identifier from the directory handle
	// We'll use the directory name as a base, but need to make it unique per path
	// Since we can't get the full path from FileSystemDirectoryHandle, we'll use a hash

	// For now, use directory name + a hash of the creation time if available
	// This isn't perfect but better than random IDs
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

export function FilesystemProjectSwitcher() {
	const dispatch = useAppDispatch();
	const projects = useAppSelector(selectAllProjects);
	const activeProjectId = useAppSelector(selectActiveProjectId);
	const [showDropdown, setShowDropdown] = useState(false);
	const [showNameDialog, setShowNameDialog] = useState(false);
	const [projectName, setProjectName] = useState('');
	const [pendingDirHandle, setPendingDirHandle] = useState<any>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const activeProject = projects.find((p) => p.id === activeProjectId);

	// Click outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setShowDropdown(false);
			}
		};

		if (showDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showDropdown]);

	const handleOpenProject = async () => {
		setShowDropdown(false);

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

	const handleCloseProject = (projectId: string) => {
		const project = projects.find((p) => p.id === projectId);
		if (!project) return;

		const confirmed = window.confirm(
			`Close project "${project.name}"? The files will remain on your disk, but the project will be removed from this session.`
		);
		if (!confirmed) return;

		dispatch(projectClosed({ projectId }));
		setShowDropdown(false);
	};

	const handleSwitchProject = (projectId: string) => {
		dispatch(switchProject({ projectId }));
		setShowDropdown(false);
	};

	const handleClearAllProjects = async () => {
		if (!confirm('Clear all project data? This will remove all projects from the session. Your files on disk will NOT be deleted.')) {
			return;
		}

		// Clear localStorage
		localStorage.clear();

		// Clear IndexedDB
		try {
			await indexedDB.deleteDatabase('live-editor-handles');
		} catch (err) {
			console.error('Failed to clear IndexedDB:', err);
		}

		// Reload the page to reset state
		window.location.reload();
	};

	return (
		<>
			<div className="relative" ref={dropdownRef}>
				{/* Project dropdown button */}
				<button
					onClick={() => setShowDropdown(!showDropdown)}
					className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
					title="Switch project"
				>
					<span>📁 {activeProject?.name || 'No Project'}</span>
					<span className="text-xs">{showDropdown ? '▲' : '▼'}</span>
				</button>

				{/* Dropdown menu */}
				{showDropdown && (
					<div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[280px]">
					{/* Project list */}
					{projects.length > 0 && (
						<div className="max-h-[300px] overflow-y-auto">
							{projects.map((project) => (
								<div
									key={project.id}
									className={`flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
										project.id === activeProjectId
											? 'bg-slate-50 dark:bg-slate-800/50'
											: ''
									}`}
								>
									<button
										onClick={() => handleSwitchProject(project.id)}
										className="flex-1 text-left"
									>
										<div className="text-sm font-medium">{project.name}</div>
										<div className="text-xs text-slate-500 dark:text-slate-400">
											{project.rootPath}
										</div>
										{project.id === activeProjectId && (
											<span className="text-xs text-green-600 dark:text-green-400">
												● Active
											</span>
										)}
									</button>
									<button
										onClick={() => handleCloseProject(project.id)}
										className="ml-2 p-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-red-600 dark:text-red-400"
										title="Close project"
									>
										✕
									</button>
								</div>
							))}
						</div>
					)}

					{projects.length === 0 && (
						<div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400 text-center">
							No projects open
						</div>
					)}

					{/* Divider */}
					<div className="h-px bg-slate-300 dark:bg-slate-700" />

					{/* Actions */}
					<div className="p-2">
						<button
							onClick={handleOpenProject}
							className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium"
						>
							📂 Open Folder as Project
						</button>
						{projects.length > 0 && (
							<button
								onClick={handleClearAllProjects}
								className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-red-600 dark:text-red-400"
							>
								🗑️ Clear All Projects
							</button>
						)}
						<div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
							Select a folder from your computer. If it contains a .leditor file, the
							project will be restored. Otherwise, a new project will be created.
						</div>
					</div>
				</div>
			)}
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
