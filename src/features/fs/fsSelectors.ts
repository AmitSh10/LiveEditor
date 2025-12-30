// This file re-exports workspace selectors for backward compatibility
// with components that still import from fsSelectors

export {
	selectActiveFile,
	selectOpenFiles,
	selectActiveFileId,
	selectOpenFileIds,
	selectSearchState,
	selectAllExtensions,
	selectGlobalSearchResults,
} from '../workspace/workspaceSelectors';

export type {
	NameSearchResult,
	ContentSearchResult,
	GlobalSearchResult,
} from '../workspace/workspaceSelectors';
