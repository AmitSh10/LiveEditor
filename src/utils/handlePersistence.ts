/**
 * IndexedDB persistence for FileSystemDirectoryHandle objects
 * Allows project handles to survive page refreshes
 */

const DB_NAME = 'leditor_handles';
const DB_VERSION = 1;
const STORE_NAME = 'project_handles';

interface StoredProject {
	projectId: string;
	handle: FileSystemDirectoryHandle;
	name: string;
	rootPath: string;
	timestamp: number;
}

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
			}
		};
	});
}

/**
 * Save a project handle to IndexedDB
 */
export async function saveProjectHandle(
	projectId: string,
	handle: FileSystemDirectoryHandle,
	name: string,
	rootPath: string
): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readwrite');
	const store = tx.objectStore(STORE_NAME);

	const data: StoredProject = {
		projectId,
		handle,
		name,
		rootPath,
		timestamp: Date.now(),
	};

	return new Promise((resolve, reject) => {
		const request = store.put(data);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Load a project handle from IndexedDB
 */
export async function loadProjectHandle(
	projectId: string
): Promise<StoredProject | null> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readonly');
	const store = tx.objectStore(STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.get(projectId);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result || null);
	});
}

/**
 * Load all stored project handles
 */
export async function loadAllProjectHandles(): Promise<StoredProject[]> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readonly');
	const store = tx.objectStore(STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result || []);
	});
}

/**
 * Delete a project handle from IndexedDB
 */
export async function deleteProjectHandle(projectId: string): Promise<void> {
	const db = await openDB();
	const tx = db.transaction(STORE_NAME, 'readwrite');
	const store = tx.objectStore(STORE_NAME);

	return new Promise((resolve, reject) => {
		const request = store.delete(projectId);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Verify that a stored handle is still accessible
 * (user may have revoked permissions)
 */
export async function verifyHandleAccess(
	handle: FileSystemDirectoryHandle
): Promise<boolean> {
	try {
		// Check if we can still access the handle
		const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
		if (permission === 'granted') {
			return true;
		}

		// Try to request permission
		const requestResult = await (handle as any).requestPermission({ mode: 'readwrite' });
		return requestResult === 'granted';
	} catch (err) {
		console.error('Failed to verify handle access:', err);
		return false;
	}
}
