import type { Track, Playlist } from '../types';

const DB_NAME = 'LipsSongsDB';
const DB_VERSION = 5;
let db: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = (e.target as IDBOpenDBRequest).result;
      if (!d.objectStoreNames.contains('audioCache')) d.createObjectStore('audioCache', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('state')) d.createObjectStore('state', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('coverCache')) d.createObjectStore('coverCache', { keyPath: 'id' });
    };
    req.onsuccess = (e) => { db = (e.target as IDBOpenDBRequest).result; resolve(db); };
    req.onerror = reject;
  });
}

function getDB(): IDBDatabase {
  if (!db) throw new Error('DB not open');
  return db;
}

export function dbPut(store: string, data: unknown): Promise<void> {
  return new Promise((res, rej) => {
    try {
      const tx = getDB().transaction(store, 'readwrite');
      tx.objectStore(store).put(data);
      tx.oncomplete = () => res();
      tx.onerror = rej;
    } catch (e) { rej(e); }
  });
}

export function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  return new Promise((res, rej) => {
    try {
      const tx = getDB().transaction(store, 'readonly');
      const r = tx.objectStore(store).get(key);
      r.onsuccess = () => res(r.result as T);
      r.onerror = rej;
    } catch (e) { rej(e); }
  });
}

export async function saveCover(trackId: string, blob: Blob): Promise<void> {
  try { await dbPut('coverCache', { id: trackId, blob }); } catch (_) {}
}

export async function loadCover(trackId: string): Promise<Blob | null> {
  try {
    const r = await dbGet<{ id: string; blob: Blob }>('coverCache', trackId);
    return r ? r.blob : null;
  } catch (_) { return null; }
}

export async function cacheAudio(id: string, blob: Blob): Promise<void> {
  await dbPut('audioCache', { id, blob });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  try {
    const r = await dbGet<{ id: string; blob: Blob }>('audioCache', id);
    return r ? r.blob : null;
  } catch (_) { return null; }
}

interface AppState {
  favorites: string[];
  playlists: Playlist[];
  downloaded: string[];
  localTracks: Track[];
  currentTab: number;
  hasVisited: boolean;
  cachedTracks: Track[];
}

export async function saveAppState(state: Partial<AppState>): Promise<void> {
  if (!db) return;
  const entries = Object.entries(state);
  for (const [key, value] of entries) {
    await dbPut('state', { key, value });
  }
}

export async function loadAppState(): Promise<Partial<AppState>> {
  if (!db) return {};
  const keys: (keyof AppState)[] = ['favorites', 'playlists', 'downloaded', 'localTracks', 'currentTab', 'hasVisited', 'cachedTracks'];
  const result: Partial<AppState> = {};
  for (const key of keys) {
    try {
      const r = await dbGet<{ key: string; value: unknown }>('state', key);
      if (r) (result as Record<string, unknown>)[key] = r.value;
    } catch (_) {}
  }
  return result;
}
