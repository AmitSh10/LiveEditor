import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActiveFileId, selectOpenFiles } from '../fs/fsSelectors';
import { closeFile, setActiveFile, togglePinFile } from '../fs/fsSlice';
import { getFileIcon } from '../../utils/fileIcons';

export function TabsBar() {
	const dispatch = useAppDispatch();
	const activeId = useAppSelector(selectActiveFileId);
	const openFiles = useAppSelector(selectOpenFiles);
	const pinnedFileIds = useAppSelector((s) => s.fs.pinnedFileIds);

	if (openFiles.length === 0) return null;

	// Sort files: pinned first, then unpinned
	const sortedFiles = [...openFiles].sort((a, b) => {
		const aIsPinned = pinnedFileIds.includes(a.id);
		const bIsPinned = pinnedFileIds.includes(b.id);
		if (aIsPinned && !bIsPinned) return -1;
		if (!aIsPinned && bIsPinned) return 1;
		return 0;
	});

	return (
		<div className="shrink-0 border-b border-slate-800 bg-slate-950/40 overflow-x-auto">
			<div className="flex items-center gap-1 px-2 py-1">
				{sortedFiles.map((f) => {
					const ext = (f.extension ?? '').trim();
					const label = ext ? `${f.name}.${ext}` : f.name;
					const isActive = f.id === activeId;
					const iconConfig = getFileIcon(ext);
					const isPinned = pinnedFileIds.includes(f.id);

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
							<span className={`text-sm ${iconConfig.color}`}>
								{iconConfig.icon}
							</span>
							<span className="text-sm">{label}</span>

							{/* Pin button */}
							<button
								type="button"
								className={`text-xs px-1 rounded hover:bg-black/20 ${
									isActive
										? 'text-slate-200'
										: 'text-slate-400'
								}`}
								onClick={(e) => {
									e.stopPropagation();
									dispatch(togglePinFile({ id: f.id }));
								}}
								title={isPinned ? 'Unpin' : 'Pin'}
							>
								{isPinned ? '📌' : '📍'}
							</button>

							{/* Close button */}
							<button
								type="button"
								className={`text-xs px-1 rounded hover:bg-black/20 ${
									isActive
										? 'text-slate-200'
										: 'text-slate-400'
								} ${isPinned ? 'opacity-50 cursor-not-allowed' : ''}`}
								onClick={(e) => {
									e.stopPropagation();
									if (!isPinned) {
										dispatch(closeFile({ id: f.id }));
									}
								}}
								title={isPinned ? 'Pinned (cannot close)' : 'Close'}
								disabled={isPinned}
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
