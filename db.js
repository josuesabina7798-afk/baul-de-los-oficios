// --- Base de Datos Local utilizando IndexedDB ---

const DB_NAME = 'OficiosDB';
const DB_VERSION = 5; // Incrementamos para el store de comentarios
const STORE_VIDEOS = 'videos';
const STORE_MESSAGES = 'messages';
const STORE_SETTINGS = 'settings';
const STORE_DIRECT_MSGS = 'direct_messages';
const STORE_COMMENTS = 'comments';

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('Error al abrir la base de datos');

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
        db.createObjectStore(STORE_VIDEOS, { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        db.createObjectStore(STORE_MESSAGES, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORE_DIRECT_MSGS)) {
        db.createObjectStore(STORE_DIRECT_MSGS, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORE_COMMENTS)) {
        const commentStore = db.createObjectStore(STORE_COMMENTS, { keyPath: 'id', autoIncrement: true });
        commentStore.createIndex('videoId', 'videoId', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
  });
};

export const saveVideo = async (videoData) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_VIDEOS], 'readwrite');
    const store = transaction.objectStore(STORE_VIDEOS);
    const request = store.add(videoData);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject('Error en la transacción de guardado');
  });
};

export const getAllVideos = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_VIDEOS], 'readonly');
    const store = transaction.objectStore(STORE_VIDEOS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Error al obtener videos');
  });
};

export const deleteVideo = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_VIDEOS], 'readwrite');
    const store = transaction.objectStore(STORE_VIDEOS);
    const request = store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Error al borrar video');
  });
};

export const saveMessage = async (messageData) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORE_MESSAGES);
    const request = store.add(messageData);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject('Error al guardar mensaje');
  });
};

export const getAllMessages = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_MESSAGES], 'readonly');
    const store = transaction.objectStore(STORE_MESSAGES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Error al obtener mensajes');
  });
};

export const deleteMessage = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORE_MESSAGES);
    const request = store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Error al borrar mensaje');
  });
};

export const setSetting = async (key, value) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    store.put({ key, value });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Error al guardar configuración');
  });
};

export const getSetting = async (key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SETTINGS], 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ? request.result.value : null);
    request.onerror = () => reject('Error al obtener configuración');
  });
};

export const saveDirectMessage = async (msg) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DIRECT_MSGS], 'readwrite');
    const store = transaction.objectStore(STORE_DIRECT_MSGS);
    const request = store.add(msg);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject('Error al enviar mensaje privado');
  });
};

export const getDirectMessages = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DIRECT_MSGS], 'readonly');
    const store = transaction.objectStore(STORE_DIRECT_MSGS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Error al obtener mensajes privados');
  });
};

export const deleteDirectMessage = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_DIRECT_MSGS], 'readwrite');
    const store = transaction.objectStore(STORE_DIRECT_MSGS);
    const request = store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Error al borrar mensaje privado');
  });
};

// --- Comentarios por Video ---

export const saveComment = async (comment) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_COMMENTS], 'readwrite');
    const store = transaction.objectStore(STORE_COMMENTS);
    const request = store.add(comment);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject('Error al guardar comentario');
  });
};

export const getCommentsByVideo = async (videoId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_COMMENTS], 'readonly');
    const store = transaction.objectStore(STORE_COMMENTS);
    const index = store.index('videoId');
    const request = index.getAll(videoId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Error al obtener comentarios');
  });
};

export const deleteComment = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_COMMENTS], 'readwrite');
    const store = transaction.objectStore(STORE_COMMENTS);
    const request = store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Error al borrar comentario');
  });
};
