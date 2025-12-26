import { useEffect, useRef, useState } from 'react';

export type MenuState = null | {
	nodeId: string;
	nodeType: 'file' | 'folder';
	x: number;
	y: number;
};

export function useContextMenu() {
	const [menu, setMenu] = useState<MenuState>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const onDown = (e: MouseEvent) => {
			if (!menu) return;
			const target = e.target as Node | null;
			if (menuRef.current && target && menuRef.current.contains(target))
				return;
			setMenu(null);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setMenu(null);
		};
		window.addEventListener('mousedown', onDown);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('mousedown', onDown);
			window.removeEventListener('keydown', onKey);
		};
	}, [menu]);

	const openMenuAt = (
		nodeId: string,
		nodeType: 'file' | 'folder',
		x: number,
		y: number
	) => {
		setMenu({ nodeId, nodeType, x, y });
	};

	const closeMenu = () => setMenu(null);

	return { menu, setMenu, menuRef, openMenuAt, closeMenu } as const;
}
