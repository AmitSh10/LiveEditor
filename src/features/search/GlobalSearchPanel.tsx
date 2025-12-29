import { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
	selectActiveFileId,
	selectAllExtensions,
	selectGlobalSearchResults,
	selectSearchState,
} from '../fs/fsSelectors';
import {
	setExtFilters,
	setMatchCase,
	setSearchMode,
	setSearchQuery,
	type SearchMode,
} from '../fs/fsSlice';
import { openFile } from '../fs/fsSlice';
import { focusActiveEditor, revealInActiveEditor } from '../editor/EditorPanel';

function normalizeExtLabel(ext: string) {
	return ext.startsWith('.') ? ext : `.${ext}`;
}

// small helper: run after current click finishes + React settles
function defer(fn: () => void) {
	setTimeout(fn, 0);
}

export function GlobalSearchPanel() {
	const dispatch = useAppDispatch();

	const { query, mode, matchCase, extFilters } =
		useAppSelector(selectSearchState);

	const activeFileId = useAppSelector(selectActiveFileId);
	const allExts = useAppSelector(selectAllExtensions);
	const results = useAppSelector(selectGlobalSearchResults);

	const [extOpen, setExtOpen] = useState(false);

	const extSet = useMemo(
		() => new Set((extFilters ?? []).map((x) => String(x).toLowerCase())),
		[extFilters]
	);

	const extLabel = useMemo(() => {
		if (!extFilters || extFilters.length === 0) return 'All extensions';
		return extFilters.map(normalizeExtLabel).join(', ');
	}, [extFilters]);

	const onToggleExt = (ext: string) => {
		const e = ext.toLowerCase();
		const next = new Set(extSet);
		if (next.has(e)) next.delete(e);
		else next.add(e);
		dispatch(setExtFilters(Array.from(next)));
	};

	const onSetMode = (m: SearchMode) => dispatch(setSearchMode(m));

	return (
		<div className="h-full flex flex-col min-h-0">
			<div className="font-semibold mb-2">Global Search</div>

			<div className="space-y-2">
				<input
					value={query}
					onChange={(e) => dispatch(setSearchQuery(e.target.value))}
					placeholder="Search…"
					className="w-full text-sm px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
				/>

				<div className="flex items-center gap-2">
					<select
						value={mode}
						onChange={(e) =>
							onSetMode(e.target.value as SearchMode)
						}
						className="text-sm px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
					>
						<option value="all">All</option>
						<option value="names">Names only</option>
						<option value="content">Content only</option>
					</select>

					<label className="text-xs flex items-center gap-2 select-none text-slate-700 dark:text-slate-300">
						<input
							type="checkbox"
							checked={matchCase}
							onChange={(e) =>
								dispatch(setMatchCase(e.target.checked))
							}
						/>
						Match case
					</label>
				</div>

				{/* Extension multi-picker */}
				<div className="relative">
					<button
						type="button"
						className="w-full text-left text-sm px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
						onClick={() => setExtOpen((v) => !v)}
					>
						{extLabel}
					</button>

					{extOpen && (
						<div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-lg">
							<div className="p-2 text-xs text-slate-600 dark:text-slate-400">
								Filter applies to{' '}
								<span className="text-slate-900 dark:text-slate-200">
									files only
								</span>
							</div>

							{allExts.length === 0 ? (
								<div className="px-3 pb-3 text-xs text-slate-500 dark:text-slate-500">
									No extensions found.
								</div>
							) : (
								<div className="px-2 pb-2">
									{allExts.map((ext) => {
										const checked = extSet.has(
											ext.toLowerCase()
										);
										return (
											<label
												key={ext}
												className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 text-sm text-slate-900 dark:text-slate-100"
											>
												<input
													type="checkbox"
													checked={checked}
													onChange={() =>
														onToggleExt(ext)
													}
												/>
												<span>
													{normalizeExtLabel(ext)}
												</span>
											</label>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Results */}
			<div className="mt-3 flex-1 min-h-0 overflow-auto pr-1">
				{results.length === 0 ? (
					<div className="text-xs text-slate-500 dark:text-slate-500">No matches.</div>
				) : (
					<ul className="space-y-1">
						{results.map((r, idx) => {
							if (r.kind === 'name') {
								return (
									<li key={`${r.kind}-${r.id}-${idx}`}>
										<button
											className="w-full text-left text-sm px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900"
											onClick={() => {
												if (r.nodeType !== 'file')
													return;

												dispatch(
													openFile({
														id: r.id,
														setActive: true,
													})
												);
												defer(() =>
													focusActiveEditor()
												);
											}}
											title={r.path}
										>
											<span className="text-slate-900 dark:text-slate-100">
												{r.name}
											</span>
										</button>
									</li>
								);
							}

							// content match
							return (
								<li
									key={`${r.kind}-${r.fileId}-${r.line}-${r.column}-${idx}`}
								>
									<button
										className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900"
										onClick={() => {
											// ✅ If it's already the active file: just jump now
											if (activeFileId === r.fileId) {
												defer(() =>
													revealInActiveEditor(
														r.line,
														r.column
													)
												);
												return;
											}

											// ✅ Otherwise: open, then jump
											dispatch(
												openFile({
													id: r.fileId,
													setActive: true,
												})
											);
											defer(() =>
												revealInActiveEditor(
													r.line,
													r.column
												)
											);
										}}
									>
										<div className="text-xs text-slate-600 dark:text-slate-400">
											{r.path}:{r.line}:{r.column}
										</div>
										<div className="text-sm text-slate-900 dark:text-slate-100 font-mono">
											{r.preview}
										</div>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}
