import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FolderNode, FSNode } from '../../types/fs';
import { createInitialFS } from './fsStore';
import { loadFS } from './fsPersistence';

export type SearchMode = 'all' | 'names' | 'content';

export type FSState = {
	root: FolderNode;
	activeFileId: string | null;

	// Tabs: ordered list of open file ids
	openFileIds: string[];
	pinnedFileIds: string[]; // list of pinned file ids

	// Hex view mode (global toggle)
	hexViewEnabled: boolean;

	// Global search
	searchQuery: string;
	searchMode: SearchMode;
	matchCase: boolean;
	extFilters: string[]; // multi-select (["md","ts","tsx"])
};

const initial = createInitialFS();
const persisted: any = loadFS();

const initialState: FSState = persisted
	? {
			root: persisted.root,
			activeFileId: persisted.activeFileId ?? null,
			openFileIds: Array.isArray(persisted.openFileIds)
				? persisted.openFileIds
				: persisted.activeFileId
				? [persisted.activeFileId]
				: [],
			pinnedFileIds: Array.isArray(persisted.pinnedFileIds)
				? persisted.pinnedFileIds
				: [],
			hexViewEnabled: false, // Don't persist hex view mode

			searchQuery:
				typeof persisted.searchQuery === 'string'
					? persisted.searchQuery
					: '',
			searchMode:
				persisted.searchMode === 'names' ||
				persisted.searchMode === 'content' ||
				persisted.searchMode === 'all'
					? persisted.searchMode
					: 'all',
			matchCase:
				typeof persisted.matchCase === 'boolean'
					? persisted.matchCase
					: false,
			extFilters: Array.isArray(persisted.extFilters)
				? persisted.extFilters.filter((x: any) => typeof x === 'string')
				: [],
	  }
	: {
			root: initial.root,
			activeFileId: initial.activeFileId,
			openFileIds: initial.activeFileId ? [initial.activeFileId] : [],
			pinnedFileIds: [],
			hexViewEnabled: false,

			searchQuery: '',
			searchMode: 'all',
			matchCase: false,
			extFilters: [],
	  };

// ---------- helpers (internal) ----------

type AnyNode = any;

function genId(prefix: 'f' | 'd' = 'f') {
	const uid =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? (crypto as Crypto).randomUUID()
			: `${Date.now().toString(36)}-${Math.random()
					.toString(36)
					.slice(2, 10)}`;
	return `${prefix}_${uid}`;
}

function normalizeName(name: string) {
	return (name ?? '').trim();
}

/**
 * Parse user input like:
 * - "notes.md"   -> { name: "notes", extension: "md" }
 * - "notes"      -> { name: "notes", extension: "" }
 * - ".env"       -> { name: ".env", extension: "" }  (special-case)
 * - "archive.tar.gz" -> { name: "archive.tar", extension: "gz" } (last-dot split)
 */
function parseFileName(input: string) {
	const clean = normalizeName(input);
	if (!clean) return null;

	// ".env" or ".gitignore" style: treat as name-only
	if (clean.startsWith('.') && clean.indexOf('.', 1) === -1) {
		return { name: clean, extension: '' };
	}

	const lastDot = clean.lastIndexOf('.');
	if (lastDot > 0 && lastDot < clean.length - 1) {
		const name = clean.slice(0, lastDot);
		const extension = clean.slice(lastDot + 1);
		return { name, extension };
	}

	return { name: clean, extension: '' };
}

function findNode(root: AnyNode, id: string): AnyNode | null {
	if (!root) return null;
	if (root.id === id) return root;

	if (root.type === 'folder' && Array.isArray(root.children)) {
		for (const child of root.children) {
			const hit = findNode(child, id);
			if (hit) return hit;
		}
	}
	return null;
}

function findParentFolder(root: AnyNode, childId: string): AnyNode | null {
	if (!root || root.type !== 'folder' || !Array.isArray(root.children))
		return null;

	for (const child of root.children) {
		if (child?.id === childId) return root;
		const hit = findParentFolder(child, childId);
		if (hit) return hit;
	}
	return null;
}

