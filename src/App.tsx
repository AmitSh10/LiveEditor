import { useState, useRef, useEffect } from 'react';
import { useAppSelector } from './app/hooks';

import { Sidebar } from './features/sidebar/Sidebar';
import { EditorPanel } from './features/editor/EditorPanel';
import { exportAsZip } from './features/fs/exportZip';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 280;

export default function App() {
	const root = useAppSelector((s) => s.fs.root);
	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
	const [isResizing, setIsResizing] = useState(false);
	const startXRef = useRef(0);
	const startWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing) return;

			const delta = e.clientX - startXRef.current;
			const newWidth = Math.min(
				MAX_SIDEBAR_WIDTH,
				Math.max(MIN_SIDEBAR_WIDTH, startWidthRef.current + delta)
			);
			setSidebarWidth(newWidth);
		};

		const handleMouseUp = () => {
			setIsResizing(false);
		};

		if (isResizing) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
		}

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [isResizing]);

	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		startXRef.current = e.clientX;
		startWidthRef.current = sidebarWidth;
	};

	return (
		<div className="h-screen bg-slate-950 text-slate-100 flex">
			<aside
				className="border-r border-slate-800 p-3 h-full min-h-0 flex flex-col relative"
				style={{ width: `${sidebarWidth}px` }}
			>
				<div className="flex-1 min-h-0">
					<Sidebar />
				</div>

				<button
					className="mt-3 text-sm px-2 py-1 bg-slate-800 rounded hover:bg-slate-700"
					onClick={() => exportAsZip(root)}
				>
					Download ZIP
				</button>

				{/* Resize handle */}
				<div
					className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-slate-600 transition-colors group"
					onMouseDown={handleMouseDown}
				>
					<div className="absolute inset-y-0 -left-1 -right-1" />
				</div>
			</aside>

			<main className="flex-1 p-3 h-screen flex flex-col overflow-hidden">
				<div className="font-semibold mb-2">Editor</div>
				<div className="flex-1 min-h-0">
					<EditorPanel />
				</div>
			</main>
		</div>
	);
}
