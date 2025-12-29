import type { FSNode, FolderNode, FileNode } from '../types/fs';

/**
 * Find a file node by its ID in the file tree
 */
function findNodeById(root: FSNode, id: string): FSNode | null {
	if (root.id === id) return root;
	if (root.type === 'folder') {
		for (const child of root.children) {
			const found = findNodeById(child, id);
			if (found) return found;
		}
	}
	return null;
}

/**
 * Find the parent folder of a node
 */
function findParentFolder(root: FSNode, nodeId: string): FolderNode | null {
	if (root.type !== 'folder') return null;

	for (const child of root.children) {
		if (child.id === nodeId) return root;
		const found = findParentFolder(child, nodeId);
		if (found) return found;
	}
	return null;
}

/**
 * Get the full path segments of a file from root to the file
 */
function getPathSegments(root: FSNode, fileId: string): string[] {
	const segments: string[] = [];

	function traverse(node: FSNode, currentPath: string[]): boolean {
		if (node.id === fileId) {
			segments.push(...currentPath);
			return true;
		}

		if (node.type === 'folder') {
			for (const child of node.children) {
				const childName = child.type === 'file'
					? `${child.name}${child.extension ? `.${child.extension}` : ''}`
					: child.name;

				if (traverse(child, [...currentPath, childName])) {
					return true;
				}
			}
		}

		return false;
	}

	traverse(root, []);
	return segments;
}

/**
 * Resolve a relative or absolute path from a source file to find the target file
 * @param root - The root of the file system
 * @param sourceFileId - The ID of the file containing the reference
 * @param relativePath - The relative path (e.g., "./image.png", "../css/style.css") or absolute path (e.g., "/folder/image.png")
 * @returns The target file node, or null if not found
 */
export function resolveRelativePath(
	root: FSNode,
	sourceFileId: string,
	relativePath: string
): FileNode | null {
	// Parse the path
	const pathParts = relativePath.split('/').filter(p => p && p !== '.');

	// Check if it's an absolute path from root (starts with /)
	if (relativePath.startsWith('/')) {
		// Absolute path - start from root
		if (root.type !== 'folder') {
			return null;
		}

		let currentFolder: FolderNode = root;

		// Navigate through the path from root
		for (let i = 0; i < pathParts.length; i++) {
			const part = pathParts[i];

			if (i === pathParts.length - 1) {
				// Last part - this is the file we're looking for
				const file = findFileInFolder(currentFolder, part);
				return file;
			} else {
				// Navigate into a subfolder
				const folder = findFolderInFolder(currentFolder, part);
				if (!folder) {
					return null;
				}
				currentFolder = folder;
			}
		}

		return null;
	}

	// Relative path - resolve from source file's directory
	// Find the source file
	const sourceFile = findNodeById(root, sourceFileId);
	if (!sourceFile || sourceFile.type !== 'file') {
		return null;
	}

	// Get the directory containing the source file
	const sourceParent = findParentFolder(root, sourceFileId);
	if (!sourceParent) {
		return null;
	}

	// Start from the source file's parent directory
	let currentFolder: FolderNode = sourceParent;

	// Navigate through the path
	for (let i = 0; i < pathParts.length; i++) {
		const part = pathParts[i];

		if (part === '..') {
			// Go up one level
			const parent = findParentFolder(root, currentFolder.id);
			if (!parent) {
				return null; // Can't go above root
			}
			currentFolder = parent;
		} else if (i === pathParts.length - 1) {
			// Last part - this is the file we're looking for
			const file = findFileInFolder(currentFolder, part);
			return file;
		} else {
			// Navigate into a subfolder
			const folder = findFolderInFolder(currentFolder, part);
			if (!folder) {
				return null;
			}
			currentFolder = folder;
		}
	}

	return null;
}

/**
 * Find a file in a folder by its full name (name.extension)
 */
function findFileInFolder(folder: FolderNode, fileName: string): FileNode | null {
	for (const child of folder.children) {
		if (child.type === 'file') {
			const fullName = `${child.name}${child.extension ? `.${child.extension}` : ''}`;
			if (fullName === fileName) {
				return child;
			}
		}
	}
	return null;
}

/**
 * Find a subfolder by name
 */
function findFolderInFolder(folder: FolderNode, folderName: string): FolderNode | null {
	for (const child of folder.children) {
		if (child.type === 'folder' && child.name === folderName) {
			return child;
		}
	}
	return null;
}

/**
 * Resolve all file references in HTML content
 * Replaces relative paths with actual file content
 */
