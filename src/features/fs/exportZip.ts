import JSZip from 'jszip';
import type { FSNode } from '../../types/fs';

function fileNameWithExtension(node: FSNode): string {
	if (node.type !== 'file') return node.name;

	const base = node.name ?? '';
	const ext = (node.extension ?? '').trim();

	return ext ? `${base}.${ext}` : base;
}

function addNode(zip: JSZip, node: FSNode) {
	if (node.type === 'file') {
		const filename = fileNameWithExtension(node);
		zip.file(filename, node.content ?? '');
	} else {
		// folder
		const folder = zip.folder(node.name)!;
		node.children.forEach((c) => addNode(folder, c));
	}
}

export async function exportAsZip(root: FSNode) {
	const zip = new JSZip();

	// IMPORTANT:
	// root is a virtual container — export its children, not the root itself
	if (root.type === 'folder') {
		root.children.forEach((c) => addNode(zip, c));
	} else {
		addNode(zip, root);
	}

	const blob = await zip.generateAsync({ type: 'blob' });

	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = 'project.zip';
	a.click();

	URL.revokeObjectURL(a.href);
}
