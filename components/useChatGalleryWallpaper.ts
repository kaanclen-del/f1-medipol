"use client";

import { useCallback, useEffect, useState } from "react";

// Kisisel sohbet arka planlari Supabase'e yuklenmez; kullanicinin bu tarayicisinda saklanir.
// localStorage'da buyuk base64 saklamak yerine IndexedDB Blob kullanilir.
const DATABASE = "f1-medipol-chat-wallpapers";
const STORE = "images";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Bu tarayıcı galeri arka planlarını saklayamıyor.')); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Tarayıcı depolama alanı açılamadı.'));
    request.onblocked = () => reject(new Error('Galerinin kaydedilmesi engellendi. Diğer site sekmelerini kapatıp tekrar dene.'));
  });
}

async function readImage(key: string): Promise<Blob | null> {
  const db = await openDatabase();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error ?? new Error('Kayıtlı fotoğraf okunamadı.'));
    });
  } finally { db.close(); }
}

async function saveImage(key: string, image: Blob): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(image, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Fotoğraf saklanamadı.'));
      tx.onabort = () => reject(tx.error ?? new Error('Fotoğraf saklanamadı.'));
    });
  } finally { db.close(); }
}

async function shrinkPhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new Error('JPG, PNG, WEBP veya telefonunun desteklediği bir fotoğraf seç.');
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Fotoğraf en fazla 12 MB olabilir.');
  const imageUrl = URL.createObjectURL(file);
  try {
    const picture = new Image();
    await new Promise<void>((resolve, reject) => {
      picture.onload = () => resolve();
      picture.onerror = () => reject(new Error('Fotoğraf açılamadı. JPG veya PNG olarak tekrar dene.'));
      picture.src = imageUrl;
    });
    const w = picture.naturalWidth;
    const h = picture.naturalHeight;
    if (!w || !h) throw new Error('Fotoğraf boyutları okunamadı.');
    const scale = Math.min(1, 1400 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Bu tarayıcı fotoğrafı işleyemiyor.');
    context.fillStyle = '#151922';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    if (!blob) throw new Error('Fotoğraf dönüştürülemedi.');
    return blob;
  } finally { URL.revokeObjectURL(imageUrl); }
}

export function useChatGalleryWallpaper(userId: string | null, chatId: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const key = userId && chatId ? `${userId}:${chatId}` : null;

  useEffect(() => {
    let cancelled = false;
    let issuedUrl: string | null = null;
    setUrl(null);
    setError('');
    if (key) {
      void readImage(key).then(blob => {
        if (!blob || cancelled) return;
        issuedUrl = URL.createObjectURL(blob);
        setUrl(issuedUrl);
      }).catch(() => { if (!cancelled) setError('Kayıtlı fotoğraf okunamadı.'); });
    }
    return () => {
      cancelled = true;
      if (issuedUrl) URL.revokeObjectURL(issuedUrl);
    };
  }, [key, version]);

  const save = useCallback(async (file: File): Promise<boolean> => {
    if (!key) return false;
    setSaving(true);
    setError('');
    try {
      const compressed = await shrinkPhoto(file);
      await saveImage(key, compressed);
      setVersion(value => value + 1);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Fotoğraf kaydedilemedi.');
      return false;
    } finally { setSaving(false); }
  }, [key]);

  return { url, saving, error, save };
}
