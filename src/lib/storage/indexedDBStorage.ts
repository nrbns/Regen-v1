/**
 * IndexedDB storage helpers
 * Provides safe feature detection and minimal factory with graceful fallback.
 */

export function isIndexedDBAvailable(): boolean {
	try {
		// Basic feature detection
		return typeof indexedDB !== 'undefined' && !!indexedDB.open;
	} catch {
		return false;
	}
}

export interface SimpleStorage {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
	removeItem(key: string): Promise<void>;
}

/**
 * Create a minimal async storage wrapper. If IndexedDB isn't available,
 * falls back to localStorage to avoid breaking builds.
 */
export function createIndexedDBStorage(dbName: string = 'omnibrowser', storeName: string = 'kv'): SimpleStorage {
	if (!isIndexedDBAvailable()) {
		// Fallback to localStorage
		return {
			async getItem(key: string) {
				try { return localStorage.getItem(`${dbName}:${storeName}:${key}`); } catch { return null; }
			},
			async setItem(key: string, value: string) {
				try { localStorage.setItem(`${dbName}:${storeName}:${key}`, value); } catch {}
			},
			async removeItem(key: string) {
				try { localStorage.removeItem(`${dbName}:${storeName}:${key}`); } catch {}
			},
		};
	}

	// Minimal IndexedDB implementation
	const dbPromise: Promise<IDBDatabase> = new Promise((resolve, reject) => {
		const request = indexedDB.open(dbName, 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(storeName)) {
				db.createObjectStore(storeName);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

	const withStore = async (mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<any>) => {
		const db = await dbPromise;
		return new Promise((resolve, reject) => {
			const tx = db.transaction(storeName, mode);
			const store = tx.objectStore(storeName);
			Promise.resolve(fn(store))
				.then((res) => { tx.oncomplete = () => resolve(res); })
				.catch((err) => reject(err));
			tx.onerror = () => reject(tx.error);
		});
	};

	return {
		async getItem(key: string) {
			return withStore('readonly', async (store) => {
				return new Promise<string | null>((resolve, reject) => {
					const req = store.get(key);
					req.onsuccess = () => resolve((req.result as string) ?? null);
					req.onerror = () => reject(req.error);
				});
			});
		},
		async setItem(key: string, value: string) {
			await withStore('readwrite', async (store) => {
				return new Promise<void>((resolve, reject) => {
					const req = store.put(value, key);
					req.onsuccess = () => resolve();
					req.onerror = () => reject(req.error);
				});
			});
		},
		async removeItem(key: string) {
			await withStore('readwrite', async (store) => {
				return new Promise<void>((resolve, reject) => {
					const req = store.delete(key);
					req.onsuccess = () => resolve();
					req.onerror = () => reject(req.error);
				});
			});
		},
	};
}

