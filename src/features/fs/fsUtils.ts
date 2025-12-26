import type { FSNode, FileNode } from '../../types/fs';

export function findFileById(node: FSNode, id: string): FileNode | null {
	if (node.type === 'file' && node.id === id) return node;

	if (node.type === 'folder') {
		for (const child of node.children) {
			const found = findFileById(child, id);
			if (found) return found;
		}
	}
	return null;
}