function nameExistsInFolder(
	folder: AnyNode,
	nodeType: 'file' | 'folder',
	wanted: { name: string; extension?: string },
	exceptId?: string
) {
	if (!folder || folder.type !== 'folder' || !Array.isArray(folder.children))
		return false;

	if (nodeType === 'folder') {
		return folder.children.some(
			(c: AnyNode) =>
				c?.type === 'folder' &&
				c?.name === wanted.name &&
				c?.id !== exceptId
		);
	}

	const ext = wanted.extension ?? '';
	return folder.children.some((c: AnyNode) => {
		if (c?.type !== 'file') return false;
		return (
			c?.name === wanted.name &&
			(c?.extension ?? '') === ext &&
			c?.id !== exceptId
		);
	});
}

function firstFileId(root: AnyNode): string | null {
	if (!root) return null;
	if (root.type === 'file') return root.id ?? null;

	if (root.type === 'folder' && Array.isArray(root.children)) {
		for (const child of root.children) {
			const id = firstFileId(child);
			if (id) return id;
		}
	}
	return null;
}

function deleteNodeById(root: AnyNode, id: string): boolean {
	const parent = findParentFolder(root, id);
	if (!parent) return false;

	const idx = parent.children.findIndex((c: AnyNode) => c?.id === id);
	if (idx === -1) return false;

	parent.children.splice(idx, 1);
	return true;
}

function isFileIdStillValid(root: AnyNode, id: string): boolean {
	const n = findNode(root, id);
	return !!n && n.type === 'file';
}

function ensureOpen(state: FSState, fileId: string) {
	if (!state.openFileIds.includes(fileId)) {
		state.openFileIds.push(fileId);
	}
}

function cleanupTabs(state: FSState) {
	// Remove ids that are no longer real files
	state.openFileIds = state.openFileIds.filter((id) =>
		isFileIdStillValid(state.root, id)
	);

	// Active must be in open tabs if it exists
	if (
		state.activeFileId &&
		isFileIdStillValid(state.root, state.activeFileId)
	) {
		ensureOpen(state, state.activeFileId);
	} else {
		// If active is invalid, pick a sane replacement
		state.activeFileId =
			state.openFileIds[0] ?? firstFileId(state.root) ?? null;
		if (state.activeFileId) ensureOpen(state, state.activeFileId);
	}
}

// ---------- slice ----------

