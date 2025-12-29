import type { FSNode, FileNode } from '../types/fs';

/**
 * Fast lookup index for O(1) file system operations
 * Built once and reused for all path resolutions
 */
export interface FsIndex {
	idToNode: Map<string, FSNode>;
	idToAbsPath: Map<string, string>; // file ID -> absolute path (e.g., "/docs/readme.md")
	absPathToFileId: Map<string, string>; // absolute path -> file ID
}

/**
 * Build the index from the file system tree
 * This should be called once when the FS changes
 */
export function buildFsIndex(root: FSNode): FsIndex {
	const idToNode = new Map<string, FSNode>();
	const idToAbsPath = new Map<string, string>();
	const absPathToFileId = new Map<string, string>();

	function traverse(node: FSNode, currentPath: string) {
		// Add to idToNode map
		idToNode.set(node.id, node);

		if (node.type === 'file') {
			// Build absolute path for files
			const fileName = node.extension
				? `${node.name}.${node.extension}`
				: node.name;
			const absPath = currentPath + '/' + fileName;

			idToAbsPath.set(node.id, absPath);
			// Store both raw and canonical (URL-encoded) paths for robust lookup
			absPathToFileId.set(absPath, node.id);
			absPathToFileId.set(canonicalUrlPath(absPath), node.id);
		} else if (node.type === 'folder') {
			// For folders, just recurse
			const folderPath = currentPath + '/' + node.name;

			for (const child of node.children) {
				traverse(child, folderPath);
			}
		}
	}

	// Start traversal from root
	if (root.type === 'folder') {
		for (const child of root.children) {
			traverse(child, '');
		}
	}

	return { idToNode, idToAbsPath, absPathToFileId };
}

/**
 * Normalize a relative path by resolving . and .. segments
 */
function normalizePath(path: string): string {
	const parts = path.split('/').filter((p) => p && p !== '.');
	const result: string[] = [];

	for (const part of parts) {
		if (part === '..') {
			result.pop();
		} else {
			result.push(part);
		}
	}

	return '/' + result.join('/');
}

/**
 * Decode URL-encoded path (handles %20, %28, %29, etc.)
 */
function decodePathSafe(path: string): string {
	try {
		// Only decode if it looks URL-encoded
		if (/%[0-9A-Fa-f]{2}/.test(path)) {
			return decodeURIComponent(path);
		}
		return path;
	} catch {
		// If decoding fails, return original
		return path;
	}
}

/**
 * Create a canonical URL-encoded version of a path
 * Uses encodeURI (not encodeURIComponent) so / stays /
 */
function canonicalUrlPath(path: string): string {
	try {
		// First decode any existing encoding (idempotent)
		const decoded = decodePathSafe(path);
		// Re-encode in a normalized way
		return encodeURI(decoded);
	} catch {
		return path;
	}
}

/**
 * Resolve a relative or absolute path from a source file
 * Uses O(1) lookups instead of tree traversal
 */
export function resolveRelativePathFast(
	index: FsIndex,
	sourceFileId: string,
	relativePath: string
): FileNode | null {
	// Skip external URLs and data URLs
	if (
		relativePath.startsWith('http://') ||
		relativePath.startsWith('https://') ||
		relativePath.startsWith('data:')
	) {
		return null;
	}

	// Decode URL-encoded characters (markdown parsers often encode paths)
	const decodedPath = decodePathSafe(relativePath);

	let normalizedPath: string;

	// Check if it's an absolute path from root (starts with /)
	if (decodedPath.startsWith('/')) {
		// Absolute path - use directly
		normalizedPath = normalizePath(decodedPath);
	} else {
		// Relative path - resolve from source file directory
		const sourceAbsPath = index.idToAbsPath.get(sourceFileId);
		if (!sourceAbsPath) {
			return null;
		}

		// Get the directory of the source file
		const lastSlash = sourceAbsPath.lastIndexOf('/');
		const sourceDir =
			lastSlash > 0 ? sourceAbsPath.slice(0, lastSlash) : '';

		// Combine source directory with relative path
		const combinedPath = sourceDir + '/' + decodedPath;

		// Normalize the path (resolve .. and .)
		normalizedPath = normalizePath(combinedPath);
	}

	// Try lookup with both raw and canonical (URL-encoded) paths
	const canonicalPath = canonicalUrlPath(normalizedPath);

	const targetFileId =
		index.absPathToFileId.get(normalizedPath) ??
		index.absPathToFileId.get(canonicalPath) ??
		null;

	if (!targetFileId) {
		return null;
	}

	// Get the file node
	const node = index.idToNode.get(targetFileId);
	if (!node || node.type !== 'file') {
		return null;
	}

	return node as FileNode;
}

/**
 * Resolve an image src attribute using the fast index
 * Returns a Blob URL for better performance than data URLs
 */
const blobCache = new Map<string, string>();

export function resolveImgSrc(
	index: FsIndex,
	sourceFileId: string,
	src: string
): string {
	// If it's already a valid URL, return as-is
	if (
		src.startsWith('http://') ||
		src.startsWith('https://') ||
		src.startsWith('data:') ||
		src.startsWith('blob:')
	) {
		return src;
	}

	// Check blob cache first
	const cacheKey = `${sourceFileId}:${src}`;
	if (blobCache.has(cacheKey)) {
		return blobCache.get(cacheKey)!;
	}

	// Resolve the file
	const file = resolveRelativePathFast(index, sourceFileId, src);
	if (!file || !file.content) {
		return src; // Return original path if can't resolve
	}

	// Just return the data URL directly - no Blob conversion to avoid cleanup issues
	if (file.content.startsWith('data:')) {
		blobCache.set(cacheKey, file.content);
		return file.content;
	}

	// Return original path if content doesn't start with data:
	return src;
}

/**
 * Clean up Blob URLs when no longer needed
 * Call this when the file system changes or component unmounts
 */
export function cleanupBlobCache() {
	for (const url of blobCache.values()) {
		if (url.startsWith('blob:')) {
			URL.revokeObjectURL(url);
		}
	}
	blobCache.clear();
}
