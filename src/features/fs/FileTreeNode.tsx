import React, { useLayoutEffect, useRef } from 'react';
import type { FSNode } from '../../types/fs';
import type { EditingState } from './useInlineRename';

function SmallBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const { className = '', ...rest } = props;
	return (
		<button
			type="button"
			className={
				'text-sm font-bold px-2.5 py-1.5 rounded-md leading-none ' +
				'bg-slate-800/80 text-slate-100 ' +
				'border border-slate-600/70 ' +
				'shadow-sm shadow-black/30 ' +
				'hover:bg-slate-700/80 hover:border-slate-500 ' +
				'focus:outline-none focus:ring-2 focus:ring-slate-400/40 ' +
				className
			}
			{...rest}
		/>
	);
}

/**
 * Keeps caret stable in a controlled input even if parent re-renders.
 */
function StableCaretInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
	const { onChange, ...rest } = props;

	const inputRef = useRef<HTMLInputElement | null>(null);
	const caretRef = useRef<{ start: number; end: number } | null>(null);

	useLayoutEffect(() => {
		const el = inputRef.current;
		const c = caretRef.current;
		if (!el || !c) return;
		try {
			el.setSelectionRange(c.start, c.end);
		} catch {
			// ignore
		}
	}, [rest.value]);

	return (
		<input
			ref={inputRef}
			{...rest}
			onChange={(e) => {
				const el = e.currentTarget;
				caretRef.current = {
					start: el.selectionStart ?? el.value.length,
					end: el.selectionEnd ?? el.value.length,
				};
				onChange?.(e);
			}}
		/>
	);
}

function displayName(node: FSNode) {
	if (node.type === 'folder') return node.name;
	return node.extension ? `${node.name}.${node.extension}` : node.name;
}

export type FileTreeNodeProps = {
	node: FSNode;
	rootId: string;
	activeId: string | null;
	expanded: Set<string>;
	toggleExpanded: (folderId: string) => void;

	editing: EditingState;
	setEditingValue: (value: string) => void;
	onKeyForInline: (e: React.KeyboardEvent) => void;
	onBlurSmart: (e: React.FocusEvent<HTMLInputElement>) => void;

	beginRename: (node: FSNode) => void;
	beginNewFile: (parentFolderId: string) => void;
	beginNewFolder: (parentFolderId: string) => void;
	onSelectFile: (fileId: string) => void;

	openMenuAt: (
		nodeId: string,
		nodeType: 'file' | 'folder',
		x: number,
		y: number
	) => void;
};

