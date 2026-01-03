import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useMemo, useEffect, memo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRoot, selectActiveFileId } from '../workspace/workspaceSelectors';
import {
	selectRoot as selectFSRoot,
	selectActiveFileId as selectFSActiveFileId,
	selectActiveProjectId,
} from '../workspace/filesystemWorkspaceSelectors';
import { buildFsIndex, resolveImgSrc, cleanupBlobCache, type FsIndex } from '../../utils/fsIndex';
import { useAppDispatch } from '../../app/hooks';
import { loadFileContent } from '../workspace/filesystemWorkspaceSlice';
import type { FSNode } from '../../types/fs';

// Filesystem mode flag
const USE_FILESYSTEM_MODE = true;

// Helper to get file path from tree
function getNodePath(root: FSNode, nodeId: string, rootId: string): string | null {
	function traverse(node: FSNode, currentPath: string[]): string | null {
		if (node.id === nodeId) {
			if (node.id === rootId) return '';
			if (node.type === 'file') {
				const fileName = node.extension ? `${node.name}.${node.extension}` : node.name;
				return [...currentPath, fileName].join('/');
			}
			return [...currentPath, node.name].join('/');
		}

		if (node.type === 'folder') {
			for (const child of node.children) {
				const newPath = node.id === rootId ? currentPath : [...currentPath, node.name];
				const path = traverse(child, newPath);
				if (path !== null) return path;
			}
		}

		return null;
	}

	return traverse(root, []);
}

