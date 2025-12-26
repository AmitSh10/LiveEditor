import type { RootState } from '../../app/store';
import { findFileById } from './fsUtils';

export const selectActiveFile = (state: RootState) => {
	const id = state.fs.activeFileId;
	if (!id) return null;
	return findFileById(state.fs.root, id);
};
