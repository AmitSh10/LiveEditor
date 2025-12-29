import { configureStore, type Middleware } from '@reduxjs/toolkit';
import fsReducer from '../features/fs/fsSlice';
import themeReducer from '../features/theme/themeSlice';
import { saveFS } from '../features/fs/fsPersistence';

const persistMiddleware: Middleware = (api) => (next) => (action) => {
	const result = next(action);

	// Don't persist on search-related or theme actions (they're transient or handled separately)
	const actionType = typeof action === 'object' && action !== null ? (action as any).type : '';
	const shouldSkipPersist = actionType && (
		actionType.startsWith('fs/setSearch') ||
		actionType.startsWith('fs/setMatch') ||
		actionType.startsWith('fs/setExt') ||
		actionType.startsWith('theme/')
	);

	if (!shouldSkipPersist) {
		saveFS(api.getState().fs);
	}

	return result;
};

export const store = configureStore({
	reducer: {
		fs: fsReducer,
		theme: themeReducer,
	},
	middleware: (getDefault) => getDefault().concat(persistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
