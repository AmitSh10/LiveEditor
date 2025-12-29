import { configureStore, type Middleware } from '@reduxjs/toolkit';
import workspaceReducer from '../features/workspace/workspaceSlice';
import themeReducer from '../features/theme/themeSlice';
import { saveWorkspace } from '../features/workspace/workspacePersistence';

const persistMiddleware: Middleware = (api) => (next) => (action) => {
	const result = next(action);

	// Don't persist on theme actions (handled separately)
	const actionType = typeof action === 'object' && action !== null ? (action as any).type : '';
	const shouldSkipPersist = actionType && actionType.startsWith('theme/');

	if (!shouldSkipPersist) {
		saveWorkspace(api.getState().workspace);
	}

	return result;
};

export const store = configureStore({
	reducer: {
		workspace: workspaceReducer,
		theme: themeReducer,
	},
	middleware: (getDefault) => getDefault().concat(persistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
