import { configureStore, type Middleware } from '@reduxjs/toolkit';
import workspaceReducer from '../features/workspace/workspaceSlice';
import filesystemWorkspaceReducer from '../features/workspace/filesystemWorkspaceSlice';
import themeReducer from '../features/theme/themeSlice';
import { saveWorkspace } from '../features/workspace/workspacePersistence';

// Check if we should use filesystem mode
const USE_FILESYSTEM_MODE = true; // Toggle between old (false) and new (true) architecture

const persistMiddleware: Middleware = (api) => (next) => (action) => {
	const result = next(action);

	// Don't persist on theme actions (handled separately)
	const actionType = typeof action === 'object' && action !== null ? (action as any).type : '';
	const shouldSkipPersist = actionType && actionType.startsWith('theme/');

	// In filesystem mode, don't persist workspace to localStorage (handled by .leditor files)
	if (!shouldSkipPersist && !USE_FILESYSTEM_MODE) {
		saveWorkspace(api.getState().workspace);
	}

	return result;
};

export const store = configureStore({
	reducer: {
		workspace: workspaceReducer,
		filesystemWorkspace: filesystemWorkspaceReducer,
		theme: themeReducer,
	},
	middleware: (getDefault) => getDefault().concat(persistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
