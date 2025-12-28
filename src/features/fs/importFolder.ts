import type { FolderNode, FileNode } from '../../types/fs';

/**
 * Parse a filename to extract name and extension
 */
function parseFileName(filename: string): { name: string; extension: string } {
	// Handle dotfiles like .gitignore, .env
	if (filename.startsWith('.') && filename.indexOf('.', 1) === -1) {
		return { name: filename, extension: '' };
	}

	const lastDot = filename.lastIndexOf('.');
	if (lastDot > 0 && lastDot < filename.length - 1) {
		return {
			name: filename.slice(0, lastDot),
			extension: filename.slice(lastDot + 1),
		};
	}

	return { name: filename, extension: '' };
}

/**
 * Generate a unique ID
 */
function genId(prefix: 'f' | 'd' = 'f'): string {
	const uid =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? (crypto as Crypto).randomUUID()
			: `${Date.now().toString(36)}-${Math.random()
					.toString(36)
					.slice(2, 10)}`;
	return `${prefix}_${uid}`;
}

/**
 * Check if a file is an image
 */
function isImageFile(filename: string): boolean {
	const imageExtensions = new Set([
		'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'
	]);

	const { extension } = parseFileName(filename);
	return imageExtensions.has(extension.toLowerCase());
}

/**
 * Check if a file should be imported (text files and images)
 */
function shouldImportFile(filename: string): boolean {
	const textExtensions = new Set([
		// Web
		'html', 'htm', 'css', 'scss', 'sass', 'less',
		'js', 'jsx', 'ts', 'tsx', 'json',

		// Documentation
		'md', 'markdown', 'txt', 'text',

		// Programming
		'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
		'go', 'rs', 'rb', 'php', 'swift', 'kt',

		// Shell/Config
		'sh', 'bash', 'zsh', 'fish', 'yml', 'yaml',
		'toml', 'ini', 'conf', 'xml', 'env',

		// Data
		'sql', 'graphql', 'csv',

		// Other
		'vue', 'svelte', 'astro', 'dockerfile',
	]);

	const { extension } = parseFileName(filename);
	return (
		!extension || // Files without extension (like Makefile, Dockerfile)
		textExtensions.has(extension.toLowerCase()) ||
		isImageFile(filename) // Include images
	);
}

/**
 * Import a folder from FileList (from input with webkitdirectory)
 */
export async function importFolder(files: FileList): Promise<FolderNode> {
	if (files.length === 0) {
		throw new Error('No files selected');
	}

	// Build a map of path -> node
	const pathMap = new Map<string, FolderNode | FileNode>();

	// Determine the root folder name from the first file's path
	const firstPath = files[0].webkitRelativePath;
	const rootName = firstPath.split('/')[0] || 'imported';

	// Create root folder
	const root: FolderNode = {
		id: genId('d'),
		type: 'folder',
		name: rootName,
		children: [],
	};
	pathMap.set(rootName, root);

	// Process all files
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const relativePath = file.webkitRelativePath;

		if (!relativePath) continue;

		const parts = relativePath.split('/');

		// Skip the root folder name (already created)
		// Process path segments to create folder hierarchy
		let currentPath = parts[0];

		for (let j = 1; j < parts.length; j++) {
			const segment = parts[j];
			const newPath = `${currentPath}/${segment}`;
			const isLastSegment = j === parts.length - 1;

			if (isLastSegment) {
				// This is a file
				if (!shouldImportFile(segment)) {
					console.log(`Skipping non-text file: ${segment}`);
					continue;
				}

				try {
					let content: string;

					// Read images as base64 data URLs
					if (isImageFile(segment)) {
						const arrayBuffer = await file.arrayBuffer();
						const bytes = new Uint8Array(arrayBuffer);
						let binary = '';
						for (let i = 0; i < bytes.length; i++) {
							binary += String.fromCharCode(bytes[i]);
						}
						const base64 = btoa(binary);
						content = `data:${file.type};base64,${base64}`;
					} else {
						// Read text files normally
						content = await file.text();
					}

					const { name, extension } = parseFileName(segment);

					const fileNode: FileNode = {
						id: genId('f'),
						type: 'file',
						name,
						extension,
						content,
					};

					pathMap.set(newPath, fileNode);

					// Add to parent folder
					const parent = pathMap.get(currentPath) as FolderNode;
					if (parent && parent.type === 'folder') {
						parent.children.push(fileNode);
					}
				} catch (err) {
					console.error(`Error reading file ${segment}:`, err);
				}
			} else {
				// This is a folder
				if (!pathMap.has(newPath)) {
					const folderNode: FolderNode = {
						id: genId('d'),
						type: 'folder',
						name: segment,
						children: [],
					};

					pathMap.set(newPath, folderNode);

					// Add to parent folder
					const parent = pathMap.get(currentPath) as FolderNode;
					if (parent && parent.type === 'folder') {
						parent.children.push(folderNode);
					}
				}
			}

			currentPath = newPath;
		}
	}

	return root;
}
