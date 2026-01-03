/**
 * Utilities for File System Access API
 * Handles reading/writing real OS files and directories
 */

import type {
	FileSystemDirectoryHandle,
	FileSystemFileHandle,
	LEditorManifest,
	FileMetadata,
} from '../types/filesystem';

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
	return 'showDirectoryPicker' in window;
}

/**
 * Request permission to access a directory handle
 */
export async function requestPermission(
	handle: FileSystemDirectoryHandle,
	mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
	const options = { mode };

	// Check if permission was already granted
	if ((await (handle as any).queryPermission(options)) === 'granted') {
		return true;
	}

	// Request permission
	if ((await (handle as any).requestPermission(options)) === 'granted') {
		return true;
	}

	return false;
}

/**
 * Prompt user to select a directory
 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
	if (!isFileSystemAccessSupported()) {
		alert('File System Access API is not supported in your browser. Please use Chrome or Edge.');
		return null;
	}

	try {
		const handle = await window.showDirectoryPicker!({
			mode: 'readwrite',
		});
		return handle;
	} catch (err) {
		if ((err as Error).name === 'AbortError') {
			// User cancelled
			return null;
		}
		console.error('Error picking directory:', err);
		throw err;
	}
}

/**
 * Recursively scan a directory and build file metadata list
 */
export async function scanDirectory(
	dirHandle: FileSystemDirectoryHandle,
	basePath: string = ''
): Promise<{ files: FileMetadata[]; folders: string[] }> {
	const files: FileMetadata[] = [];
	const folders: string[] = [];

	for await (const [name, handle] of dirHandle.entries()) {
		// Skip .leditor files (any file ending with .leditor) and hidden files
		if (name.endsWith('.leditor') || name.startsWith('.')) {
			continue;
		}

		const relativePath = basePath ? `${basePath}/${name}` : name;

		if (handle.kind === 'directory') {
			folders.push(relativePath);
			const subResult = await scanDirectory(handle as FileSystemDirectoryHandle, relativePath);
			files.push(...subResult.files);
			folders.push(...subResult.folders);
		} else {
			const file = await (handle as FileSystemFileHandle).getFile();
			const extension = name.split('.').pop() || '';

			files.push({
				path: relativePath,
				type: extension,
				lastModified: new Date(file.lastModified).toISOString(),
				size: file.size,
			});
		}
	}

	return { files, folders };
}

/**
 * Create a new .leditor manifest file
 * @param dirHandle - Directory handle
 * @param projectName - Project name (shown in UI)
 * @param fileName - File name for the .leditor file (without extension)
 */
export async function createLEditorManifest(
	dirHandle: FileSystemDirectoryHandle,
	projectName: string,
	fileName: string = projectName
): Promise<LEditorManifest> {
	const now = new Date().toISOString();
	const { files, folders } = await scanDirectory(dirHandle);

	const manifest: LEditorManifest = {
		name: projectName,
		version: '1.0',
		created: now,
		modified: now,
		files,
		folders,
		settings: {
			storageMode: 'filesystem',
			rootDirectory: './',
		},
	};

	// Write .leditor file to disk with custom name
	await writeLEditorFile(dirHandle, manifest, fileName);

	return manifest;
}

/**
 * Read .leditor file from directory
 */
export async function readLEditorFile(
	dirHandle: FileSystemDirectoryHandle
): Promise<LEditorManifest | null> {
	try {
		const fileHandle = await dirHandle.getFileHandle('.leditor');
		const file = await fileHandle.getFile();
		const text = await file.text();
		return JSON.parse(text) as LEditorManifest;
	} catch (err) {
		if ((err as any).name === 'NotFoundError') {
			return null;
		}
		throw err;
	}
}

/**
 * Write .leditor file to directory
 * Updates the existing .leditor file if found, otherwise creates a new one
 * @param fileName - File name without extension (e.g., "my_project" creates "my_project.leditor")
 */
