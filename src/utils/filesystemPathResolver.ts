import type { FSNode } from '../types/fs';
import { resolveRelativePath } from './pathResolver';
import { getProjectHandle } from '../features/workspace/filesystemWorkspaceSlice';
import type { FileSystemDirectoryHandle } from '../types/filesystem';
import type { AppDispatch } from '../app/store';
import { fileContentUpdated } from '../features/workspace/filesystemWorkspaceSlice';

/**
 * Load file content from disk (for CSS/JS files)
 */
async function loadTextFile(
	projectId: string,
	filePath: string
): Promise<string | null> {
	const handle = getProjectHandle(projectId);
	if (!handle) return null;

	try {
		// Navigate to the file
		const parts = filePath.split('/').filter(Boolean);
		let currentHandle: FileSystemDirectoryHandle = handle;

		// Navigate through folders
		for (let i = 0; i < parts.length - 1; i++) {
			currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
		}

		// Get the file
		const fileName = parts[parts.length - 1];
		const fileHandle = await currentHandle.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		return await file.text();
	} catch (err) {
		console.error('Failed to load text file:', err);
		return null;
	}
}

/**
 * Convert a file from the filesystem to a data URL
 */
async function fileToDataURL(
	projectId: string,
	filePath: string,
	_mimeType: string
): Promise<string | null> {
	const handle = getProjectHandle(projectId);
	if (!handle) return null;

	try {
		// Navigate to the file
		const parts = filePath.split('/').filter(Boolean);
		let currentHandle: FileSystemDirectoryHandle = handle;

		// Navigate through folders
		for (let i = 0; i < parts.length - 1; i++) {
			currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
		}

		// Get the file
		const fileName = parts[parts.length - 1];
		const fileHandle = await currentHandle.getFileHandle(fileName);
		const file = await fileHandle.getFile();

		// Convert to data URL
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = () => resolve(null);
			reader.readAsDataURL(file);
		});
	} catch (err) {
		console.error('Failed to load file for data URL:', err);
		return null;
	}
}

/**
 * Get the file path from the file tree
 */
