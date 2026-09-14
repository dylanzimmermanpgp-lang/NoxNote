/**
 * db.js
 * Capa de almacenamiento 100% local usando IndexedDB.
 * No se usa ninguna red: todo vive en el dispositivo del usuario.
 */
const DB_NAME = 'cuaderno_db';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';
const STORE_CATEGORIES = 'categories';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const store = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
        store.createIndex('modifiedAt', 'modifiedAt', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('archived', 'archived', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function uid() {
  return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

const DB = {
  async allNotes() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTES, 'readonly');
      const store = tx.objectStore(STORE_NOTES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => b.modifiedAt - a.modifiedAt));
      req.onerror = () => reject(req.error);
    });
  },

  async getNote(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTES, 'readonly');
      const req = tx.objectStore(STORE_NOTES).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async saveNote(note) {
    const db = await openDB();
    note.modifiedAt = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      tx.objectStore(STORE_NOTES).put(note);
      tx.oncomplete = () => resolve(note);
      tx.onerror = () => reject(tx.error);
    });
  },

  async deleteNote(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      tx.objectStore(STORE_NOTES).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async newNote(mode) {
    const now = Date.now();
    const note = {
      id: uid(),
      title: '',
      category: 'Sin categoria',
      mode: mode === 'freeform' ? 'freeform' : 'text',
      pinned: false,
      locked: false,
      archived: false,
      createdAt: now,
      modifiedAt: now,
      // Modo texto tradicional
      text: '',
      // Modo libre: lista de elementos {id,type,x,y,w,h,rot,z,...}
      elements: [],
      canvasHeight: 900,
      bg: 'dot' // patron de fondo: dot | grid | plain
    };
    await this.saveNote(note);
    return note;
  },

  async duplicateNote(id) {
    const original = await this.getNote(id);
    if (!original) return null;
    const now = Date.now();
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = uid();
    copy.title = (original.title || 'Sin titulo') + ' (copia)';
    copy.createdAt = now;
    copy.modifiedAt = now;
    copy.pinned = false;
    await this.saveNote(copy);
    return copy;
  },

  async allCategories() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CATEGORIES, 'readonly');
      const req = tx.objectStore(STORE_CATEGORIES).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async addCategory(name) {
    const db = await openDB();
    const cat = { id: 'c_' + Date.now().toString(36), name };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
      tx.objectStore(STORE_CATEGORIES).put(cat);
      tx.oncomplete = () => resolve(cat);
      tx.onerror = () => reject(tx.error);
    });
  }
};
