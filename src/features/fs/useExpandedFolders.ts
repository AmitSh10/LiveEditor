import { useEffect, useState } from 'react';

const LS_EXPANDED_KEY = 'fs.expanded.v1';

/**
 * Expanded folders UI state (persisted).
 * Root is always treated as expanded by the renderer.
 */
export function useExpandedFolders() {
	const [expanded, setExpanded] = useState<Set<string>>(() => {
		try {
			const raw = localStorage.getItem(LS_EXPANDED_KEY);
			if (!raw) return new Set<string>();
			const arr = JSON.parse(raw) as string[];
			return new Set(arr.filter(Boolean));
		} catch {
			return new Set<string>();
		}
	});

	useEffect(() => {
		try {
			localStorage.setItem(
				LS_EXPANDED_KEY,
				JSON.stringify(Array.from(expanded))
			);
		} catch {
			// ignore
		}
	}, [expanded]);

	const toggleExpanded = (folderId: string) => {
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(folderId)) next.delete(folderId);
			else next.add(folderId);
			return next;
		});
	};

	const ensureExpanded = (folderId: string, rootId?: string) => {
		if (rootId && folderId === rootId) return;
		setExpanded((prev) => new Set(prev).add(folderId));
	};

	return { expanded, toggleExpanded, ensureExpanded } as const;
}
