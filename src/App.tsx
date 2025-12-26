import { useAppSelector } from './app/hooks';

import { FileTree } from './features/fs/FileTree';
import { EditorPanel } from './features/editor/EditorPanel';
import { exportAsZip } from './features/fs/exportZip';

export default function App() {
	const root = useAppSelector((s) => s.fs.root);

	return (
		<div className="h-screen bg-slate-950 text-slate-100 grid grid-cols-[280px_1fr]">
			<aside className="border-r border-slate-800 p-3">
				<div className="font-semibold mb-2">Files</div>
				<FileTree />
				<button
					className="mt-3 text-sm px-2 py-1 bg-slate-800 rounded hover:bg-slate-700"
					onClick={() => exportAsZip(root)}
				>
					Download ZIP
				</button>
			</aside>

			<main className="p-3 h-screen flex flex-col">
				<div className="font-semibold mb-2">Editor</div>
				<div className="flex-1 min-h-0">
					<EditorPanel />
				</div>
			</main>
		</div>
	);
}
