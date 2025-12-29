import type { FolderNode } from './fs';

export type StorageMode = 'localstorage' | 'filesystem-api';

export type SearchMode = 'all' | 'names' | 'content';

/**
 * A project represents a complete file tree with its own settings
 */
export interface Project {
	id: string;
	name: string;
	created: string; // ISO timestamp
	modified: string; // ISO timestamp
	storageMode: StorageMode;

	// File system
	root: FolderNode;
	activeFileId: string | null;
	openFileIds: string[];
	pinnedFileIds: string[];

	// Search state (per-project)
	searchQuery: string;
	searchMode: SearchMode;
	matchCase: boolean;
	extFilters: string[];

	// Optional: File System Access API handle (serialized)
	directoryHandle?: any;
}

/**
 * The workspace contains all projects and global settings
 */
export interface Workspace {
	projects: Project[];
	activeProjectId: string | null;

	// Global settings (apply to all projects)
	hexViewEnabled: boolean;
}

/**
 * .leditor file format for export/import
 * Live Editor Project File
 */
export interface LEditorFile {
	version: string; // "1.0.0"
	name: string;
	created: string;
	modified: string;
	storageMode: StorageMode;
	root: FolderNode;
	openFiles: string[];
	activeFile: string | null;
	pinnedFiles: string[];
	searchQuery?: string;
	searchMode?: SearchMode;
	matchCase?: boolean;
	extFilters?: string[];
}
