import { useCallback, useState } from 'react';
import type { FSNode, FolderNode, FileNode } from '../../types/fs';
import { createFile, createFolder, renameNode, deleteNode } from '../workspace/workspaceSlice';

type EditMode = 'rename' | 'newFile' | 'newFolder';

export type EditingState = null | {
	mode: EditMode;
	/** rename => nodeId, create => parentFolderId */
	targetId: string;
	value: string;
	/** snapshot for blur-save logic */
	initialValue: string;
	error?: string | null;
};

function displayName(node: FSNode) {
	if (node.type === 'folder') return node.name;
	return node.extension ? `${node.name}.${node.extension}` : node.name;
}

// ".env" => keep whole as name, no ext
function parseFileNameUI(
	input: string
): { name: string; extension: string } | null {
	const clean = (input ?? '').trim();
	if (!clean) return null;

	if (clean.startsWith('.') && clean.indexOf('.', 1) === -1) {
		return { name: clean, extension: '' };
	}

	const lastDot = clean.lastIndexOf('.');
	if (lastDot > 0 && lastDot < clean.length - 1) {
		return {
			name: clean.slice(0, lastDot).trim(),
			extension: clean.slice(lastDot + 1).trim(),
		};
	}

	return { name: clean, extension: '' };
}

function findNode(root: FSNode, id: string): FSNode | null {
	if (root.id === id) return root;
	if (root.type === 'folder') {
		for (const c of root.children) {
			const hit = findNode(c, id);
			if (hit) return hit;
		}
	}
	return null;
}

function findParentFolder(root: FSNode, childId: string): FolderNode | null {
	if (root.type === 'folder') {
		for (const c of root.children) {
			if (c.id === childId) return root;
			const hit = findParentFolder(c, childId);
			if (hit) return hit;
		}
	}
	return null;
}

function findFolder(root: FSNode, folderId: string): FolderNode | null {
	const n = findNode(root, folderId);
	return n && n.type === 'folder' ? (n as FolderNode) : null;
}

function folderHasFolderConflict(
	folder: FolderNode,
	name: string,
	exceptId?: string
) {
	return folder.children.some(
		(c) => c.type === 'folder' && c.name === name && c.id !== exceptId
	);
}

function folderHasFileConflict(
	folder: FolderNode,
	name: string,
	extension: string,
	exceptId?: string
) {
	return folder.children.some((c) => {
		if (c.id === exceptId) return false;
		if (c.type !== 'file') return false;
		const f = c as FileNode;
		return f.name === name && (f.extension ?? '') === (extension ?? '');
	});
}

type Dispatch = (action: any) => void;

type Params = {
	root: FSNode;
	rootId: string;
	dispatch: Dispatch;
	ensureExpanded: (folderId: string) => void;
	/** optional: close menus etc when committing */
	afterCommit?: () => void;
};

/**
 * Inline rename/create state + business rules.
 * Behavior matches the previous FileTree.tsx implementation.
 */
