import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useMemo, useEffect, memo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { buildFsIndex, resolveImgSrc, cleanupBlobCache, type FsIndex } from '../../utils/fsIndex';

// Memoized img component to prevent re-renders
const CustomImg = memo(({
	src,
	fsIndex,
	activeFileId,
	...props
}: {
	src?: string;
	fsIndex: FsIndex;
	activeFileId: string | null;
	[key: string]: any;
}) => {
	if (!src || !activeFileId) {
		return <img src={src} {...props} />;
	}

	// Resolve the src using the fast index
	const resolvedSrc = resolveImgSrc(fsIndex, activeFileId, src);

	return <img src={resolvedSrc} {...props} />;
});

export function PreviewPanel({
	extension,
	content,
	root: rootProp,
	fileId: fileIdProp,
}: {
	extension: string;
	content: string;
	root?: any;
	fileId?: string;
}) {
	const normalized = content.includes('\\n')
		? content.replaceAll('\\n', '\n')
		: content;

	// Use props if provided, otherwise get from Redux
	const rootFromRedux = useSelector((state: RootState) => state.fs.root);
	const activeFileIdFromRedux = useSelector((state: RootState) => state.fs.activeFileId);

	const root = rootProp ?? rootFromRedux;
	const activeFileId = fileIdProp ?? activeFileIdFromRedux;

	// Build the index once when the file system changes
	const fsIndex = useMemo(() => buildFsIndex(root), [root]);

	// Debounced content for preview (same as HTML preview - 300ms)
	const [debouncedContent, setDebouncedContent] = useState(normalized);

	// Debounce markdown preview updates to prevent typing lag
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedContent(normalized);
		}, 300); // 300ms delay - same as HTML preview

		return () => clearTimeout(timer);
	}, [normalized]);

	// Cleanup Blob URLs when component unmounts or FS changes
	useEffect(() => {
		return () => cleanupBlobCache();
	}, [root]);

	// Memoize the components object to prevent ReactMarkdown re-renders
	const components = useMemo(() => ({
		img: (props: any) => <CustomImg {...props} fsIndex={fsIndex} activeFileId={activeFileId} />
	}), [fsIndex, activeFileId]);

	return (
		<div className="min-h-0 h-full overflow-auto bg-slate-50 dark:bg-slate-900 p-3 rounded text-sm prose dark:prose-invert max-w-none">
			{extension === 'md' ? (
				<ReactMarkdown
					remarkPlugins={[remarkGfm, remarkBreaks]}
					urlTransform={(url) => {
						// Allow all URLs as-is (resolution happens in img component)
						return url;
					}}
					components={components}
				>
					{debouncedContent}
				</ReactMarkdown>
			) : (
				<pre className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
					{debouncedContent}
				</pre>
			)}
		</div>
	);
}
