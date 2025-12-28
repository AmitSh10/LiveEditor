import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { resolveMarkdownReferences } from '../../utils/pathResolver';
import type { FSNode } from '../../types/fs';

export function PreviewPanel({
	extension,
	content,
	root,
	fileId,
}: {
	extension: string;
	content: string;
	root?: FSNode;
	fileId?: string;
}) {
	const normalized = content.includes('\\n')
		? content.replaceAll('\\n', '\n')
		: content;

	// Resolve file references in markdown if root and fileId are provided
	const resolvedContent = extension === 'md' && root && fileId
		? resolveMarkdownReferences(normalized, root, fileId)
		: normalized;

	// Debug: Log the resolved markdown content
	if (extension === 'md' && resolvedContent !== normalized) {
		console.log('PreviewPanel resolved markdown:', {
			original: normalized.substring(0, 200),
			resolved: resolvedContent.substring(0, 200),
			hasDataUrl: resolvedContent.includes('data:')
		});
	}

	return (
		<div className="min-h-0 h-full overflow-auto bg-slate-900 p-3 rounded text-sm prose prose-invert max-w-none">
			{extension === 'md' ? (
				<ReactMarkdown
					remarkPlugins={[remarkGfm, remarkBreaks]}
					urlTransform={(url) => {
						// Allow data URLs and all other URLs as-is
						return url;
					}}
					components={{
						// Allow data URLs in images
						img: ({node, ...props}) => <img {...props} />
					}}
				>
					{resolvedContent}
				</ReactMarkdown>
			) : (
				<pre className="whitespace-pre-wrap text-slate-200">
					{resolvedContent}
				</pre>
			)}
		</div>
	);
}
