import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FolderNode } from '../../types/fs';
import { createInitialFS } from './fsStore';
import { loadFS } from './fsPersistence';

export type FSState = { root: FolderNode; activeFileId: string | null };

const initial = createInitialFS();

const persisted = loadFS();

const initialState: FSState = persisted ?? {
	root: initial.root,
	activeFileId: initial.activeFileId,
};

const fsSlice = createSlice({
	name: 'fs',
	initialState,
	reducers: {
		setActiveFile(state, action: PayloadAction<string | null>) {
			state.activeFileId = action.payload;
		},
		updateFileContent(
			state,
			action: PayloadAction<{ id: string; content: string }>
		) {
			const { id, content } = action.payload;

			const update = (node: any): boolean => {
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
	},
});

export const { setActiveFile, updateFileContent } = fsSlice.actions;
export default fsSlice.reducer;
