import { openDB, IDBPDatabase } from 'idb';
import { MedicalRecord, ChatMessage, AuditLog, UserProfile } from '../types';
import { encryptData, decryptData, vaultPassword } from './crypto';

const DB_NAME = 'pmi_enterprise_db';
const DB_VERSION = 3; // v3 adds vitals store

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('records')) {
        db.createObjectStore('records', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      // Added in v3
      if (!db.objectStoreNames.contains('vitals')) {
        db.createObjectStore('vitals', { keyPath: 'id' });
      }
    },
  });
}

async function securePut(store: string, id: string, data: any) {
  const db = await initDB();
  if (!vaultPassword) throw new Error('Vault is locked. Decryption key missing.');
  const encrypted = await encryptData(JSON.stringify(data), vaultPassword);
  await db.put(store, { id, enc: encrypted });
}

async function secureGetAll<T>(store: string): Promise<T[]> {
  const db = await initDB();
  const items = await db.getAll(store);
  if (!vaultPassword) return [];
  const results: T[] = [];
  for (const item of items) {
    if (item.enc) {
      try {
        const dec = await decryptData(item.enc, vaultPassword);
        results.push(JSON.parse(dec));
      } catch (e) {
        console.error(`Decryption failed for item ${item.id} in ${store}`);
      }
    }
  }
  return results;
}

export async function logAction(action: AuditLog['action'], details: string, metadata?: any) {
  const log: AuditLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    details,
    metadata
  };
  await securePut('audit_logs', log.id, log);
}

export async function saveRecord(record: MedicalRecord) {
  await securePut('records', record.id, record);
  await logAction('upload', `Saved record: ${record.title}`, { recordId: record.id });
}

export async function deleteRecord(id: string) {
  const db = await initDB();
  await db.delete('records', id);
  await logAction('delete', `Deleted record: ${id}`, { recordId: id });
}

export async function getAllRecords(): Promise<MedicalRecord[]> {
  return secureGetAll<MedicalRecord>('records');
}

export async function saveMessage(message: ChatMessage) {
  await securePut('messages', message.id, message);
  if (message.role === 'user') {
    await logAction('query', `User query: ${message.text.slice(0, 50)}...`);
  }
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  return secureGetAll<ChatMessage>('messages');
}

export async function saveProfile(profile: UserProfile) {
  await securePut('settings', 'user_profile', { id: 'user_profile', ...profile });
}

export async function getProfile(): Promise<UserProfile | undefined> {
  const db = await initDB();
  const item = await db.get('settings', 'user_profile');
  if (item && item.enc && vaultPassword) {
    try {
      const dec = await decryptData(item.enc, vaultPassword);
      const parsed = JSON.parse(dec);
      delete parsed.id;
      return parsed as UserProfile;
    } catch (e) {
      console.error('Failed decryption for profile');
    }
  }
  return undefined;
}

export async function updateProfileInsights(newPreferences: string[], newNuances: string[]) {
  const profile = await getProfile();
  if (!profile) return;

  const updatedProfile: UserProfile = {
    ...profile,
    preferences: Array.from(new Set([...(profile.preferences || []), ...newPreferences])),
    nuances: Array.from(new Set([...(profile.nuances || []), ...newNuances]))
  };

  await saveProfile(updatedProfile);
  await logAction('access', 'Updated profile with chat insights');
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  return secureGetAll<AuditLog>('audit_logs');
}

export async function wipeAllData() {
  const db = await initDB();
  const stores = ['records', 'messages', 'audit_logs', 'settings', 'vitals'];
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map(s => tx.objectStore(s).clear()));
  await tx.done;
}