export function useInlineRename({
	root,
	rootId,
	dispatch,
	ensureExpanded,
	afterCommit,
}: Params) {
	const [editing, setEditing] = useState<EditingState>(null);

	const cancelEditing = useCallback(() => setEditing(null), []);

	const beginRename = useCallback(
		(node: FSNode) => {
			if (node.id === rootId) return;
			const v = displayName(node);
			setEditing({
				mode: 'rename',
				targetId: node.id,
				value: v,
				initialValue: v,
				error: null,
			});
		},
		[rootId]
	);

	const beginNewFile = useCallback(
		(parentFolderId: string) => {
			ensureExpanded(parentFolderId);
			setEditing({
				mode: 'newFile',
				targetId: parentFolderId,
				value: '',
				initialValue: '',
				error: null,
			});
		},
		[ensureExpanded]
	);

	const beginNewFolder = useCallback(
		(parentFolderId: string) => {
			ensureExpanded(parentFolderId);
			setEditing({
				mode: 'newFolder',
				targetId: parentFolderId,
				value: '',
				initialValue: '',
				error: null,
			});
		},
		[ensureExpanded]
	);

	const confirmDelete = useCallback(
		(node: FSNode) => {
			if (node.id === rootId) return;
			const ok = window.confirm(`Delete "${displayName(node)}"?`);
			if (!ok) return;
			dispatch(deleteNode({ id: node.id }));
			setEditing(null);
			afterCommit?.();
		},
		[afterCommit, dispatch, rootId]
	);

	const commitEditing = useCallback(() => {
		if (!editing) return;

		const raw = (editing.value ?? '').trim();
		if (!raw) {
			setEditing({ ...editing, error: 'Name is required.' });
			return;
		}

		// create modes => targetId is parent folder
		if (editing.mode === 'newFile' || editing.mode === 'newFolder') {
			const parent = findFolder(root, editing.targetId);
			if (!parent) {
				setEditing({ ...editing, error: 'Folder not found.' });
				return;
			}

			if (editing.mode === 'newFolder') {
				if (folderHasFolderConflict(parent, raw)) {
					setEditing({
						...editing,
						error: 'A folder with this name already exists.',
					});
					return;
				}
				dispatch(
					createFolder({ parentFolderId: parent.id, name: raw })
				);
				setEditing(null);
				afterCommit?.();
				return;
			}

			const parsed = parseFileNameUI(raw);
			if (!parsed || !parsed.name) {
				setEditing({ ...editing, error: 'Invalid file name.' });
				return;
			}
			if (folderHasFileConflict(parent, parsed.name, parsed.extension)) {
				setEditing({
					...editing,
					error: 'A file with this name already exists.',
				});
				return;
			}

			dispatch(
				createFile({
					parentFolderId: parent.id,
					filename: raw,
					content: '',
					setActive: true,
				})
			);
			setEditing(null);
			afterCommit?.();
			return;
		}

		// rename mode
		const target = findNode(root, editing.targetId);
		if (!target) {
			setEditing({ ...editing, error: 'Item no longer exists.' });
			return;
		}

		const parent = findParentFolder(root, target.id);
		if (!parent) {
			setEditing({ ...editing, error: 'Parent folder not found.' });
			return;
		}

		if (target.type === 'folder') {
			if (folderHasFolderConflict(parent, raw, target.id)) {
				setEditing({
					...editing,
					error: 'A folder with this name already exists.',
				});
				return;
			}
			dispatch(renameNode({ id: target.id, newName: raw }));
			setEditing(null);
			afterCommit?.();
			return;
		}

		const parsed = parseFileNameUI(raw);
		if (!parsed) {
			setEditing({ ...editing, error: 'Invalid file name.' });
			return;
		}
		if (
			folderHasFileConflict(
				parent,
				parsed.name,
				parsed.extension,
				target.id
			)
		) {
			setEditing({
				...editing,
				error: 'A file with this name already exists.',
			});
			return;
		}

		dispatch(renameNode({ id: target.id, newName: raw }));
		setEditing(null);
		afterCommit?.();
	}, [afterCommit, dispatch, editing, root]);

	const onKeyForInline = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter') commitEditing();
			if (e.key === 'Escape') cancelEditing();
		},
		[cancelEditing, commitEditing]
	);

	/**
	 * Blur behavior:
	 * - empty => revert (cancel)
	 * - unchanged => close
	 * - changed => save (commit)
	 */
	const onBlurSmart = useCallback(() => {
		if (!editing) return;

		const raw = (editing.value ?? '').trim();
		if (!raw) {
			setEditing(null);
			return;
		}

		const initialTrim = (editing.initialValue ?? '').trim();
		if (raw === initialTrim) {
			setEditing(null);
			return;
		}

		commitEditing();
	}, [commitEditing, editing]);

	return {
		editing,
		setEditing,
		beginRename,
		beginNewFile,
		beginNewFolder,
		confirmDelete,
		commitEditing,
		cancelEditing,
		onKeyForInline,
		onBlurSmart,
		displayName,
	} as const;
}
