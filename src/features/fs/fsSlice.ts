import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FolderNode, FSNode } from '../../types/fs';
import { createInitialFS } from './fsStore';
import { loadFS } from './fsPersistence';

export type FSState = {
	root: FolderNode;
	activeFileId: string | null;

	// Tabs: ordered list of open file ids
	openFileIds: string[];
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
	  }
	: {
			root: initial.root,
			activeFileId: initial.activeFileId,
			openFileIds: initial.activeFileId ? [initial.activeFileId] : [],
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
		closeFile(state, action: PayloadAction<{ id: string }>) {
			const { id } = action.payload;
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
	},
});

export const {
	setActiveFile,
	openFile,
	closeFile,
	updateFileContent,
	createFile,
	createFolder,
	renameNode,
	deleteNode,
} = fsSlice.actions;

export default fsSlice.reducer;
