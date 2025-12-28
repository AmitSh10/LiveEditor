import Editor from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

import type { editor as MonacoEditor } from 'monaco-editor';
import type * as Monaco from 'monaco-editor';

import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectActiveFile } from '../fs/fsSelectors';
import { updateFileContent } from '../fs/fsSlice';
import { toolbarTemplates } from '../templates/toolbarTemplates';
import { parseSnippet } from '../templates/snippetEngine';
import { PreviewPanel } from '../preview/PreviewPanel';
import { TabsBar } from './TabsBar';

const langFromExt = (ext: string) => {
	if (ext === 'md') return 'markdown';
	if (ext === 'js') return 'javascript';
	if (ext === 'ts') return 'typescript';
	if (ext === 'py') return 'python';
	if (ext === 'cs') return 'csharp';
	return 'plaintext';
};

// ---------------------
// Focus / Reveal bridge
// ---------------------
let __focusEditor: null | (() => void) = null;
let __revealInEditor: null | ((line: number, column: number) => void) = null;

// ---------------------
// Pending reveal queue
// (so reveal happens AFTER file becomes active in editor)
// ---------------------
type PendingReveal = { fileId: string; line: number; column: number } | null;
let __pendingReveal: PendingReveal = null;
let __pendingFocusFileId: string | null = null;

/** Ask editor to focus once the given file becomes active. */
export function requestFocusForFile(fileId: string) {
	__pendingFocusFileId = fileId;
}

/** Ask editor to reveal a hit once the given file becomes active. */
export function requestRevealForFile(
	fileId: string,
	line: number,
	column: number
) {
	__pendingReveal = { fileId, line, column };
}

/** Keep old helpers if you still use them elsewhere */
export function focusActiveEditor() {
	__focusEditor?.();
}
export function revealInActiveEditor(line: number, column: number) {
	__revealInEditor?.(line, column);
}

