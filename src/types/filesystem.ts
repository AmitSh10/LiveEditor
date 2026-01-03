/**
 * Types for File System Access API integration
 * This enables working with real OS files instead of virtual in-memory files
 */

// .leditor file format (project manifest)
export interface LEditorManifest {
	name: string;
	version: string;
	created: string;
	modified: string;
	files: FileMetadata[];
	folders: string[];
	settings: ProjectSettings;
}

export interface FileMetadata {
	path: string; // Relative path from project root
	type: string; // File extension
	lastModified: string;
	size: number;
}

export interface ProjectSettings {
	storageMode: 'filesystem';
	rootDirectory: string; // Always "./" for portability
}

// File System Access API types
export interface FileSystemHandle {
	kind: 'file' | 'directory';
	name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
	kind: 'file';
	getFile(): Promise<File>;
	createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
	kind: 'directory';
	entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
	keys(): AsyncIterableIterator<string>;
	values(): AsyncIterableIterator<FileSystemHandle>;
	getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
	getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
	removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

export interface FileSystemWritableFileStream extends WritableStream {
	write(data: string | BufferSource | Blob): Promise<void>;
	seek(position: number): Promise<void>;
	truncate(size: number): Promise<void>;
}

// Extended types for our workspace
export interface FilesystemProject {
	id: string;
	name: string;
	rootHandle: FileSystemDirectoryHandle;
	manifest: LEditorManifest;
	created: string;
	modified: string;
}

// Personal state stored in localStorage (per-project)
export interface ProjectPersonalState {
	projectId: string;
	activeFileId: string | null;
	openFileIds: string[];
	pinnedFileIds: string[];
	searchQuery: string;
	searchMode: 'all' | 'names' | 'content';
	matchCase: boolean;
	extFilters: string[];

	// Editor state per file
	fileStates: {
		[fileId: string]: {
			cursorLine: number;
			cursorColumn: number;
			scrollTop: number;
			selection?: {
				startLine: number;
				startColumn: number;
				endLine: number;
				endColumn: number;
			};
		};
	};
}

// Browser permissions check
export interface FileSystemPermissionDescriptor {
	mode: 'read' | 'readwrite';
}

declare global {
	interface Window {
		showDirectoryPicker?: (options?: {
			id?: string;
			mode?: 'read' | 'readwrite';
			startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
		}) => Promise<FileSystemDirectoryHandle>;
	}
}
