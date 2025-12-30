import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
	selectAllProjects,
	selectActiveProjectId,
} from './workspaceSelectors';
import {
	switchProject,
	createProject,
	deleteProject,
	renameProject,
	importProjectFromLeditor,
} from './workspaceSlice';

export function ProjectSwitcher() {
	const dispatch = useAppDispatch();
	const projects = useAppSelector(selectAllProjects);
	const activeProjectId = useAppSelector(selectActiveProjectId);
	const [showDropdown, setShowDropdown] = useState(false);
	const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
	const [showRenameDialog, setShowRenameDialog] = useState(false);
	const [newProjectName, setNewProjectName] = useState('');
	const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState('');
	const dropdownRef = useRef<HTMLDivElement>(null);
	const importInputRef = useRef<HTMLInputElement>(null);

	const activeProject = projects.find((p) => p.id === activeProjectId);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
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

	const handleNewProject = () => {
		const trimmed = newProjectName.trim();
		if (!trimmed) return;

		dispatch(createProject({ name: trimmed }));
		setNewProjectName('');
		setShowNewProjectDialog(false);
		setShowDropdown(false);
	};

	const handleRenameProject = () => {
		if (!renameProjectId) return;

		const trimmed = renameValue.trim();
		if (!trimmed) return;

		dispatch(renameProject({ projectId: renameProjectId, newName: trimmed }));
		setRenameProjectId(null);
		setRenameValue('');
		setShowRenameDialog(false);
	};

	const handleDeleteProject = (projectId: string) => {
		const project = projects.find((p) => p.id === projectId);
		if (!project) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete "${project.name}"? This cannot be undone.`
		);
		if (!confirmed) return;

		dispatch(deleteProject({ projectId }));
		setShowDropdown(false);
	};

	const handleExportProject = () => {
		if (!activeProjectId || !activeProject) return;

		// Create .leditor file content
		const exportData = {
			name: activeProject.name,
			root: activeProject.root,
			activeFileId: activeProject.activeFileId,
			openFileIds: activeProject.openFileIds,
			pinnedFileIds: activeProject.pinnedFileIds,
			searchQuery: activeProject.searchQuery,
			searchMode: activeProject.searchMode,
			matchCase: activeProject.matchCase,
			extFilters: activeProject.extFilters,
			created: activeProject.created,
			modified: activeProject.modified,
		};

		// Create blob and download
		const json = JSON.stringify(exportData, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${activeProject.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.leditor`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		setShowDropdown(false);
	};

	const handleImportClick = () => {
		importInputRef.current?.click();
		setShowDropdown(false);
	};

	const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const data = JSON.parse(text);
			dispatch(importProjectFromLeditor({ data }));
		} catch (err) {
			console.error('Error importing project:', err);
			alert('Failed to import project. Please check the file format.');
		}

		// Reset input
		if (importInputRef.current) {
			importInputRef.current.value = '';
		}
	};

	const openRenameDialog = (projectId: string, currentName: string) => {
		setRenameProjectId(projectId);
		setRenameValue(currentName);
		setShowRenameDialog(true);
		setShowDropdown(false);
	};

	return (
		<div className="relative" ref={dropdownRef}>
			{/* Hidden import input */}
			<input
				ref={importInputRef}
				type="file"
				accept=".leditor"
				onChange={handleImportFile}
				style={{ display: 'none' }}
			/>

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
				<div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[250px]">
					{/* Project list */}
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
									onClick={() => {
										dispatch(switchProject({ projectId: project.id }));
										setShowDropdown(false);
									}}
									className="flex-1 text-left text-sm"
								>
									{project.name}
									{project.id === activeProjectId && (
										<span className="ml-2 text-xs text-slate-500">✓</span>
									)}
								</button>
								<div className="flex items-center gap-1">
									<button
										onClick={() => openRenameDialog(project.id, project.name)}
										className="p-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
										title="Rename"
									>
										✏️
									</button>
									{projects.length > 1 && (
										<button
											onClick={() => handleDeleteProject(project.id)}
											className="p-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-red-600 dark:text-red-400"
											title="Delete"
										>
											🗑️
										</button>
									)}
								</div>
							</div>
						))}
					</div>

					{/* Divider */}
					<div className="h-px bg-slate-300 dark:bg-slate-700" />

					{/* Actions */}
					<div className="p-2">
						<button
							onClick={() => {
								setShowDropdown(false);
								setShowNewProjectDialog(true);
							}}
							className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
						>
							➕ New Project
						</button>
						<button
							onClick={handleImportClick}
							className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
						>
							📥 Import .leditor
						</button>
						{activeProjectId && (
							<button
								onClick={handleExportProject}
								className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
							>
								📤 Export .leditor
							</button>
						)}
					</div>
				</div>
			)}

			{/* New Project Dialog */}
			{showNewProjectDialog && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
					onClick={() => setShowNewProjectDialog(false)}
				>
					<div
						className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-4 min-w-[300px]"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="text-lg font-semibold mb-4">New Project</h3>
						<input
							type="text"
							value={newProjectName}
							onChange={(e) => setNewProjectName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleNewProject();
								if (e.key === 'Escape') setShowNewProjectDialog(false);
							}}
							placeholder="Project name"
							className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
							autoFocus
						/>
						<div className="flex gap-2">
							<button
								onClick={handleNewProject}
								disabled={!newProjectName.trim()}
								className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Create
							</button>
							<button
								onClick={() => {
									setShowNewProjectDialog(false);
									setNewProjectName('');
								}}
								className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Rename Project Dialog */}
			{showRenameDialog && renameProjectId && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
					onClick={() => setShowRenameDialog(false)}
				>
					<div
						className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-4 min-w-[300px]"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="text-lg font-semibold mb-4">Rename Project</h3>
						<input
							type="text"
							value={renameValue}
							onChange={(e) => setRenameValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleRenameProject();
								if (e.key === 'Escape') setShowRenameDialog(false);
							}}
							placeholder="New project name"
							className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
							autoFocus
						/>
						<div className="flex gap-2">
							<button
								onClick={handleRenameProject}
								disabled={!renameValue.trim()}
								className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Rename
							</button>
							<button
								onClick={() => {
									setShowRenameDialog(false);
									setRenameProjectId(null);
									setRenameValue('');
								}}
								className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
