import { configureStore, type Middleware } from '@reduxjs/toolkit';
import fsReducer from '../features/fs/fsSlice';
import { saveFS } from '../features/fs/fsPersistence';

const persistMiddleware: Middleware = (api) => (next) => (action) => {
	const result = next(action);
	saveFS(api.getState().fs);
	return result;
};

export const store = configureStore({
	reducer: { fs: fsReducer },
	middleware: (getDefault) => getDefault().concat(persistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
