import { Agendamento } from "../types";

const DB_NAME = 'FleetMaintenanceDB';
// FIX: Bump DB version and add schedules store
const DB_VERSION = 2; 
const FILE_DATA_STORE = 'fileData';
const SCHEDULES_STORE = 'schedules';

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("Error opening DB");
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(FILE_DATA_STORE)) {
        dbInstance.createObjectStore(FILE_DATA_STORE);
      }
      // FIX: Create schedules object store if it doesn't exist
      if (!dbInstance.objectStoreNames.contains(SCHEDULES_STORE)) {
        dbInstance.createObjectStore(SCHEDULES_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const storageService = {
  async set<T>(storeName: string, key: string, value: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(`Error setting item ${key} in ${storeName}`);
    });
  },

  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(`Error getting item ${key} from ${storeName}`);
    });
  },

  // FIX: Add schedules storage operations
  schedules: {
    async list(): Promise<Agendamento[]> {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(SCHEDULES_STORE, 'readonly');
        const store = transaction.objectStore(SCHEDULES_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(`Error getting all items from ${SCHEDULES_STORE}`);
      });
    },

    async get(id: string): Promise<Agendamento | undefined> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SCHEDULES_STORE, 'readonly');
            const store = transaction.objectStore(SCHEDULES_STORE);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(`Error getting item ${id} from ${SCHEDULES_STORE}`);
        });
    },

    async add(item: Agendamento): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SCHEDULES_STORE, 'readwrite');
            const store = transaction.objectStore(SCHEDULES_STORE);
            const request = store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(`Error adding item to ${SCHEDULES_STORE}: ${request.error?.message}`);
        });
    },

    async update(item: Agendamento): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SCHEDULES_STORE, 'readwrite');
            const store = transaction.objectStore(SCHEDULES_STORE);
            const request = store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(`Error updating item in ${SCHEDULES_STORE}`);
        });
    },

    async remove(id: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SCHEDULES_STORE, 'readwrite');
            const store = transaction.objectStore(SCHEDULES_STORE);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(`Error removing item ${id} from ${SCHEDULES_STORE}`);
        });
    },
  }
};