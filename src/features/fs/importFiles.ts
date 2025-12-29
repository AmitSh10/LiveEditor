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
		'png',
		'jpg',
		'jpeg',
		'gif',
		'svg',
		'webp',
		'bmp',
		'ico',
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
		'html',
		'htm',
		'css',
		'scss',
		'sass',
		'less',
		'js',
		'jsx',
		'ts',
		'tsx',
		'json',

		// Documentation
		'md',
		'markdown',
		'txt',
		'text',

		// Programming
		'py',
		'java',
		'c',
		'cpp',
		'h',
		'hpp',
		'cs',
		'go',
		'rs',
		'rb',
		'php',
		'swift',
		'kt',

		// Shell/Config
		'sh',
		'bash',
		'zsh',
		'fish',
		'yml',
		'yaml',
		'toml',
		'ini',
		'conf',
		'xml',
		'env',

		// Data
		'sql',
		'graphql',
		'csv',

		// Other
		'vue',
		'svelte',
		'astro',
		'dockerfile',
	]);

	const { extension } = parseFileName(filename);
	return (
		!extension || // Files without extension (like Makefile, Dockerfile)
		textExtensions.has(extension.toLowerCase()) ||
		isImageFile(filename) // Include images
	);
}

/**
 * Process dropped files and return array of FileNodes
 */
export async function processDroppedFiles(
	items: DataTransferItemList
): Promise<(FileNode | FolderNode)[]> {
	const results: (FileNode | FolderNode)[] = [];

	// Process each item
	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		if (item.kind === 'file') {
			const entry = item.webkitGetAsEntry();

			if (entry) {
				if (entry.isFile) {
					const fileNode = await processFileEntry(
						entry as FileSystemFileEntry
					);
					if (fileNode) results.push(fileNode);
				} else if (entry.isDirectory) {
					const folderNode = await processDirectoryEntry(
						entry as FileSystemDirectoryEntry
					);
					if (folderNode) results.push(folderNode);
				}
			}
		}
	}

	return results;
}

/**
 * Process a file entry
 */
async function processFileEntry(
	entry: FileSystemFileEntry
): Promise<FileNode | null> {
	return new Promise((resolve) => {
		entry.file(
			async (file) => {
				if (!shouldImportFile(file.name)) {
					resolve(null);
					return;
				}

				try {
					let content: string;

					// Read images as base64 data URLs
					if (isImageFile(file.name)) {
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

					const { name, extension } = parseFileName(file.name);

					const fileNode: FileNode = {
						id: genId('f'),
						type: 'file',
						name,
						extension,
						content,
					};

					resolve(fileNode);
				} catch (err) {
					console.error(`Error reading file ${file.name}:`, err);
					resolve(null);
				}
			},
			(error) => {
				console.error('Error accessing file:', error);
				resolve(null);
			}
		);
	});
}

/**
 * Process a directory entry recursively
 */
async function processDirectoryEntry(
	entry: FileSystemDirectoryEntry
): Promise<FolderNode> {
	const folderNode: FolderNode = {
		id: genId('d'),
		type: 'folder',
		name: entry.name,
		children: [],
	};

	const reader = entry.createReader();
	const entries = await readAllEntries(reader);

	for (const childEntry of entries) {
		if (childEntry.isFile) {
			const fileNode = await processFileEntry(
				childEntry as FileSystemFileEntry
			);
			if (fileNode) folderNode.children.push(fileNode);
		} else if (childEntry.isDirectory) {
			const childFolder = await processDirectoryEntry(
				childEntry as FileSystemDirectoryEntry
			);
			folderNode.children.push(childFolder);
		}
	}

	return folderNode;
}

/**
 * Read all entries from a directory reader
 */
async function readAllEntries(
	reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
	const entries: FileSystemEntry[] = [];

	const readBatch = async (): Promise<void> => {
		return new Promise((resolve, reject) => {
			reader.readEntries(
				(batch) => {
					if (batch.length === 0) {
						resolve();
					} else {
						entries.push(...batch);
						readBatch().then(resolve).catch(reject);
					}
				},
				(error) => reject(error)
			);
		});
	};

	await readBatch();
	return entries;
}
