import type { RootState } from '../../app/store';
import type { Project } from '../../types/workspace';
import type { FileNode, FSNode } from '../../types/fs';

// ========== Project Selectors ==========

export const selectWorkspace = (state: RootState) => state.workspace;

export const selectAllProjects = (state: RootState) =>
	state.workspace.projects;

export const selectActiveProjectId = (state: RootState) =>
	state.workspace.activeProjectId;

export const selectActiveProject = (state: RootState): Project | null => {
	const { projects, activeProjectId } = state.workspace;
	if (!activeProjectId) return null;
	return projects.find(p => p.id === activeProjectId) ?? null;
};

// ========== File System Selectors (for active project) ==========

export const selectRoot = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.root ?? null;
};

export const selectActiveFileId = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.activeFileId ?? null;
};

export const selectOpenFileIds = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.openFileIds ?? [];
};

export const selectPinnedFileIds = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.pinnedFileIds ?? [];
};

// Helper to find a node by ID in the active project
function findNode(root: FSNode | null, id: string): FSNode | null {
	if (!root) return null;
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
	const project = selectActiveProject(state);
	if (!project || !project.activeFileId) return null;

	const node = findNode(project.root, project.activeFileId);
	if (node && node.type === 'file') {
		return node as FileNode;
	}
	return null;
};

// Get all open files as FileNode objects
export const selectOpenFiles = (state: RootState): FileNode[] => {
	const project = selectActiveProject(state);
	if (!project) return [];

	return project.openFileIds
		.map(id => {
			const node = findNode(project.root, id);
			return node && node.type === 'file' ? (node as FileNode) : null;
		})
		.filter((node): node is FileNode => node !== null);
};

// ========== Search Selectors ==========

export const selectSearchQuery = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.searchQuery ?? '';
};

export const selectSearchMode = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.searchMode ?? 'all';
};

export const selectMatchCase = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.matchCase ?? false;
};

export const selectExtFilters = (state: RootState) => {
	const project = selectActiveProject(state);
	return project?.extFilters ?? [];
};

// ========== Global Settings ==========

export const selectHexViewEnabled = (state: RootState) =>
	state.workspace.hexViewEnabled;

// ========== Advanced Search Selectors ==========

export type NameSearchResult = {
	kind: 'name';
	nodeType: 'file' | 'folder';
	id: string;
	name: string; // last level only (folder name OR "file.ext")
	path: string; // full path (UI may ignore for name matches)
};

export type ContentSearchResult = {
	kind: 'content';
	fileId: string;
	path: string;
	line: number; // 1-based
	column: number; // 1-based
	preview: string;
	lineText: string;
};

export type GlobalSearchResult = NameSearchResult | ContentSearchResult;

export const selectSearchState = (state: RootState) => {
	const project = selectActiveProject(state);
	return {
		query: project?.searchQuery ?? '',
		mode: project?.searchMode ?? 'all',
		matchCase: project?.matchCase ?? false,
		extFilters: project?.extFilters ?? [],
	};
};

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

// Used for the multi-picker
export const selectAllExtensions = (state: RootState): string[] => {
	const root = selectRoot(state);
	if (!root) return [];

	const set = new Set<string>();

	walkFS(
		root,
		[],
		() => {},
		(file) => {
			const e = normalizeExt(file.extension);
			if (e) set.add(e);
		}
	);

	return Array.from(set).sort((a, b) => a.localeCompare(b));
};

export const selectGlobalSearchResults = (
	state: RootState
): GlobalSearchResult[] => {
	const project = selectActiveProject(state);
	if (!project) return [];

	const qRaw = (project.searchQuery ?? '').trim();
	if (!qRaw) return [];

	const mode = project.searchMode;
	const matchCase = !!project.matchCase;

	const extFiltersRaw = Array.isArray(project.extFilters)
		? project.extFilters
		: [];
	const extSet = new Set(extFiltersRaw.map(normalizeExt).filter(Boolean));
	const hasExtFilter = extSet.size > 0;

	const needle = matchCase ? qRaw : qRaw.toLowerCase();

	const results: GlobalSearchResult[] = [];

	walkFS(
		project.root,
		[],
		(folder, fullPath) => {
			// If ext filter is active: "search only in files that match extension"
			// So we do NOT return folder-name matches when ext filter is on.
			if (hasExtFilter) return;

			if (mode === 'content') return;

			const name = folder.name ?? '';
			const hay = matchCase ? name : name.toLowerCase();

			// Folder match is only by folder name (last level), not by path
			if (hay.includes(needle)) {
				results.push({
					kind: 'name',
					nodeType: 'folder',
					id: folder.id,
					name,
					path: fullPath,
				});
			}
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
					const hayLine = matchCase
						? lineText
						: lineText.toLowerCase();

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