function getFilePath(root: FSNode, fileId: string, rootId: string): string | null {
	function traverse(node: FSNode, currentPath: string[]): string | null {
		if (node.id === fileId) {
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

/**
 * Get MIME type from file extension
 */
function getMimeType(extension: string): string {
	const mimeTypes: Record<string, string> = {
		// Images
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		webp: 'image/webp',
		bmp: 'image/bmp',
		ico: 'image/x-icon',
		// Fonts
		woff: 'font/woff',
		woff2: 'font/woff2',
		ttf: 'font/ttf',
		otf: 'font/otf',
		eot: 'application/vnd.ms-fontobject',
		// Other
		pdf: 'application/pdf',
		mp3: 'audio/mpeg',
		mp4: 'video/mp4',
		webm: 'video/webm',
	};

	return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Resolve HTML file references in filesystem mode
 * Loads actual files from disk and converts them to data URLs
 */
export async function resolveHtmlReferencesFS(
	html: string,
	root: FSNode,
	sourceFileId: string,
	projectId: string,
	dispatch?: AppDispatch
): Promise<string> {
	let result = html;
	const rootId = root.id;

	// Replace image sources: <img src="...">
	const imgMatches = Array.from(result.matchAll(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi));
	for (const match of imgMatches) {
		const [fullMatch, before, src, after] = match;

		if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
			continue; // External or data URL, leave as is
		}

		const file = resolveRelativePath(root, sourceFileId, src);
		if (file && file.extension) {
			const filePath = getFilePath(root, file.id, rootId);
			if (filePath) {
				const mimeType = getMimeType(file.extension);
				const dataUrl = await fileToDataURL(projectId, filePath, mimeType);
				if (dataUrl) {
					result = result.replace(fullMatch, `<img${before}src="${dataUrl}"${after}>`);
				}
			}
		}
	}

	// Replace CSS links: <link rel="stylesheet" href="...">
	const linkMatches = Array.from(result.matchAll(/<link([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi));
	for (const match of linkMatches) {
		const [fullMatch, before, href, after] = match;

		if (href.startsWith('http://') || href.startsWith('https://')) {
			continue; // External URL, leave as is
		}

		if (!fullMatch.toLowerCase().includes('stylesheet')) {
			continue;
		}

		const file = resolveRelativePath(root, sourceFileId, href);
		if (file) {
			let cssContent = file.content;

			// If content is empty, load it from disk
			if (!cssContent) {
				const filePath = getFilePath(root, file.id, rootId);
				if (filePath) {
					const loadedContent = await loadTextFile(projectId, filePath);
					if (loadedContent) {
						cssContent = loadedContent;
						// Update the tree node with the loaded content if dispatch is available
						if (dispatch) {
							dispatch(fileContentUpdated({ projectId, fileId: file.id, content: cssContent }));
						}
					}
				}
			}

			if (cssContent) {
				// Resolve CSS references recursively
				const resolvedCss = await resolveCssReferencesFS(cssContent, root, file.id, projectId, dispatch);
				result = result.replace(fullMatch, `<style${before}${after}>\n${resolvedCss}\n</style>`);
			}
		}
	}

	// Replace script sources: <script src="...">
	const scriptMatches = Array.from(result.matchAll(/<script([^>]*?)src=["']([^"']+)["']([^>]*?)>[\s\S]*?<\/script>/gi));
	for (const match of scriptMatches) {
		const [fullMatch, before, src, after] = match;

		if (src.startsWith('http://') || src.startsWith('https://')) {
			continue; // External URL, leave as is
		}

		const file = resolveRelativePath(root, sourceFileId, src);
		if (file) {
			let jsContent = file.content;

			// If content is empty, load it from disk
			if (!jsContent) {
				const filePath = getFilePath(root, file.id, rootId);
				if (filePath) {
					const loadedContent = await loadTextFile(projectId, filePath);
					if (loadedContent) {
						jsContent = loadedContent;
						// Update the tree node with the loaded content if dispatch is available
						if (dispatch) {
							dispatch(fileContentUpdated({ projectId, fileId: file.id, content: jsContent }));
						}
					}
				}
			}

			if (jsContent) {
				result = result.replace(fullMatch, `<script${before}${after}>\n${jsContent}\n</script>`);
			}
		}
	}

	// Resolve CSS in <style> tags
	const styleMatches = Array.from(result.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/gi));
	for (const match of styleMatches) {
		const [fullMatch, attrs, css] = match;
		const resolvedCss = await resolveCssReferencesFS(css, root, sourceFileId, projectId, dispatch);
		result = result.replace(fullMatch, `<style${attrs}>${resolvedCss}</style>`);
	}

	return result;
}

/**
 * Resolve CSS file references in filesystem mode
 */
export async function resolveCssReferencesFS(
	css: string,
	root: FSNode,
	sourceFileId: string,
	projectId: string,
	dispatch?: AppDispatch
): Promise<string> {
	let result = css;
	const rootId = root.id;

	// Replace url() references
	const urlMatches = Array.from(result.matchAll(/url\(['"]?([^'")\s]+)['"]?\)/gi));
	for (const match of urlMatches) {
		const [fullMatch, url] = match;

		if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
			continue; // External or data URL, leave as is
		}

		const file = resolveRelativePath(root, sourceFileId, url);
		if (file && file.extension) {
			const filePath = getFilePath(root, file.id, rootId);
			if (filePath) {
				const mimeType = getMimeType(file.extension);
				const dataUrl = await fileToDataURL(projectId, filePath, mimeType);
				if (dataUrl) {
					result = result.replace(fullMatch, `url('${dataUrl}')`);
				}
			}
		}
	}

	// Replace @import statements
	const importMatches = Array.from(result.matchAll(/@import\s+(['"])([^'"]+)\1\s*;?/gi));
	for (const match of importMatches) {
		const [fullMatch, _quote, url] = match;

		if (url.startsWith('http://') || url.startsWith('https://')) {
			continue; // External URL, leave as is
		}

		const file = resolveRelativePath(root, sourceFileId, url);
		if (file) {
			let cssContent = file.content;

			// If content is empty, load it from disk
			if (!cssContent) {
				const filePath = getFilePath(root, file.id, rootId);
				if (filePath) {
					const loadedContent = await loadTextFile(projectId, filePath);
					if (loadedContent) {
						cssContent = loadedContent;
						// Update the tree node with the loaded content if dispatch is available
						if (dispatch) {
							dispatch(fileContentUpdated({ projectId, fileId: file.id, content: cssContent }));
						}
					}
				}
			}

			if (cssContent) {
				const resolvedCss = await resolveCssReferencesFS(cssContent, root, file.id, projectId, dispatch);
				result = result.replace(fullMatch, `/* Imported from ${url} */\n${resolvedCss}\n`);
			}
		}
	}

	return result;
}

/**
 * Resolve Markdown file references in filesystem mode
 */
export async function resolveMarkdownReferencesFS(
	markdown: string,
	root: FSNode,
	sourceFileId: string,
	projectId: string
): Promise<string> {
	let result = markdown;
	const rootId = root.id;

	// Replace image references: ![alt](path)
	const imgMatches = Array.from(result.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g));
	for (const match of imgMatches) {
		const [fullMatch, alt, path] = match;

		if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
			continue; // External or data URL, leave as is
		}

		const file = resolveRelativePath(root, sourceFileId, path);
		if (file && file.extension) {
			const filePath = getFilePath(root, file.id, rootId);
			if (filePath) {
				const mimeType = getMimeType(file.extension);
				const dataUrl = await fileToDataURL(projectId, filePath, mimeType);
				if (dataUrl) {
					// Escape $ signs in the data URL
					const escapedContent = dataUrl.replace(/\$/g, '$$$$');
					result = result.replace(fullMatch, `![${alt}](${escapedContent})`);
				}
			}
		}
	}

	return result;
}