export const FileTreeNode = React.memo(function FileTreeNode(
	props: FileTreeNodeProps
) {
	const {
		node,
		rootId,
		activeId,
		expanded,
		toggleExpanded,
		editing,
		setEditingValue,
		onKeyForInline,
		onBlurSmart,
		beginRename,
		beginNewFile,
		beginNewFolder,
		onSelectFile,
		openMenuAt,
	} = props;

	const isRoot = node.id === rootId;

	// ---------- FOLDER ----------
	if (node.type === 'folder') {
		const open = isRoot ? true : expanded.has(node.id);

		const isCreateHere =
			(editing?.mode === 'newFile' || editing?.mode === 'newFolder') &&
			editing.targetId === node.id;

		const isRenamingThis =
			editing?.mode === 'rename' && editing.targetId === node.id;

		return (
			<div className="ml-2">
				<div
					className="group relative flex items-center gap-2 pr-10"
					onContextMenu={(e) => {
						e.preventDefault();
						openMenuAt(node.id, 'folder', e.clientX, e.clientY);
					}}
				>
					<div className="flex items-center gap-2 flex-1 min-w-0">
						<button
							type="button"
							className="text-slate-300 font-medium select-none hover:text-white shrink-0"
							onClick={() => {
								if (!isRoot) toggleExpanded(node.id);
							}}
							title={
								isRoot ? 'Root' : open ? 'Collapse' : 'Expand'
							}
						>
							{/* Keep width stable; root should NOT render 'Files' */}
							{!isRoot && (
								<span className="inline-block w-4 text-center">
									{open ? '▾' : '▸'}
								</span>
							)}
						</button>

						{isRenamingThis && editing ? (
							<div
								className="flex-1 min-w-0"
								onClick={(e) => e.stopPropagation()}
							>
								<StableCaretInput
									autoFocus
									className="w-full text-sm px-2 py-1 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:border-slate-500"
									value={editing.value}
									onChange={(e) =>
										setEditingValue(e.target.value)
									}
									onKeyDown={onKeyForInline}
									onBlur={onBlurSmart}
									placeholder="Folder name"
								/>
								{editing.error ? (
									<div className="text-xs text-red-300 mt-1">
										{editing.error}
									</div>
								) : null}
							</div>
						) : (
							<div className="truncate text-slate-300 font-medium">
								{node.name}
							</div>
						)}
					</div>

					{/* kebab (absolute; no layout shift) */}
					<div
						className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
						onClick={(e) => e.stopPropagation()}
					>
						<SmallBtn
							onClick={(e) => {
								const r = (
									e.currentTarget as HTMLButtonElement
								).getBoundingClientRect();
								openMenuAt(
									node.id,
									'folder',
									r.right,
									r.bottom
								);
							}}
							title="Actions"
						>
							⋯
						</SmallBtn>
					</div>
				</div>

				{/* Inline rename / create (no OK/Cancel, blur rules apply) */}
				{isCreateHere && editing && (
					<div className="ml-6 mt-1">
						<StableCaretInput
							autoFocus
							className="w-full text-sm px-2 py-1 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:border-slate-500"
							value={editing.value}
							onChange={(e) => setEditingValue(e.target.value)}
							onKeyDown={onKeyForInline}
							onBlur={onBlurSmart}
							placeholder={
								editing.mode === 'newFile'
									? 'File name (e.g. notes.md)'
									: 'Folder name'
							}
						/>
						{editing.error ? (
							<div className="text-xs text-red-300 mt-1">
								{editing.error}
							</div>
						) : null}
					</div>
				)}

				{open && (
					<div className="ml-2">
						{node.children.map((c) => (
							<FileTreeNode
								key={c.id}
								{...props}
								node={c}
							/>
						))}
					</div>
				)}
			</div>
		);
	}

	// ---------- FILE ----------
	const isActive = node.id === activeId;
	const name = displayName(node);
	const isRenamingThis =
		editing?.mode === 'rename' && editing.targetId === node.id;

	return (
		<div className="ml-2">
			<div
				className={`group relative flex items-center gap-2 cursor-pointer px-2 py-1 rounded text-sm pr-10
					${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900'}
				`}
				onClick={() => onSelectFile(node.id)}
				onContextMenu={(e) => {
					e.preventDefault();
					openMenuAt(node.id, 'file', e.clientX, e.clientY);
				}}
			>
				{isRenamingThis && editing ? (
					<div
						className="flex-1"
						onClick={(e) => e.stopPropagation()}
					>
						<StableCaretInput
							autoFocus
							className="w-full text-sm px-2 py-1 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:border-slate-500"
							value={editing.value}
							onChange={(e) => setEditingValue(e.target.value)}
							onKeyDown={onKeyForInline}
							onBlur={onBlurSmart}
							placeholder="File name (e.g. readme.md)"
						/>
						{editing.error ? (
							<div className="text-xs text-red-300 mt-1">
								{editing.error}
							</div>
						) : null}
					</div>
				) : (
					<div className="truncate">{name}</div>
				)}

				{/* kebab (absolute; no layout shift) */}
				<div
					className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
					onClick={(e) => e.stopPropagation()}
				>
					<SmallBtn
						onClick={(e) => {
							const r = (
								e.currentTarget as HTMLButtonElement
							).getBoundingClientRect();
							openMenuAt(node.id, 'file', r.right, r.bottom);
						}}
						title="Actions"
					>
						⋯
					</SmallBtn>
				</div>
			</div>
		</div>
	);
});
