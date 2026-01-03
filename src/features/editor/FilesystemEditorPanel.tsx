/**
 * Editor Panel for Filesystem Mode
 * Loads file content on-demand from OS filesystem
 */

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
	selectActiveFile,
	selectActiveProjectId,
} from '../workspace/filesystemWorkspaceSelectors';
import {
	selectRoot,
} from '../workspace/filesystemWorkspaceSelectors';
import {
	getProjectHandle,
	loadFileContent,
} from '../workspace/filesystemWorkspaceSlice';
import { EditorPanel } from './EditorPanel';

/**
 * Get the path of a node in the tree
 * The root node represents the project directory itself, so we never include it in paths
 */
function getNodePath(root: any, nodeId: string, rootId: string): string | null {
	function traverse(node: any, currentPath: string[]): string | null {
		if (node.id === nodeId) {
			// If this IS the root node, return empty string (represents project directory)
			if (node.id === rootId) {
				return '';
			}

			if (node.type === 'file') {
				const fileName = node.extension ? `${node.name}.${node.extension}` : node.name;
				return [...currentPath, fileName].join('/');
			}
			return [...currentPath, node.name].join('/');
		}

		if (node.type === 'folder') {
			for (const child of node.children) {
				// Skip adding root folder to path (it represents the project directory)
				const newPath = node.id === rootId ? currentPath : [...currentPath, node.name];
				const path = traverse(child, newPath);
				if (path !== null) return path;
			}
		}

		return null;
	}

	return traverse(root, []);
}

/**
 * Wrapper around EditorPanel that handles filesystem operations
 */
export function FilesystemEditorPanel() {
	const dispatch = useAppDispatch();
	const file = useAppSelector(selectActiveFile);
	const projectId = useAppSelector(selectActiveProjectId);
	const root = useAppSelector(selectRoot);

	// Load file content from filesystem when file is opened
	useEffect(() => {
		if (!file || !projectId || !root) return;
		if (file.content) return; // File already has content loaded

		const handle = getProjectHandle(projectId);
		if (!handle) return;

		const filePath = getNodePath(root, file.id, root.id);
		if (filePath === null) return;

		// Load content from filesystem
		loadFileContent(dispatch, projectId, file.id, filePath);
	}, [file?.id, projectId, root, dispatch, file]);

	// Use the regular EditorPanel - it will work with the loaded content
	return <EditorPanel />;
}