export function EditorPanel() {
	const dispatch = useAppDispatch();
	const file = useAppSelector(selectActiveFile);

	const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<typeof Monaco | null>(null);

	type SnippetSession = {
		ids: string[];
		index: number;
		baseOffset: number; // insertion start offset (before executeEdits)
		textLength: number; // finalText.length
	};

	const snippetSessionRef = useRef<SnippetSession | null>(null);

	// Cleanup bridge on unmount
	useEffect(() => {
		return () => {
			__focusEditor = null;
			__revealInEditor = null;
			__pendingReveal = null;
			__pendingFocusFileId = null;
		};
	}, []);

	if (!file) return <div className="text-slate-400">Select a file…</div>;

	// Check if file is an image
	const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico']);
	const isImage = imageExtensions.has(file.extension.toLowerCase());

	const isMarkdown = file.extension === 'md';
	const isHtml = file.extension === 'html' || file.extension === 'htm';
	const buttons = toolbarTemplates[file.extension] ?? [];

	// When active file changes, apply any pending focus/reveal for THAT file.
	useEffect(() => {
		const editor = editorRef.current;
		const model = editor?.getModel();
		if (!editor || !model) return;

		// Focus request for this file
		if (__pendingFocusFileId && __pendingFocusFileId === file.id) {
			__pendingFocusFileId = null;
			// Defer 1 tick to let Monaco settle
			setTimeout(() => {
				editor.focus();
			}, 0);
		}

		// Reveal request for this file
		if (__pendingReveal && __pendingReveal.fileId === file.id) {
			const { line, column } = __pendingReveal;
			__pendingReveal = null;

			// Defer 1–2 ticks because Monaco sometimes needs a moment after value/model updates
			setTimeout(() => {
				try {
					editor.focus();
					editor.setPosition({ lineNumber: line, column });
					editor.revealPositionInCenter({ lineNumber: line, column });

					// Optional: also select the cursor position (no highlight range)
					editor.setSelection({
						startLineNumber: line,
						startColumn: column,
						endLineNumber: line,
						endColumn: column,
					});
				} catch {
					// ignore
				}
			}, 0);
		}
	}, [file.id]);

	const clearSnippetSession = () => {
		const editor = editorRef.current;
		const model = editor?.getModel();
		const session = snippetSessionRef.current;
		if (!editor || !model || !session) return;

		model.deltaDecorations(session.ids, []);
		snippetSessionRef.current = null;
	};

	const endSnippetAtEnd = () => {
		const editor = editorRef.current;
		const model = editor?.getModel();
		const session = snippetSessionRef.current;
		if (!editor || !model || !session) return;

		const endPos = model.getPositionAt(
			session.baseOffset + session.textLength
		);

		editor.setSelection({
			startLineNumber: endPos.lineNumber,
			startColumn: endPos.column,
			endLineNumber: endPos.lineNumber,
			endColumn: endPos.column,
		});

		clearSnippetSession();
	};

	const jumpPlaceholder = (dir: 1 | -1): boolean => {
		const editor = editorRef.current;
		const model = editor?.getModel();
		const session = snippetSessionRef.current;
		if (!editor || !model || !session || session.ids.length === 0)
			return false;

		const nextIndex = session.index + dir;

		if (nextIndex < 0) {
			session.index = 0;
			const r = model.getDecorationRange(session.ids[0]);
			if (!r) {
				clearSnippetSession();
				return true;
			}
			editor.setSelection(r);
			editor.revealRangeInCenter(r);
			return true;
		}

		if (nextIndex >= session.ids.length) {
			endSnippetAtEnd();
			return true;
		}

		const range = model.getDecorationRange(session.ids[nextIndex]);
		if (!range) {
			clearSnippetSession();
			return true;
		}

		session.index = nextIndex;
		editor.setSelection(range);
		editor.revealRangeInCenter(range);
		return true;
	};

	const insert = (template: string) => {
		const editor = editorRef.current;
		if (!editor) return;

		const selection = editor.getSelection();
		const model = editor.getModel();
		if (!selection || !model) return;

		clearSnippetSession();

		const selectedText = model.getValueInRange(selection);
		const hasSelection = selectedText.length > 0;

		let tpl = template;

		if (hasSelection) {
			tpl = tpl.replace(/\$\{1:([^}]+)\}/, () => `\${1:${selectedText}}`);
		}

		const { text, placeholders } = parseSnippet(tpl);

		const lineContent = model.getLineContent(selection.startLineNumber);
		const beforeCursor = lineContent.slice(0, selection.startColumn - 1);
		const needsNewLine = !hasSelection && beforeCursor.trim().length > 0;

		const finalText = needsNewLine ? `\n${text}` : text;

		const baseOffset = model.getOffsetAt(selection.getStartPosition());

		editor.executeEdits('', [
			{ range: selection, text: finalText, forceMoveMarkers: true },
		]);

		const extra = needsNewLine ? 1 : 0;

		const decorations = placeholders.map((p) => {
			const start = model.getPositionAt(baseOffset + p.start + extra);
			const end = model.getPositionAt(baseOffset + p.end + extra);

			return {
				range: {
					startLineNumber: start.lineNumber,
					startColumn: start.column,
					endLineNumber: end.lineNumber,
					endColumn: end.column,
				},
				options: { inlineClassName: 'snippet-ph' },
			};
		});

		const ids = model.deltaDecorations([], decorations);

		if (ids.length > 0) {
			snippetSessionRef.current = {
				ids,
				index: 0,
				baseOffset,
				textLength: finalText.length,
			};

			const first = model.getDecorationRange(ids[0]);
			if (first) editor.setSelection(first);
		} else {
			const endPos = model.getPositionAt(baseOffset + finalText.length);
			editor.setSelection({
				startLineNumber: endPos.lineNumber,
				startColumn: endPos.column,
				endLineNumber: endPos.lineNumber,
				endColumn: endPos.column,
			});
		}

		editor.focus();
	};

	return (
		<div className="h-full min-h-0 overflow-hidden flex flex-col">
			<TabsBar />

			{buttons.length > 0 && (
				<div className="mb-2 flex flex-wrap gap-2 text-sm shrink-0">
					{buttons.map((b) => (
						<button
							key={b.id}
							className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
							onClick={() => insert(b.insert)}
							type="button"
						>
							{b.label}
						</button>
					))}
				</div>
			)}

			<div className="flex-1 min-h-0 overflow-hidden">
				{isImage ? (
					// Image viewer
					<div className="h-full w-full flex items-center justify-center bg-slate-900/50 p-4 overflow-auto">
						<img
							src={file.content}
							alt={`${file.name}.${file.extension}`}
							className="max-w-full max-h-full object-contain"
							style={{ imageRendering: 'auto' }}
						/>
					</div>
				) : (
					<div
						className={
							isMarkdown || isHtml
								? 'h-full min-h-0 overflow-hidden grid grid-cols-2 gap-2'
								: 'h-full min-h-0 overflow-hidden'
						}
					>
						<div className="h-full min-h-0 overflow-hidden">
							<Editor
								height="100%"
								theme="vs-dark"
								language={langFromExt(file.extension)}
								value={file.content}
								onMount={(editor, monaco) => {
									editorRef.current = editor;
									monacoRef.current =
										monaco as unknown as typeof Monaco;

									__focusEditor = () => editor.focus();
									__revealInEditor = (
										line: number,
										column: number
									) => {
										editor.focus();
										editor.setPosition({
											lineNumber: line,
											column,
										});
										editor.revealPositionInCenter({
											lineNumber: line,
											column,
										});
									};

									const endIfSelectionNotOnActive = () => {
										const session = snippetSessionRef.current;
										const model = editor.getModel();
										if (!session || !model) return;

										const activeId = session.ids[session.index];
										const activeRange =
											model.getDecorationRange(activeId);
										if (!activeRange)
											return clearSnippetSession();

										const sel = editor.getSelection();
										if (!sel) return;

										const inside =
											sel.startLineNumber ===
												activeRange.startLineNumber &&
											sel.endLineNumber ===
												activeRange.endLineNumber &&
											sel.startColumn >=
												activeRange.startColumn &&
											sel.endColumn <= activeRange.endColumn;

										if (!inside) clearSnippetSession();
									};

									editor.onDidChangeCursorSelection(() => {
										endIfSelectionNotOnActive();
									});

									editor.addCommand(monaco.KeyCode.Tab, () => {
										if (!jumpPlaceholder(1)) {
											editor.trigger('keyboard', 'tab', null);
										}
									});

									editor.addCommand(
										monaco.KeyMod.Shift | monaco.KeyCode.Tab,
										() => {
											if (!jumpPlaceholder(-1)) {
												editor.trigger(
													'keyboard',
													'outdent',
													null
												);
											}
										}
									);

									editor.addCommand(monaco.KeyCode.Escape, () =>
										clearSnippetSession()
									);

									requestAnimationFrame(() => editor.layout());
								}}
								onChange={(val) =>
									dispatch(
										updateFileContent({
											id: file.id,
											content: val ?? '',
										})
									)
								}
								options={{
									minimap: { enabled: false },
									fontSize: 14,
									wordWrap: 'on',
									scrollbar: {
										vertical: 'auto',
										horizontal: 'auto',
										verticalScrollbarSize: 10,
										horizontalScrollbarSize: 10,
										alwaysConsumeMouseWheel: false,
									},
									scrollBeyondLastLine: false,
								}}
							/>
						</div>

						{isMarkdown && (
							<div className="h-full min-h-0 overflow-hidden">
								<PreviewPanel
									extension={file.extension}
									content={file.content}
								/>
							</div>
						)}

						{isHtml && (
							<div className="h-full min-h-0 overflow-hidden">
								<iframe
									className="w-full h-full bg-white border-0"
									srcDoc={file.content}
									sandbox="allow-scripts allow-same-origin"
									title="HTML Preview"
								/>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
