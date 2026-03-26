import { openDB, IDBPDatabase } from 'idb';
import { MedicalRecord, ChatMessage, AuditLog, UserProfile } from '../types';

const DB_NAME = 'pmi_enterprise_db';
const DB_VERSION = 2;

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
    },
  });
}

export async function logAction(action: AuditLog['action'], details: string, metadata?: any) {
  const db = await initDB();
  const log: AuditLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    details,
    metadata
  };
  await db.put('audit_logs', log);
}

export async function saveRecord(record: MedicalRecord) {
  const db = await initDB();
  await db.put('records', record);
  await logAction('upload', `Saved record: ${record.title}`, { recordId: record.id });
}

export async function deleteRecord(id: string) {
  const db = await initDB();
  await db.delete('records', id);
  await logAction('delete', `Deleted record: ${id}`, { recordId: id });
}

export async function getAllRecords(): Promise<MedicalRecord[]> {
  const db = await initDB();
  return db.getAll('records');
}

export async function saveMessage(message: ChatMessage) {
  const db = await initDB();
  await db.put('messages', message);
  if (message.role === 'user') {
    await logAction('query', `User query: ${message.text.slice(0, 50)}...`);
  }
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const db = await initDB();
  return db.getAll('messages');
}

export async function saveProfile(profile: UserProfile) {
  const db = await initDB();
  await db.put('settings', { id: 'user_profile', ...profile });
}

export async function getProfile(): Promise<UserProfile | undefined> {
  const db = await initDB();
  const data = await db.get('settings', 'user_profile');
  return data;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const db = await initDB();
  return db.getAll('audit_logs');
}

export async function wipeAllData() {
  const db = await initDB();
  const tx = db.transaction(['records', 'messages', 'audit_logs', 'settings'], 'readwrite');
  await Promise.all([
    tx.objectStore('records').clear(),
    tx.objectStore('messages').clear(),
    tx.objectStore('audit_logs').clear(),
    tx.objectStore('settings').clear(),
  ]);
  await tx.done;
}
