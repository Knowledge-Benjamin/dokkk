import { openDB } from 'idb';
import { encryptData, decryptData, vaultPassword } from './crypto';

export interface VitalLog {
  id: string;
  timestamp: string;
  heartRate?: number;    // BPM
  systolic?: number;     // mmHg
  diastolic?: number;    // mmHg
  glucose?: number;      // mg/dL
  weight?: number;       // kg
  spo2?: number;         // %
  sleep?: number;        // hours
  source: 'manual' | 'rppg' | 'bluetooth';
  notes?: string;
}

const DB_NAME = 'pmi_enterprise_db';
const DB_VERSION = 3;

async function getVitalsDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Preserve existing stores
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
      // New store for vitals
      if (!db.objectStoreNames.contains('vitals')) {
        db.createObjectStore('vitals', { keyPath: 'id' });
      }
    }
  });
}

export async function saveVitalLog(log: VitalLog): Promise<void> {
  const db = await getVitalsDB();
  if (!vaultPassword) throw new Error('Vault is locked');
  const encrypted = await encryptData(JSON.stringify(log), vaultPassword);
  await db.put('vitals', { id: log.id, enc: encrypted });
}

export async function getVitalLogs(): Promise<VitalLog[]> {
  const db = await getVitalsDB();
  const items = await db.getAll('vitals');
  if (!vaultPassword) return [];
  const results: VitalLog[] = [];
  for (const item of items) {
    if (item.enc) {
      try {
        const dec = await decryptData(item.enc, vaultPassword);
        results.push(JSON.parse(dec));
      } catch {
        // skip corrupted entries
      }
    }
  }
  return results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function getLatestVitals(): Promise<VitalLog | null> {
  const logs = await getVitalLogs();
  return logs.length > 0 ? logs[logs.length - 1] : null;
}
