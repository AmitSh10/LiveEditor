/**
 * Selectors for filesystem-backed workspace
 */

import type { RootState } from '../../app/store';
import { getPersonalState } from './filesystemWorkspaceSlice';
import type { FileNode, FSNode } from '../../types/fs';

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

// ========== Search Helper Functions ==========

function fileDisplayName(f: FileNode) {
	const ext = (f.extension ?? '').trim();
	return ext ? `${f.name}.${ext}` : f.name;
}

function normalizeExt(ext: string) {
	const e = (ext ?? '').trim().toLowerCase();
	if (!e) return '';
	return e.startsWith('.') ? e.slice(1) : e;
}

function makePreview(lineText: string, matchIndex: number, needleLen: number) {
	const max = 140;
	const half = Math.floor((max - needleLen) / 2);

	const start = Math.max(0, matchIndex - half);
	const end = Math.min(lineText.length, matchIndex + needleLen + half);

	let s = lineText.slice(start, end);
	if (start > 0) s = `…${s}`;
	if (end < lineText.length) s = `${s}…`;
	return s;
}

function findAllInLine(haystack: string, needle: string): number[] {
	if (!needle) return [];
	const out: number[] = [];
	let idx = 0;
	while (true) {
		const hit = haystack.indexOf(needle, idx);
		if (hit === -1) break;
		out.push(hit);
		idx = hit + Math.max(1, needle.length);
	}
	return out;
}

function walkFS(
	node: FSNode,
	parentPath: string[],
	onFolder: (folder: FSNode, fullPath: string) => void,
	onFile: (file: FileNode, fullPath: string) => void
) {
	if (node.type === 'file') {
		const fullPath = [...parentPath, fileDisplayName(node as FileNode)].join('/');
		onFile(node as FileNode, fullPath);
		return;
	}

	if (node.type === 'folder') {
		const folderPath = [...parentPath, node.name].join('/');
		onFolder(node, folderPath);

		const nextPath = [...parentPath, node.name];
		for (const child of node.children ?? []) {
			walkFS(child, nextPath, onFolder, onFile);
		}
	}
}

// ========== Search Implementation ==========

export const selectGlobalSearchResults = (state: RootState): GlobalSearchResult[] => {
	const root = selectRoot(state);
	if (!root) return [];

	const searchState = selectSearchState(state);
	const qRaw = searchState.query.trim();
	if (!qRaw) return [];

	const mode = searchState.mode;
	const matchCase = searchState.matchCase;

	const extFiltersRaw = Array.isArray(searchState.extFilters)
		? searchState.extFilters
		: [];
	const extSet = new Set(extFiltersRaw.map(normalizeExt).filter(Boolean));
	const hasExtFilter = extSet.size > 0;

	const needle = matchCase ? qRaw : qRaw.toLowerCase();

	const results: GlobalSearchResult[] = [];

	walkFS(
		root,
		[],
		() => {
			// Skip folders - only search files
		},
		(file, fullPath) => {
			const fileExt = normalizeExt(file.extension);

			// Extension filter applies to file name + file content searches
			if (hasExtFilter && !extSet.has(fileExt)) return;

			const display = fileDisplayName(file);

			// -------- Name search (last level only) --------
			if (mode !== 'content') {
				const hay = matchCase ? display : display.toLowerCase();

				// File match is only by file name (last level), not by path
				if (hay.includes(needle)) {
					results.push({
						kind: 'name',
						nodeType: 'file',
						id: file.id,
						name: display,
						path: fullPath,
					});
				}
			}

			// -------- Content search --------
			if (mode !== 'names') {
				const content = file.content ?? '';
				if (!content) return;

				const lines = content.split(/\r?\n/);

				for (let i = 0; i < lines.length; i++) {
					const lineText = lines[i];
					const hayLine = matchCase ? lineText : lineText.toLowerCase();

					const hits = findAllInLine(hayLine, needle);
					if (hits.length === 0) continue;

					for (const hit of hits) {
						results.push({
							kind: 'content',
							fileId: file.id,
							path: fullPath,
							line: i + 1,
							column: hit + 1,
							lineText,
							preview: makePreview(lineText, hit, needle.length),
						});
					}
				}
			}
		}
	);

	return results;
};
