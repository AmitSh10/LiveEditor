import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActiveFileId, selectOpenFiles } from '../fs/fsSelectors';
import { closeFile, setActiveFile } from '../fs/fsSlice';

export function TabsBar() {
	const dispatch = useAppDispatch();
	const activeId = useAppSelector(selectActiveFileId);
	const openFiles = useAppSelector(selectOpenFiles);

	if (openFiles.length === 0) return null;

	return (
		<div className="shrink-0 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
			<div className="flex items-center gap-1 px-2 py-1">
				{openFiles.map((f) => {
					const ext = (f.extension ?? '').trim();
					const label = ext ? `${f.name}.${ext}` : f.name;
					const isActive = f.id === activeId;

					return (
						<div
							key={f.id}
							className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer select-none whitespace-nowrap
								${
									isActive
										? 'bg-slate-800 text-white'
										: 'bg-slate-900/40 text-slate-300 hover:bg-slate-800/60'
								}
							`}
							onClick={() => dispatch(setActiveFile(f.id))}
							title={label}
						>
							<span className="text-sm">{label}</span>

							<button
								type="button"
								className={`text-xs px-1 rounded hover:bg-black/20 ${
									isActive
										? 'text-slate-200'
										: 'text-slate-400'
								}`}
								onClick={(e) => {
									e.stopPropagation();
									dispatch(closeFile({ id: f.id }));
								}}
								title="Close"
							>
								✕
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
