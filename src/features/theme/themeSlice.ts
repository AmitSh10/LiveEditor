import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';

export type ThemeState = {
	theme: Theme;
};

// Load theme from localStorage
const loadTheme = (): Theme => {
	const saved = localStorage.getItem('live-editor-theme');
	if (saved === 'light' || saved === 'dark') {
		return saved;
	}
	// Default to dark theme
	return 'dark';
};

const initialState: ThemeState = {
	theme: loadTheme(),
};

const themeSlice = createSlice({
	name: 'theme',
	initialState,
	reducers: {
		setTheme(state, action: PayloadAction<Theme>) {
			state.theme = action.payload;
			localStorage.setItem('live-editor-theme', action.payload);

			// Update document class for Tailwind dark mode
			if (action.payload === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		},
		toggleTheme(state) {
			const newTheme = state.theme === 'dark' ? 'light' : 'dark';
			state.theme = newTheme;
			localStorage.setItem('live-editor-theme', newTheme);

			// Update document class for Tailwind dark mode
			if (newTheme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		},
	},
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
