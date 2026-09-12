import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ServerProfile, RssFeed, FolderProperties, Note, Bookmark } from '../types';

const DB_NAME = 'file-explorer-db';
const DB_VERSION = 4;
const PROFILES_STORE = 'server-profiles';
const FEEDS_STORE = 'rss-feeds';
const FOLDER_PROPERTIES_STORE = 'folder-properties';
const NOTES_STORE = 'notes';

interface FileExplorerDB extends DBSchema {
  [PROFILES_STORE]: {
    key: string;
    value: ServerProfile;
  };
  [FEEDS_STORE]: {
    key: string;
    value: RssFeed;
  };
  [FOLDER_PROPERTIES_STORE]: {
    key: string;
    value: FolderProperties;
  };
  [NOTES_STORE]: {
    key: string;
    value: Note;
  };
}

let dbPromise: Promise<IDBPDatabase<FileExplorerDB>> | null = null;

function getDb(): Promise<IDBPDatabase<FileExplorerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FileExplorerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains(PROFILES_STORE)) {
            db.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(FEEDS_STORE)) {
            db.createObjectStore(FEEDS_STORE, { keyPath: 'id' });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(FOLDER_PROPERTIES_STORE)) {
            db.createObjectStore(FOLDER_PROPERTIES_STORE, { keyPath: 'path' });
          }
        }
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains(NOTES_STORE)) {
            db.createObjectStore(NOTES_STORE, { keyPath: 'path' });
          }
        }
      },
    });
  }
  return dbPromise;
}

export const StorageService = {
  // Profiles
  async getAllProfiles(): Promise<ServerProfile[]> {
    try {
      const db = await getDb();
      return await db.getAll(PROFILES_STORE);
    } catch {
      return [];
    }
  },
  async saveProfile(profile: ServerProfile): Promise<void> {
    const db = await getDb();
    await db.put(PROFILES_STORE, profile);
  },
  async deleteProfile(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(PROFILES_STORE, id);
  },

  // Feeds
  async getAllFeeds(): Promise<RssFeed[]> {
    try {
      const db = await getDb();
      return await db.getAll(FEEDS_STORE);
    } catch {
      return [];
    }
  },
  async saveFeed(feed: RssFeed): Promise<void> {
    const db = await getDb();
    await db.put(FEEDS_STORE, feed);
  },
  async deleteFeed(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(FEEDS_STORE, id);
  },

  // Folder properties
  async getAllFolderProperties(): Promise<FolderProperties[]> {
    try {
      const db = await getDb();
      return await db.getAll(FOLDER_PROPERTIES_STORE);
    } catch {
      return [];
    }
  },
  async saveFolderProperties(props: FolderProperties): Promise<void> {
    const db = await getDb();
    await db.put(FOLDER_PROPERTIES_STORE, props);
  },
  async deleteFolderProperties(path: string): Promise<void> {
    const db = await getDb();
    await db.delete(FOLDER_PROPERTIES_STORE, path);
  },

  // Notes
  async getNote(path: string): Promise<Note | undefined> {
    try {
      const db = await getDb();
      return await db.get(NOTES_STORE, path);
    } catch {
      return undefined;
    }
  },
  async saveNote(note: Note): Promise<void> {
    const db = await getDb();
    await db.put(NOTES_STORE, note);
  },
  async deleteNote(path: string): Promise<void> {
    const db = await getDb();
    await db.delete(NOTES_STORE, path);
  },

  // LocalStorage Helpers
  getLocalItem<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn(`Error reading ${key} from localStorage`, e);
    }
    return fallback;
  },
  setLocalItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error writing ${key} to localStorage`, e);
    }
  },
};