// Memoized img component to prevent re-renders
const CustomImg = memo(({
	src,
	fsIndex,
	activeFileId,
	onImageLoad,
	...props
}: {
	src?: string;
	fsIndex: FsIndex;
	activeFileId: string | null;
	onImageLoad?: (src: string) => void;
	[key: string]: any;
}) => {
	useEffect(() => {
		// Trigger loading of image if it's a relative path
		if (src && activeFileId && onImageLoad) {
			if (
				!src.startsWith('http://') &&
				!src.startsWith('https://') &&
				!src.startsWith('data:') &&
				!src.startsWith('blob:')
			) {
				onImageLoad(src);
			}
		}
	}, [src, activeFileId, onImageLoad]);

	if (!src || !activeFileId) {
		return <img src={src} {...props} />;
	}

	// Decode URL-encoded src (ReactMarkdown encodes paths)
	let decodedSrc = src;
	try {
		if (/%[0-9A-Fa-f]{2}/.test(src)) {
			decodedSrc = decodeURIComponent(src);
		}
	} catch {
		// If decoding fails, use original
	}

	// Resolve the src using the fast index
	const resolvedSrc = resolveImgSrc(fsIndex, activeFileId, decodedSrc);

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
	const dispatch = useAppDispatch();
	const normalized = content.includes('\\n')
		? content.replaceAll('\\n', '\n')
		: content;

	// Use props if provided, otherwise get from Redux
	const rootFromRedux = useSelector(USE_FILESYSTEM_MODE ? selectFSRoot : selectRoot);
	const activeFileIdFromRedux = useSelector(USE_FILESYSTEM_MODE ? selectFSActiveFileId : selectActiveFileId);
	const projectId = useSelector(USE_FILESYSTEM_MODE ? selectActiveProjectId : () => null);

	const root = rootProp ?? rootFromRedux;
	const activeFileId = fileIdProp ?? activeFileIdFromRedux;

	// Build the index once when the file system changes
	const fsIndex = useMemo(() => buildFsIndex(root), [root]);

	// Track loaded images to prevent re-loading
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

	// Handler to load images on-demand in filesystem mode
	const handleImageLoad = useMemo(() => {
		if (!USE_FILESYSTEM_MODE || !projectId || !root || !activeFileId) {
			return undefined;
		}

		return (src: string) => {
			// Skip if already loaded or loading
			if (loadedImages.has(src)) return;

			// Decode the src in case it's URL-encoded
			let decodedSrc = src;
			try {
				if (/%[0-9A-Fa-f]{2}/.test(src)) {
					decodedSrc = decodeURIComponent(src);
				}
			} catch {
				// If decoding fails, use original
			}

			// Use the pathResolver to find the referenced image
			import('../../utils/pathResolver').then(({ resolveRelativePath }) => {
				const imageFile = resolveRelativePath(root, activeFileId, decodedSrc);
				if (!imageFile || imageFile.type !== 'file') return;

				// Check if content already loaded
				if (imageFile.content) return;

				// Get the file path and load it
				const filePath = getNodePath(root, imageFile.id, root.id);
				if (!filePath) return;

				// Mark as loading to prevent duplicate loads
				setLoadedImages((prev) => new Set(prev).add(src));

				// Load the file content as data URL
				loadFileContent(dispatch, projectId, imageFile.id, filePath);
			});
		};
	}, [USE_FILESYSTEM_MODE, projectId, root, activeFileId, loadedImages, dispatch]);

	// Reset loaded images when file changes
	useEffect(() => {
		setLoadedImages(new Set());
	}, [activeFileId]);

	// Debounced content for preview (same as HTML preview - 300ms)
	const [debouncedContent, setDebouncedContent] = useState(normalized);

	// Debounce markdown preview updates to prevent typing lag
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedContent(normalized);
		}, 300); // 300ms delay - same as HTML preview

		return () => clearTimeout(timer);
	}, [normalized]);

	// Auto-encode markdown image paths with special characters
	const processedContent = useMemo(() => {
		if (extension !== 'md') return debouncedContent;

		// Process the content to handle image syntax
		let lastIndex = 0;
		const output: string[] = [];

		// Match image syntax: ![alt](path)
		// We need to carefully parse to handle parentheses in the path
		const regex = /!\[([^\]]*)\]\(/g;
		let match;

		while ((match = regex.exec(debouncedContent)) !== null) {
			const startIndex = match.index;
			const altText = match[1];
			const pathStartIndex = match.index + match[0].length;

			// Add content before this match
			output.push(debouncedContent.slice(lastIndex, startIndex));

			// Now find the closing ) for the image path
			// We need to handle paths that might contain parentheses
			let path = '';
			let i = pathStartIndex;
			let isInAngleBrackets = false;

			// Check if path starts with <
			if (debouncedContent[i] === '<') {
				isInAngleBrackets = true;
				// Find the closing > and then the )
				const closeAngle = debouncedContent.indexOf('>', i + 1);
				if (closeAngle !== -1) {
					const closeParen = debouncedContent.indexOf(')', closeAngle);
					if (closeParen !== -1) {
						// Extract the path including the angle brackets
						path = debouncedContent.slice(i, closeAngle + 1);
						output.push(`![${altText}](${path})`);
						lastIndex = closeParen + 1;
						// Update regex lastIndex to continue after this match
						regex.lastIndex = closeParen + 1;
						continue;
					}
				}
			}

			// Parse the path, tracking parenthesis depth
			let parenDepth = 0;
			for (; i < debouncedContent.length; i++) {
				const char = debouncedContent[i];
				if (char === '(') {
					parenDepth++;
					path += char;
				} else if (char === ')') {
					// If we haven't entered any nested parens, this closes the image syntax
					if (parenDepth === 0) {
						break;
					}
					// Otherwise, this closes a nested paren in the path
					parenDepth--;
					path += char;
				} else if (char === '\n' || char === '\r') {
					// Line break before closing paren - malformed
					break;
				} else {
					path += char;
				}
			}

			// Check if path needs escaping
			const needsEscaping = /[\s()]/.test(path);
			const isExternal = path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:');

			if (needsEscaping && !isExternal && !isInAngleBrackets) {
				output.push(`![${altText}](<${path}>)`);
			} else {
				output.push(`![${altText}](${path})`);
			}

			lastIndex = i + 1; // +1 to skip the closing )
		}

		// Add remaining content
		output.push(debouncedContent.slice(lastIndex));

		return output.join('');
	}, [debouncedContent, extension]);

	// Cleanup Blob URLs when component unmounts or FS changes
	useEffect(() => {
		return () => cleanupBlobCache();
	}, [root]);

	// Memoize the components object to prevent ReactMarkdown re-renders
	const components = useMemo(() => ({
		img: (props: any) => <CustomImg {...props} fsIndex={fsIndex} activeFileId={activeFileId} onImageLoad={handleImageLoad} />
	}), [fsIndex, activeFileId, handleImageLoad]);

	return (
		<div className="min-h-0 h-full overflow-auto bg-slate-50 dark:bg-slate-900 p-3 rounded text-sm prose dark:prose-invert max-w-none">
			{extension === 'md' ? (
				<ReactMarkdown
					remarkPlugins={[remarkGfm, remarkBreaks]}
					urlTransform={(url) => {
						// Decode URL-encoded paths (markdown parsers encode spaces, parentheses, etc.)
						try {
							if (/%[0-9A-Fa-f]{2}/.test(url)) {
								return decodeURIComponent(url);
							}
						} catch {
							// If decoding fails, return original
						}
						return url;
					}}
					components={components}
				>
					{processedContent}
				</ReactMarkdown>
			) : (
				<pre className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
					{debouncedContent}
				</pre>
			)}
		</div>
	);
}
