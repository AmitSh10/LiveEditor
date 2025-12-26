import type { FolderNode } from '../../types/fs';

export interface FSState {
	root: FolderNode;
	activeFileId: string | null;
}

export const createInitialFS = (): FSState => ({
	root: {
		id: 'root',
		name: 'root',
		type: 'folder',
		children: [
			{
				id: 'readme',
				name: 'README.md',
				type: 'file',
				extension: 'md',
				content: '# Welcome\n\nThis is a live editor.',
			},
			{
				id: 'src',
				name: 'src',
				type: 'folder',
				children: [
					{
						id: 'main',
						name: 'main.py',
						type: 'file',
						extension: 'py',
						content: 'print("Hello, Live Editor!");',
					},
				],
			},
		],
	},
	activeFileId: 'readme',
});