const fsSlice = createSlice({
	name: 'fs',
	initialState,
	reducers: {
		// ---------- Global Search ----------
		setSearchQuery(state, action: PayloadAction<string>) {
			state.searchQuery = action.payload ?? '';
		},
		setSearchMode(state, action: PayloadAction<SearchMode>) {
			state.searchMode = action.payload;
		},
		setMatchCase(state, action: PayloadAction<boolean>) {
			state.matchCase = !!action.payload;
		},
		setExtFilters(state, action: PayloadAction<string[]>) {
			state.extFilters = Array.isArray(action.payload)
				? action.payload.filter((x) => typeof x === 'string')
				: [];
		},
		clearSearch(state) {
			state.searchQuery = '';
			state.searchMode = 'all';
			state.matchCase = false;
			state.extFilters = [];
		},

		// ---------- Hex View ----------
		toggleHexView(state) {
			state.hexViewEnabled = !state.hexViewEnabled;
		},

		// Tabs-aware: selecting a file also ensures it's opened as a tab.
		setActiveFile(state, action: PayloadAction<string | null>) {
			const id = action.payload;

			if (!id) {
				state.activeFileId = null;
				return;
			}

			// Only allow activating real files
			const n = findNode(state.root, id);
			if (!n || n.type !== 'file') return;

			state.activeFileId = id;
			ensureOpen(state, id);
		},

		// Explicit open (idempotent)
		openFile(
			state,
			action: PayloadAction<{ id: string; setActive?: boolean }>
		) {
			const { id, setActive = true } = action.payload;
			const n = findNode(state.root, id);
			if (!n || n.type !== 'file') return;

			ensureOpen(state, id);
			if (setActive) state.activeFileId = id;
		},

		// Close a tab. If closing the active tab, activates neighbor.
		// Pinned tabs cannot be closed.
		closeFile(state, action: PayloadAction<{ id: string }>) {
			const { id } = action.payload;

			// Prevent closing pinned tabs
			if (state.pinnedFileIds.includes(id)) return;

			const idx = state.openFileIds.indexOf(id);
			if (idx === -1) return;

			const wasActive = state.activeFileId === id;

			state.openFileIds.splice(idx, 1);

			if (wasActive) {
				// Prefer left neighbor, else same index (which becomes right neighbor)
				const nextId =
					state.openFileIds[idx - 1] ??
					state.openFileIds[idx] ??
					null;

				state.activeFileId = nextId;
			}

			// If tabs are empty but there are files, choose first file
			if (!state.activeFileId) {
				const fallback = firstFileId(state.root);
				state.activeFileId = fallback;
				if (fallback) ensureOpen(state, fallback);
			}
		},

		// Toggle pin status for a file tab
		togglePinFile(state, action: PayloadAction<{ id: string }>) {
			const { id } = action.payload;

			// Only allow pinning files that are actually open
			if (!state.openFileIds.includes(id)) return;

			const pinIdx = state.pinnedFileIds.indexOf(id);
			if (pinIdx === -1) {
				// Pin it
				state.pinnedFileIds.push(id);
			} else {
				// Unpin it
				state.pinnedFileIds.splice(pinIdx, 1);
			}
		},

		updateFileContent(
			state,
			action: PayloadAction<{ id: string; content: string }>
		) {
			const { id, content } = action.payload;

			const update = (node: AnyNode): boolean => {
				if (node.type === 'file' && node.id === id) {
					node.content = content;
					return true;
				}
				if (node.type === 'folder') {
					return node.children.some(update);
				}
				return false;
			};

			update(state.root);
		},

		// ---------------- CRUD ----------------

		createFolder(
			state,
			action: PayloadAction<{ parentFolderId: string; name: string }>
		) {
			const { parentFolderId, name } = action.payload;
			const clean = normalizeName(name);
			if (!clean) return;

			const parent = findNode(state.root, parentFolderId);
			if (!parent || parent.type !== 'folder') return;

			if (nameExistsInFolder(parent, 'folder', { name: clean })) return;

			parent.children.push({
				id: genId('d'),
				type: 'folder',
				name: clean,
				children: [],
			} satisfies FolderNode);
		},

		/**
		 * Create a file by "filename" (can be "a.md" or "a") or by { name, extension }.
		 * Prefer filename in UI; the reducer parses it safely.
		 */
		createFile(
			state,
			action: PayloadAction<{
				parentFolderId: string;
				filename: string; // e.g. "readme.md" or "notes"
				content?: string;
				setActive?: boolean;
			}>
		) {
			const {
				parentFolderId,
				filename,
				content = '',
				setActive = true,
			} = action.payload;

			const parsed = parseFileName(filename);
			if (!parsed) return;

			const parent = findNode(state.root, parentFolderId);
			if (!parent || parent.type !== 'folder') return;

			if (nameExistsInFolder(parent, 'file', parsed)) return;

			const id = genId('f');
			parent.children.push({
				id,
				type: 'file',
				name: parsed.name,
				extension: parsed.extension,
				content,
			} as FSNode);

			if (setActive) {
				state.activeFileId = id;
				ensureOpen(state, id);
			}
		},

		/**
		 * Rename folder: newName is folder name
		 * Rename file: newName may be "a" or "a.md" (updates extension if provided)
		 */
		renameNode(
			state,
			action: PayloadAction<{ id: string; newName: string }>
		) {
			const { id, newName } = action.payload;

			const node = findNode(state.root, id);
			if (!node) return;

			// safety: don't rename root
			if (node === state.root) return;

			const parent = findParentFolder(state.root, id);
			if (!parent) return;

			if (node.type === 'folder') {
				const clean = normalizeName(newName);
				if (!clean) return;
				if (nameExistsInFolder(parent, 'folder', { name: clean }, id))
					return;
				node.name = clean;
				return;
			}

			// file
			const parsed = parseFileName(newName);
			if (!parsed) return;

			if (nameExistsInFolder(parent, 'file', parsed, id)) return;

			node.name = parsed.name;
			node.extension = parsed.extension;

			// Tabs remain valid because id doesn't change.
		},

		deleteNode(state, action: PayloadAction<{ id: string }>) {
			const { id } = action.payload;
			if (!id) return;

			// safety: do not delete root
			if ((state.root as any)?.id === id) return;

			const deleted = deleteNodeById(state.root, id);
			if (!deleted) return;

			// Remove from tabs if it was open
			const tabIdx = state.openFileIds.indexOf(id);
			if (tabIdx !== -1) state.openFileIds.splice(tabIdx, 1);

			// ensure activeFileId points to an existing file
			if (state.activeFileId === id) {
				state.activeFileId = null;
			}

			cleanupTabs(state);
		},

		// Import a folder into the root
		importFolder(state, action: PayloadAction<{ folder: FolderNode }>) {
			const { folder } = action.payload;
			if (!folder || folder.type !== 'folder') return;

			// Check if a folder with the same name already exists
			const existingNames = state.root.children
				.filter((c: AnyNode) => c?.type === 'folder')
				.map((c: AnyNode) => c.name);

			let finalName = folder.name;

			// If name exists, append (1), (2), etc.
			if (existingNames.includes(finalName)) {
				let counter = 1;
				while (existingNames.includes(`${folder.name} (${counter})`)) {
					counter++;
				}
				finalName = `${folder.name} (${counter})`;
			}

			// Add the imported folder with the potentially renamed name
			state.root.children.push({
				...folder,
				name: finalName,
			});
		},

		// Import multiple files and folders into the root
		importNodes(
			state,
			action: PayloadAction<{ nodes: (FSNode | FolderNode)[] }>
		) {
			const { nodes } = action.payload;
			if (!Array.isArray(nodes)) return;

			for (const node of nodes) {
				if (!node || !node.type) continue;

				if (node.type === 'folder') {
					// Reuse importFolder logic
					const existingNames = state.root.children
						.filter((c: AnyNode) => c?.type === 'folder')
						.map((c: AnyNode) => c.name);

					let finalName = node.name;

					if (existingNames.includes(finalName)) {
						let counter = 1;
						while (existingNames.includes(`${node.name} (${counter})`)) {
							counter++;
						}
						finalName = `${node.name} (${counter})`;
					}

					state.root.children.push({
						...node,
						name: finalName,
					});
				} else if (node.type === 'file') {
					// Check for duplicate file names
					const parsed = { name: node.name, extension: node.extension };

					let finalName = node.name;
					let finalExt = node.extension;

					if (nameExistsInFolder(state.root, 'file', parsed)) {
						let counter = 1;
						while (
							nameExistsInFolder(state.root, 'file', {
								name: `${node.name} (${counter})`,
								extension: node.extension,
							})
						) {
							counter++;
						}
						finalName = `${node.name} (${counter})`;
					}

					state.root.children.push({
						...node,
						name: finalName,
						extension: finalExt,
					});
				}
			}
		},
	},
});

export const {
	// search
	setSearchQuery,
	setSearchMode,
	setMatchCase,
	setExtFilters,
	clearSearch,

	// hex view
	toggleHexView,

	// existing
	setActiveFile,
	openFile,
	closeFile,
	togglePinFile,
	updateFileContent,
	createFile,
	createFolder,
	renameNode,
	deleteNode,
	importFolder,
	importNodes,
} = fsSlice.actions;

export default fsSlice.reducer;