export function resolveHtmlReferences(
	html: string,
	root: FSNode,
	sourceFileId: string
): string {
	let result = html;

	// Replace image sources: <img src="...">
	result = result.replace(
		/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
		(match, before, src, after) => {
			if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
				return match; // External or data URL, leave as is
			}

			const file = resolveRelativePath(root, sourceFileId, src);
			if (file && file.content) {
				// If it's already a data URL, use it directly
				if (file.content.startsWith('data:')) {
					return `<img${before}src="${file.content}"${after}>`;
				}
			}

			return match; // Couldn't resolve, leave as is
		}
	);

	// Replace CSS links: <link rel="stylesheet" href="...">
	result = result.replace(
		/<link([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
		(match, before, href, after) => {
			if (href.startsWith('http://') || href.startsWith('https://')) {
				return match; // External URL, leave as is
			}

			// Only process stylesheets
			if (!match.toLowerCase().includes('stylesheet')) {
				return match;
			}

			const file = resolveRelativePath(root, sourceFileId, href);
			if (file && file.content) {
				// Resolve CSS @import and url() references recursively
				const resolvedCss = resolveCssReferences(file.content, root, file.id);
				// Inline the CSS as a <style> tag
				return `<style${before}${after}>\n${resolvedCss}\n</style>`;
			}

			return match; // Couldn't resolve, leave as is
		}
	);

	// Replace script sources: <script src="...">
	result = result.replace(
		/<script([^>]*?)src=["']([^"']+)["']([^>]*?)>[\s\S]*?<\/script>/gi,
		(match, before, src, after) => {
			if (src.startsWith('http://') || src.startsWith('https://')) {
				return match; // External URL, leave as is
			}

			const file = resolveRelativePath(root, sourceFileId, src);
			if (file && file.content) {
				// Inline the JavaScript
				return `<script${before}${after}>\n${file.content}\n</script>`;
			}

			return match; // Couldn't resolve, leave as is
		}
	);

	// Resolve CSS in <style> tags
	result = result.replace(
		/<style([^>]*)>([\s\S]*?)<\/style>/gi,
		(match, attrs, css) => {
			const resolvedCss = resolveCssReferences(css, root, sourceFileId);
			return `<style${attrs}>${resolvedCss}</style>`;
		}
	);

	return result;
}

/**
 * Resolve file references in CSS content
 * Replaces url() and @import with actual file content
 */
export function resolveCssReferences(
	css: string,
	root: FSNode,
	sourceFileId: string
): string {
	let result = css;

	// Replace url() references
	result = result.replace(
		/url\(['"]?([^'")\s]+)['"]?\)/gi,
		(match, url) => {
			if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
				return match; // External or data URL, leave as is
			}

			const file = resolveRelativePath(root, sourceFileId, url);
			if (file && file.content && file.content.startsWith('data:')) {
				return `url('${file.content}')`;
			}

			return match; // Couldn't resolve, leave as is
		}
	);

	// Replace @import statements
	result = result.replace(
		/@import\s+(['"])([^'"]+)\1\s*;?/gi,
		(match, quote, url) => {
			if (url.startsWith('http://') || url.startsWith('https://')) {
				return match; // External URL, leave as is
			}

			const file = resolveRelativePath(root, sourceFileId, url);
			if (file && file.content) {
				// Recursively resolve references in the imported CSS
				const resolvedCss = resolveCssReferences(file.content, root, file.id);
				return `/* Imported from ${url} */\n${resolvedCss}\n`;
			}

			return match; // Couldn't resolve, leave as is
		}
	);

	return result;
}

// Cache for resolved paths to avoid repeated lookups
const pathCache = new Map<string, string | null>();

/**
 * Resolve file references in Markdown content
 * Replaces image references with actual file content
 */
export function resolveMarkdownReferences(
	markdown: string,
	root: FSNode,
	sourceFileId: string
): string {
	let result = markdown;

	// Replace image references: ![alt](path)
	result = result.replace(
		/!\[([^\]]*)\]\(([^)]+)\)/g,
		(match, alt, path) => {
			if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
				return match; // External or data URL, leave as is
			}

			// Create cache key combining sourceFileId and path
			const cacheKey = `${sourceFileId}:${path}`;

			// Check cache first
			if (pathCache.has(cacheKey)) {
				const cached = pathCache.get(cacheKey);
				if (cached) {
					return `![${alt}](${cached})`;
				}
				return match;
			}

			// Resolve and cache the result
			const file = resolveRelativePath(root, sourceFileId, path);
			if (file && file.content && file.content.startsWith('data:')) {
				// Escape $ signs in the data URL to prevent regex replacement issues
				const escapedContent = file.content.replace(/\$/g, '$$$$');
				pathCache.set(cacheKey, escapedContent);
				return `![${alt}](${escapedContent})`;
			}

			// Cache the null result too
			pathCache.set(cacheKey, null);
			return match; // Couldn't resolve, leave as is
		}
	);

	return result;
}
