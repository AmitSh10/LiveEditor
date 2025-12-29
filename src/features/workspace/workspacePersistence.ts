import type { Workspace, Project } from '../../types/workspace';
import type { FSState } from '../fs/fsSlice';

const WORKSPACE_KEY = 'live-editor-workspace';
const OLD_FS_KEY = 'live-editor-fs';

/**
 * Save workspace to localStorage with debouncing
 */
let saveTimer: number | null = null;

export function saveWorkspace(workspace: Workspace) {
	if (saveTimer !== null) {
		clearTimeout(saveTimer);
	}

	saveTimer = window.setTimeout(() => {
		try {
			const serialized = JSON.stringify(workspace);
			localStorage.setItem(WORKSPACE_KEY, serialized);
		} catch (err) {
			console.error('Failed to save workspace:', err);
		}
	}, 1000); // 1 second debounce
}

/**
 * Load workspace from localStorage
 */
export function loadWorkspace(): Workspace | null {
	try {
		const data = localStorage.getItem(WORKSPACE_KEY);
		if (!data) return null;

		const workspace: Workspace = JSON.parse(data);
		return workspace;
	} catch (err) {
		console.error('Failed to load workspace:', err);
		return null;
	}
}

/**
 * Migrate old fsSlice format to new workspace format
 */
export function migrateFromOldFormat(): Workspace | null {
	try {
		const oldData = localStorage.getItem(OLD_FS_KEY);
		if (!oldData) return null;

		const oldFs: FSState = JSON.parse(oldData);

		// Create a project from the old state
		const now = new Date().toISOString();
		const project: Project = {
			id: `proj_${Date.now()}`,
			name: 'My Project',
			created: now,
			modified: now,
			storageMode: 'localstorage',
			root: oldFs.root,
			activeFileId: oldFs.activeFileId,
			openFileIds: Array.isArray(oldFs.openFileIds)
				? oldFs.openFileIds
				: oldFs.activeFileId
				? [oldFs.activeFileId]
				: [],
			pinnedFileIds: Array.isArray(oldFs.pinnedFileIds)
				? oldFs.pinnedFileIds
				: [],
			searchQuery:
				typeof oldFs.searchQuery === 'string' ? oldFs.searchQuery : '',
			searchMode:
				oldFs.searchMode === 'names' ||
				oldFs.searchMode === 'content' ||
				oldFs.searchMode === 'all'
					? oldFs.searchMode
					: 'all',
			matchCase:
				typeof oldFs.matchCase === 'boolean' ? oldFs.matchCase : false,
			extFilters: Array.isArray(oldFs.extFilters)
				? oldFs.extFilters.filter((x: any) => typeof x === 'string')
				: [],
		};

		const workspace: Workspace = {
			projects: [project],
			activeProjectId: project.id,
			hexViewEnabled: false,
		};

		// Save migrated workspace
		localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));

		// Remove old key
		localStorage.removeItem(OLD_FS_KEY);

		console.log('✅ Migrated old file system to workspace format');

		return workspace;
	} catch (err) {
		console.error('Failed to migrate from old format:', err);
		return null;
	}
}

/**
 * Load workspace with automatic migration
 */
export function loadWorkspaceWithMigration(): Workspace | null {
	// Try to load workspace
	let workspace = loadWorkspace();

	// If no workspace, try to migrate from old format
	if (!workspace) {
		workspace = migrateFromOldFormat();
	}

	return workspace;
}
