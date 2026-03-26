/**
 * Web Crypto API based AES-GCM encryption/decryption
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

async function getEncryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await getEncryptionKey(password, salt);
  
  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    enc.encode(data)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encryptedBase64: string, password: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedBase64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 16 + IV_LENGTH);
  const encrypted = combined.slice(16 + IV_LENGTH);

  const key = await getEncryptionKey(password, salt);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    encrypted
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}
