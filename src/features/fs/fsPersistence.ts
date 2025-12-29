import type { FSState } from './fsSlice';

const KEY = 'live-editor-fs';

// Debounce timer for saving to localStorage
let saveTimer: NodeJS.Timeout | null = null;
const SAVE_DELAY = 1000; // Save 1 second after last change

export function saveFS(state: FSState) {
	// Clear any pending save
	if (saveTimer) {
		clearTimeout(saveTimer);
	}

	// Schedule a new save
	saveTimer = setTimeout(() => {
		localStorage.setItem(KEY, JSON.stringify(state));
		saveTimer = null;
	}, SAVE_DELAY);
}

export function loadFS(): FSState | null {
	const raw = localStorage.getItem(KEY);
	return raw ? JSON.parse(raw) : null;
}
