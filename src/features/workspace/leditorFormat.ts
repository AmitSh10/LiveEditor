import type { Project } from '../../types/workspace';
import type { LEditorFile } from '../../types/workspace';

/**
 * Convert a Project to .leditor file format
 */
export function projectToLEditor(project: Project): LEditorFile {
	return {
		version: '1.0.0',
		name: project.name,
		created: project.created,
		modified: project.modified,
		storageMode: project.storageMode,
		root: project.root,
		openFiles: project.openFileIds,
		activeFile: project.activeFileId,
		pinnedFiles: project.pinnedFileIds,
		searchQuery: project.searchQuery,
		searchMode: project.searchMode,
		matchCase: project.matchCase,
		extFilters: project.extFilters,
	};
}

/**
 * Convert .leditor file format to Project
 */
export function leditorToProject(leditor: LEditorFile): Omit<Project, 'id'> {
	const now = new Date().toISOString();

	return {
		name: leditor.name,
		created: leditor.created || now,
		modified: leditor.modified || now,
		storageMode: leditor.storageMode || 'localstorage',
		root: leditor.root,
		activeFileId: leditor.activeFile,
		openFileIds: leditor.openFiles || [],
		pinnedFileIds: leditor.pinnedFiles || [],
		searchQuery: leditor.searchQuery || '',
		searchMode: leditor.searchMode || 'all',
		matchCase: leditor.matchCase || false,
		extFilters: leditor.extFilters || [],
	};
}

/**
 * Export project as .leditor file (download)
 */
export function exportLEditorFile(project: Project) {
	const leditorData = projectToLEditor(project);
	const json = JSON.stringify(leditorData, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `${project.name}.leditor`;
	a.click();

	URL.revokeObjectURL(url);
}

/**
 * Parse .leditor file from uploaded file
 */
export async function parseLEditorFile(file: File): Promise<LEditorFile | null> {
	try {
		const text = await file.text();
		const data: LEditorFile = JSON.parse(text);

		// Basic validation
		if (!data.version || !data.root) {
			throw new Error('Invalid .leditor file format');
		}

		return data;
	} catch (err) {
		console.error('Failed to parse .leditor file:', err);
		return null;
	}
}

/**
 * Import .leditor file (trigger file picker)
 */
export function importLEditorFile(): Promise<LEditorFile | null> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.leditor,application/json';

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) {
				resolve(null);
				return;
			}

			const leditor = await parseLEditorFile(file);
			resolve(leditor);
		};

		input.click();
	});
}
