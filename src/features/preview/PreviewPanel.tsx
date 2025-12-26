import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

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
		<div className="min-h-0 h-full overflow-auto bg-slate-900 p-3 rounded text-sm prose prose-invert max-w-none">
			{extension === 'md' ? (
				<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
					{normalized}
				</ReactMarkdown>
			) : (
				<pre className="whitespace-pre-wrap text-slate-200">
					{normalized}
				</pre>
			)}
		</div>
	);
}
