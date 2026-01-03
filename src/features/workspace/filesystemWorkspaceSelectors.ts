/**
 * Selectors for filesystem-backed workspace
 */

import type { RootState } from '../../app/store';
import { getPersonalState } from './filesystemWorkspaceSlice';
import type { FileNode } from '../../types/fs';

// ========== Project Selectors ==========

export const selectAllProjects = (state: RootState) => state.filesystemWorkspace.projects;

export const selectActiveProjectId = (state: RootState) =>
	state.filesystemWorkspace.activeProjectId;

export const selectActiveProject = (state: RootState) => {
	const projectId = state.filesystemWorkspace.activeProjectId;
	if (!projectId) return null;
	return state.filesystemWorkspace.projects.find((p) => p.id === projectId) || null;
};

export const selectRoot = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.root || null;
};

export const selectManifest = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.manifest || null;
};

// ========== Personal State Selectors (from localStorage) ==========

export const selectActiveFileId = (state: RootState) => {
	const projectId = state.filesystemWorkspace.activeProjectId;
	if (!projectId) return null;

	const personalState = getPersonalState(projectId);
	return personalState?.activeFileId || null;
};

export const selectOpenFileIds = (state: RootState) => {
	const projectId = state.filesystemWorkspace.activeProjectId;
	if (!projectId) return [];

	const personalState = getPersonalState(projectId);
	return personalState?.openFileIds || [];
};

export const selectPinnedFileIds = (state: RootState) => {
	const projectId = state.filesystemWorkspace.activeProjectId;
	if (!projectId) return [];

	const personalState = getPersonalState(projectId);
	return personalState?.pinnedFileIds || [];
};

export const selectSearchState = (state: RootState) => {
	const projectId = state.filesystemWorkspace.activeProjectId;
	if (!projectId) {
		return {
			query: '',
			mode: 'all' as const,
			matchCase: false,
			extFilters: [],
		};
	}

	const personalState = getPersonalState(projectId);
	return {
		query: personalState?.searchQuery || '',
		mode: personalState?.searchMode || ('all' as const),
		matchCase: personalState?.matchCase || false,
		extFilters: personalState?.extFilters || [],
	};
};

// ========== File Selectors ==========

function findNode(root: any, id: string): any {
	if (root.id === id) return root;
	if (root.type === 'folder') {
		for (const child of root.children) {
			const found = findNode(child, id);
			if (found) return found;
		}
	}
	return null;
}

export const selectActiveFile = (state: RootState): FileNode | null => {
	const root = selectRoot(state);
	const fileId = selectActiveFileId(state);
	if (!root || !fileId) {
		return null;
	}

	const node = findNode(root, fileId);
	return node && node.type === 'file' ? node : null;
};

export const selectOpenFiles = (state: RootState): FileNode[] => {
	const root = selectRoot(state);
	const openFileIds = selectOpenFileIds(state);
	if (!root) return [];

	return openFileIds
		.map((id) => {
			const node = findNode(root, id);
			return node && node.type === 'file' ? node : null;
		})
		.filter((f): f is FileNode => f !== null);
};

// ========== Global Settings ==========

export const selectHexViewEnabled = (state: RootState) =>
	state.filesystemWorkspace.hexViewEnabled;

// ========== Search Results (TODO: implement) ==========

export const selectAllExtensions = (state: RootState): string[] => {
	const manifest = selectManifest(state);
	if (!manifest) return [];

	const extensions = new Set<string>();
	manifest.files.forEach((file) => {
		if (file.type) extensions.add(file.type);
	});

	return Array.from(extensions).sort();
};

export type NameSearchResult = {
	kind: 'name';
	nodeType: 'file' | 'folder';
	id: string;
	name: string;
	path: string;
};

export type ContentSearchResult = {
	kind: 'content';
	fileId: string;
	path: string;
	line: number;
	column: number;
	preview: string;
	lineText: string;
};

export type GlobalSearchResult = NameSearchResult | ContentSearchResult;

export const selectGlobalSearchResults = (_state: RootState): GlobalSearchResult[] => {
	// TODO: Implement search
	return [];
};
