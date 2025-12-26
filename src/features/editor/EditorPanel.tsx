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

	const snippetSessionRef = useRef<{ ids: string[]; index: number } | null>(
		null
	);

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

	const jumpPlaceholder = (dir: 1 | -1) => {
		const editor = editorRef.current;
		const model = editor?.getModel();
		const session = snippetSessionRef.current;
		if (!editor || !model || !session) return false;

		const nextIndex = session.index + dir;
		if (nextIndex < 0 || nextIndex >= session.ids.length) return false;

		const range = model.getDecorationRange(session.ids[nextIndex]);
		if (!range) return false;

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
			snippetSessionRef.current = { ids, index: 0 };
			const first = model.getDecorationRange(ids[0]);
			if (first) editor.setSelection(first);
		} else {
			editor.setPosition(selection.getEndPosition());
		}

		editor.focus();
	};

	return (
		// ✅ key: seal this whole panel; no page scroll should come from here
		<div className="h-full min-h-0 overflow-hidden flex flex-col">
			{buttons.length > 0 && (
				<div className="mb-2 flex flex-wrap gap-2 text-sm shrink-0">
					{buttons.map((b) => (
						<button
							key={b.id}
							className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
							onClick={() => insert(b.insert)}
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

								editor.addCommand(monaco.KeyCode.Tab, () => {
									if (!jumpPlaceholder(1))
										editor.trigger('keyboard', 'tab', null);
								});

								editor.addCommand(
									monaco.KeyMod.Shift | monaco.KeyCode.Tab,
									() => {
										if (!jumpPlaceholder(-1))
											editor.trigger(
												'keyboard',
												'outdent',
												null
											);
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
						// ✅ give preview a sealed cell; PreviewPanel will scroll inside it
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
