import JSZip from 'jszip';
import type { FSNode } from '../../types/fs';

function addNode(zip: JSZip, node: FSNode) {
	if (node.type === 'file') {
		zip.file(node.name, node.content);
	} else {
		const folder = zip.folder(node.name)!;
		node.children.forEach((c) => addNode(folder, c));
	}
}

export async function exportAsZip(root: FSNode) {
	const zip = new JSZip();
	addNode(zip, root);
	const blob = await zip.generateAsync({ type: 'blob' });

	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = 'project.zip';
	a.click();
}
