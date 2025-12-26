import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function PreviewPanel({
	extension,
	content,
}: {
	extension: string;
	content: string;
}) {
	const normalized = content.includes('\\n')
		? content.replaceAll('\\n', '\n')
		: content;

	return (
		// ✅ key: h-full so it matches the editor column height
		// ✅ overflow-auto so only the preview scrolls (not the page)
		<div className="h-full min-h-0 overflow-auto bg-slate-900 p-3 rounded text-sm prose prose-invert max-w-none">
			{extension === 'md' ? (
				<ReactMarkdown remarkPlugins={[remarkGfm]}>
					{normalized}
				</ReactMarkdown>
			) : (
				<div className="text-slate-400">
					No preview for .{extension}
				</div>
			)}
		</div>
	);
}
