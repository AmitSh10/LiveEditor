import type { FSState } from './fsSlice';

const KEY = 'live-editor-fs';

export function saveFS(state: FSState) {
	localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadFS(): FSState | null {
	const raw = localStorage.getItem(KEY);
	return raw ? JSON.parse(raw) : null;
}
