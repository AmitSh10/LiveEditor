import type { RootState } from '../../app/store';
import { findFileById } from './fsUtils';
import type { FileNode } from '../../types/fs';

const isFileNode = (x: FileNode | null): x is FileNode => x !== null;

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
