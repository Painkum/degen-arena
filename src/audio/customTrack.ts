// Remembers the player's chosen song file in this browser (IndexedDB), so it survives reloads.
// The file never leaves the device.
const DB = 'degen-arena';
const STORE = 'music';
const KEY = 'custom';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[music] storage unavailable', e);
    return null;
  }
}

export interface SavedTrack { name: string; file: Blob }

export const loadCustomTrack = () => run<SavedTrack>('readonly', (s) => s.get(KEY));
export const saveCustomTrack = (t: SavedTrack) => run('readwrite', (s) => s.put(t, KEY));
export const clearCustomTrack = () => run('readwrite', (s) => s.delete(KEY));

// Shared UI state so every Settings panel shows the same song name.
import { create } from 'zustand';
import { sound } from './sound';

export const useCustomTrack = create<{ name: string | null; error: string | null }>(() => ({ name: null, error: null }));

/** Load the saved song (if any) on app start. */
export async function restoreCustomTrack() {
  const t = await loadCustomTrack();
  if (t?.file) {
    sound.setCustomTrack(t.file);
    useCustomTrack.setState({ name: t.name });
  }
}

export async function useSongFile(file: File) {
  if (!file.type.startsWith('audio/')) {
    useCustomTrack.setState({ error: 'Please choose an audio file (MP3, M4A, WAV or OGG).' });
    return;
  }
  sound.setCustomTrack(file);
  sound.unlock(); // this runs from a click, so playback is allowed
  useCustomTrack.setState({ name: file.name, error: null });
  await saveCustomTrack({ name: file.name, file });
}

export async function removeSongFile() {
  sound.setCustomTrack(null);
  sound.unlock();
  useCustomTrack.setState({ name: null, error: null });
  await clearCustomTrack();
}
