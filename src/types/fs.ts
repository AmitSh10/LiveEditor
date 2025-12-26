export type FileType = 'file' | 'folder';

export interface FSBase {
	id: string;
	name: string;
	type: FileType;
}

export interface FileNode extends FSBase {
	type: 'file';
	extension: string;
	content: string;
}

export interface FolderNode extends FSBase {
	type: 'folder';
	children: FSNode[];
}

export type FSNode = FileNode | FolderNode;