export async function writeLEditorFile(
	dirHandle: FileSystemDirectoryHandle,
	manifest: LEditorManifest,
	fileName: string = manifest.name
): Promise<void> {
	// First, try to find existing .leditor file
	let existingFilename: string | null = null;
	try {
		for await (const [name] of dirHandle.entries()) {
			if (name.endsWith('.leditor')) {
				existingFilename = name;
				break;
			}
		}
	} catch (err) {
		console.warn('Error scanning for existing .leditor file:', err);
	}

	// Use existing filename or create new one
	let filename: string;
	if (existingFilename) {
		filename = existingFilename;
	} else {
		// Sanitize filename - replace invalid characters
		const sanitized = fileName.replace(/[^a-zA-Z0-9-_]/g, '_');
		filename = `${sanitized}.leditor`;
	}

	const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
	const writable = await fileHandle.createWritable();
	await writable.write(JSON.stringify(manifest, null, 2));
	await writable.close();
}

/**
 * Update .leditor file with new modification time
 */
export async function updateLEditorManifest(
	dirHandle: FileSystemDirectoryHandle,
	manifest: LEditorManifest
): Promise<void> {
	manifest.modified = new Date().toISOString();
	await writeLEditorFile(dirHandle, manifest);
}

/**
 * Read a file from the filesystem
 */
export async function readFile(
	dirHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<string> {
	const pathParts = relativePath.split('/');
	let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = dirHandle;

	// Navigate through directories
	for (let i = 0; i < pathParts.length - 1; i++) {
		currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(
			pathParts[i]
		);
	}

	// Get the file
	const fileHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(
		pathParts[pathParts.length - 1]
	);
	const file = await fileHandle.getFile();
	return await file.text();
}

/**
 * Write a file to the filesystem
 */
export async function writeFile(
	dirHandle: FileSystemDirectoryHandle,
	relativePath: string,
	content: string
): Promise<void> {
	const pathParts = relativePath.split('/');
	let currentHandle: FileSystemDirectoryHandle = dirHandle;

	// Navigate/create directories
	for (let i = 0; i < pathParts.length - 1; i++) {
		currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create: true });
	}

	// Write the file
	const fileHandle = await currentHandle.getFileHandle(pathParts[pathParts.length - 1], {
		create: true,
	});
	const writable = await fileHandle.createWritable();
	await writable.write(content);
	await writable.close();
}

/**
 * Delete a file from the filesystem
 */
export async function deleteFile(
	dirHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<void> {
	const pathParts = relativePath.split('/');
	let currentHandle: FileSystemDirectoryHandle = dirHandle;

	// Navigate through directories
	for (let i = 0; i < pathParts.length - 1; i++) {
		currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
	}

	// Delete the file
	await currentHandle.removeEntry(pathParts[pathParts.length - 1]);
}

/**
 * Create a new directory
 */
export async function createDirectory(
	dirHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<void> {
	const pathParts = relativePath.split('/');
	let currentHandle: FileSystemDirectoryHandle = dirHandle;

	// Create directories
	for (const part of pathParts) {
		currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
	}
}

/**
 * Delete a directory
 */
export async function deleteDirectory(
	dirHandle: FileSystemDirectoryHandle,
	relativePath: string
): Promise<void> {
	const pathParts = relativePath.split('/');
	let currentHandle: FileSystemDirectoryHandle = dirHandle;

	// Navigate to parent directory
	for (let i = 0; i < pathParts.length - 1; i++) {
		currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
	}

	// Delete the directory recursively
	await currentHandle.removeEntry(pathParts[pathParts.length - 1], { recursive: true });
}

/**
 * Rescan directory and update manifest
 */
export async function rescanAndUpdateManifest(
	dirHandle: FileSystemDirectoryHandle,
	manifest: LEditorManifest
): Promise<LEditorManifest> {
	const { files, folders } = await scanDirectory(dirHandle);
	// Create a new manifest object instead of mutating the existing one
	// (manifest might be frozen if it comes from Redux store)
	const updatedManifest: LEditorManifest = {
		...manifest,
		files,
		folders,
		modified: new Date().toISOString(),
	};
	await writeLEditorFile(dirHandle, updatedManifest);
	return updatedManifest;
}
