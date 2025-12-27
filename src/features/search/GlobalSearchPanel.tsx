import { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
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

function normalizeExtLabel(ext: string) {
	return ext.startsWith('.') ? ext : `.${ext}`;
}

export function GlobalSearchPanel() {
	const dispatch = useAppDispatch();

	const { query, mode, matchCase, extFilters } =
		useAppSelector(selectSearchState);
	const allExts = useAppSelector(selectAllExtensions);
	const results = useAppSelector(selectGlobalSearchResults);

	const [extOpen, setExtOpen] = useState(false);

	const extSet = useMemo(
		() => new Set((extFilters ?? []).map((x) => x.toLowerCase())),
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
					className="w-full text-sm px-2 py-1 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
				/>

				<div className="flex items-center gap-2">
					<select
						value={mode}
						onChange={(e) =>
							onSetMode(e.target.value as SearchMode)
						}
						className="text-sm px-2 py-1 rounded bg-slate-900 border border-slate-700"
					>
						<option value="all">All</option>
						<option value="names">Names only</option>
						<option value="content">Content only</option>
					</select>

					<label className="text-xs flex items-center gap-2 select-none">
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
						className="w-full text-left text-sm px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800"
						onClick={() => setExtOpen((v) => !v)}
					>
						{extLabel}
					</button>

					{extOpen && (
						<div className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded border border-slate-700 bg-slate-950 shadow">
							<div className="p-2 text-xs text-slate-400">
								Filter applies to{' '}
								<span className="text-slate-200">
									files only
								</span>
							</div>

							{allExts.length === 0 ? (
								<div className="px-3 pb-3 text-xs text-slate-500">
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
												className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-900 text-sm"
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

			{/* Results: fill remaining height */}
			<div className="mt-3 flex-1 min-h-0 overflow-auto pr-1">
				{results.length === 0 ? (
					<div className="text-xs text-slate-500">No matches.</div>
				) : (
					<ul className="space-y-1">
						{results.map((r, idx) => {
							if (r.kind === 'name') {
								return (
									<li key={`${r.kind}-${r.id}-${idx}`}>
										<button
											className="w-full text-left text-sm px-2 py-1 rounded hover:bg-slate-900"
											onClick={() => {
												if (r.nodeType === 'file') {
													dispatch(
														openFile({
															id: r.id,
															setActive: true,
														})
													);
												}
											}}
											title={r.path}
										>
											<span className="text-slate-100">
												{r.name}
											</span>
										</button>
									</li>
								);
							}

							return (
								<li
									key={`${r.kind}-${r.fileId}-${r.line}-${r.column}-${idx}`}
								>
									<button
										className="w-full text-left px-2 py-1 rounded hover:bg-slate-900"
										onClick={() =>
											dispatch(
												openFile({
													id: r.fileId,
													setActive: true,
												})
											)
										}
									>
										<div className="text-xs text-slate-400">
											{r.path}:{r.line}:{r.column}
										</div>
										<div className="text-sm text-slate-100">
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
