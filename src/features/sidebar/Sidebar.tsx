import { useState } from 'react';
import { FileTree } from '../fs/FileTree';
import { GlobalSearchPanel } from '../search/GlobalSearchPanel';

type SidebarTab = 'files' | 'search';

export function Sidebar() {
	const [tab, setTab] = useState<SidebarTab>('files');

	return (
		<div className="h-full flex flex-col min-h-0">
			{/* Tab bar */}
			<div className="flex items-center gap-1 border-b border-slate-800 pb-2">
				<button
					className={[
						'px-2 py-1 rounded text-sm',
						tab === 'files'
							? 'bg-slate-800 text-slate-100'
							: 'text-slate-300 hover:bg-slate-900',
					].join(' ')}
					onClick={() => setTab('files')}
					title="Files"
					aria-label="Files"
					aria-pressed={tab === 'files'}
				>
					📁
				</button>

				<button
					className={[
						'px-2 py-1 rounded text-sm',
						tab === 'search'
							? 'bg-slate-800 text-slate-100'
							: 'text-slate-300 hover:bg-slate-900',
					].join(' ')}
					onClick={() => setTab('search')}
					title="Search"
					aria-label="Search"
					aria-pressed={tab === 'search'}
				>
					🔎
				</button>
			</div>

			{/* Panel content */}
			<div className="flex-1 min-h-0 overflow-auto pt-2">
				{tab === 'files' ? <FileTree /> : <GlobalSearchPanel />}
			</div>
		</div>
	);
}
