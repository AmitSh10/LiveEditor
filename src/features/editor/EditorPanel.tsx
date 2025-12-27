import Editor from '@monaco-editor/react';
import { useRef } from 'react';

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

	if (!file) return <div className="text-slate-400">Select a file…</div>;

	const isMarkdown = file.extension === 'md';
	const buttons = toolbarTemplates[file.extension] ?? [];

	const clearSnippetSession = () => {
		const editor = editorRef.current;
		const model = editor?.getModel();
		const session = snippetSessionRef.current;
		if (!editor || !model || !session) return;

		model.deltaDecorations(session.ids, []);
		snippetSessionRef.current = null;
	};

	/**
	 * Move the caret to end of inserted snippet and end snippet mode.
	 * (Used when user presses Tab after last placeholder.)
	 */
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

	/**
	 * IMPORTANT behavior:
	 * - If snippet session is active:
	 *   - Tab/Shift+Tab should NEVER fall back to Monaco default indentation while placeholder is selected.
	 *   - When moving past last placeholder (Tab), we END the session and place caret at end.
	 * - Return true = "we handled it, consume Tab"
	 * - Return false = "no active session, let Monaco handle Tab"
	 */
	const jumpPlaceholder = (dir: 1 | -1): boolean => {
		const editor = editorRef.current;
		const model = editor?.getModel();
		const session = snippetSessionRef.current;
		if (!editor || !model || !session || session.ids.length === 0)
			return false;

		const nextIndex = session.index + dir;

		// Shift+Tab before first: keep it at first (consume)
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

		// Tab after last: END snippet (consume)
		if (nextIndex >= session.ids.length) {
			endSnippetAtEnd();
			return true;
		}

		// Move to next/prev placeholder
		const range = model.getDecorationRange(session.ids[nextIndex]);
		if (!range) {
			clearSnippetSession();
			return true; // consume
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

		// If there is a selection, inject it into the first placeholder (${1:...})
		if (hasSelection) {
			tpl = tpl.replace(/\$\{1:([^}]+)\}/, () => `\${1:${selectedText}}`);
		}

		const { text, placeholders } = parseSnippet(tpl);

		const lineContent = model.getLineContent(selection.startLineNumber);
		const beforeCursor = lineContent.slice(0, selection.startColumn - 1);
		const needsNewLine = !hasSelection && beforeCursor.trim().length > 0;

		const finalText = needsNewLine ? `\n${text}` : text;

		// baseOffset must be insertion START (before edits)
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
			// ✅ Fix #1: No placeholders → caret goes to END of inserted snippet
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
			{/* Tabs always shown when at least one file is open */}
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
				<div
					className={
						isMarkdown
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

								// ✅ Fix #2: consume Tab while snippet session active
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
				</div>
			</div>
		</div>
	);
}
