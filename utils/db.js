/**
 * SUBAH 6 BAJE CHAI — Local Database
 * IndexedDB wrapper for persisting favorites and user preferences locally.
 */

const DB_NAME = 'SubahChaiDB';
const DB_VERSION = 2;
const STORE_FAVORITES = 'favorites';
const STORE_PREFS = 'preferences';
const STORE_RECENT = 'recentlyPlayed';

let db = null;

export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error('IndexedDB error:', e.target.error);
      reject(e.target.error);
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (e) => {
      const upgradeDb = e.target.result;

      if (!upgradeDb.objectStoreNames.contains(STORE_FAVORITES)) {
        upgradeDb.createObjectStore(STORE_FAVORITES, { keyPath: 'id' });
      }

      if (!upgradeDb.objectStoreNames.contains(STORE_PREFS)) {
        upgradeDb.createObjectStore(STORE_PREFS, { keyPath: 'key' });
      }

      if (!upgradeDb.objectStoreNames.contains(STORE_RECENT)) {
        upgradeDb.createObjectStore(STORE_RECENT, { keyPath: 'id' });
      }
    };
  });
}

// ---- Favorites ----

export async function getFavorites() {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FAVORITES, 'readonly');
    const store = tx.objectStore(STORE_FAVORITES);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by addedAt descending (newest first)
      const results = request.result.sort((a, b) => b.addedAt - a.addedAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addFavorite(song) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FAVORITES, 'readwrite');
    const store = tx.objectStore(STORE_FAVORITES);
    
    const fav = {
      ...song,
      addedAt: Date.now()
    };
    
    const request = store.put(fav);
    request.onsuccess = () => resolve(fav);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFavorite(songId) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FAVORITES, 'readwrite');
    const store = tx.objectStore(STORE_FAVORITES);
    const request = store.delete(songId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function isFavorite(songId) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FAVORITES, 'readonly');
    const store = tx.objectStore(STORE_FAVORITES);
    const request = store.get(songId);
    
    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- Recently Played ----

export async function getRecentlyPlayed() {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECENT, 'readonly');
    const store = tx.objectStore(STORE_RECENT);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by playedAt descending (newest first)
      const results = request.result.sort((a, b) => b.playedAt - a.playedAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addRecentlyPlayed(song) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECENT, 'readwrite');
    const store = tx.objectStore(STORE_RECENT);
    
    // First, get all to enforce limit
    const getReq = store.getAll();
    getReq.onsuccess = () => {
      let items = getReq.result;
      
      const recentSong = {
        ...song,
        playedAt: Date.now()
      };
      
      store.put(recentSong);
      
      // Check limit
      items.sort((a, b) => b.playedAt - a.playedAt);
      // Remove same song if it exists in items array to accurately count
      items = items.filter(i => i.id !== song.id);
      
      if (items.length >= 10) {
        // Delete oldest ones exceeding 9 (since we just added 1)
        const toDelete = items.slice(9);
        toDelete.forEach(item => {
          store.delete(item.id);
        });
      }
      resolve(recentSong);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ---- Preferences ----

export async function savePreference(key, value) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFS, 'readwrite');
    const store = tx.objectStore(STORE_PREFS);
    const request = store.put({ key, value });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPreference(key, defaultValue = null) {
  await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PREFS, 'readonly');
    const store = tx.objectStore(STORE_PREFS);
    const request = store.get(key);
    
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : defaultValue);
    };
    request.onerror = () => reject(request.error);
  });
}
