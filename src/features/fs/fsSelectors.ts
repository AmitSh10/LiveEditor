import type { RootState } from '../../app/store';
import { findFileById } from './fsUtils';
import type { FileNode, FSNode, FolderNode } from '../../types/fs';
import type { SearchMode } from './fsSlice';

const isFileNode = (x: FileNode | null): x is FileNode => x !== null;

// ---------------- Existing selectors ----------------

export const selectActiveFile = (state: RootState) => {
	const id = state.fs.activeFileId;
	if (!id) return null;
	return findFileById(state.fs.root, id);
};

export const selectOpenFileIds = (state: RootState) => state.fs.openFileIds;
export const selectActiveFileId = (state: RootState) => state.fs.activeFileId;

export const selectOpenFiles = (state: RootState) => {
	return state.fs.openFileIds
		.map((id) => findFileById(state.fs.root, id))
		.filter(isFileNode);
};

// ---------------- Global Search ----------------

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

export const selectSearchState = (state: RootState) => ({
	query: state.fs.searchQuery,
	mode: state.fs.searchMode as SearchMode,
	matchCase: state.fs.matchCase,
	extFilters: state.fs.extFilters,
});

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
	onFolder: (folder: FolderNode, fullPath: string) => void,
	onFile: (file: FileNode, fullPath: string) => void
) {
	if (node.type === 'file') {
		const fullPath = [...parentPath, fileDisplayName(node)].join('/');
		onFile(node, fullPath);
		return;
	}

	const folder = node as FolderNode;
	const folderPath = [...parentPath, folder.name].join('/');
	onFolder(folder, folderPath);

	const nextPath = [...parentPath, folder.name];
	for (const child of folder.children ?? []) {
		walkFS(child, nextPath, onFolder, onFile);
	}
}

// Used for the multi-picker
export const selectAllExtensions = (state: RootState): string[] => {
	const set = new Set<string>();

	walkFS(
		state.fs.root,
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
	const qRaw = (state.fs.searchQuery ?? '').trim();
	if (!qRaw) return [];

	const mode = state.fs.searchMode as SearchMode;
	const matchCase = !!state.fs.matchCase;

	const extFiltersRaw = Array.isArray(state.fs.extFilters)
		? state.fs.extFilters
		: [];
	const extSet = new Set(extFiltersRaw.map(normalizeExt).filter(Boolean));
	const hasExtFilter = extSet.size > 0;

	const needle = matchCase ? qRaw : qRaw.toLowerCase();

	const results: GlobalSearchResult[] = [];

	walkFS(
		state.fs.root,
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
