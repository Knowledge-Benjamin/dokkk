import { initDB } from './db';
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

export async function saveVitalLog(log: VitalLog): Promise<void> {
  const db = await initDB();
  if (!vaultPassword) throw new Error('Vault is locked');
  const encrypted = await encryptData(JSON.stringify(log), vaultPassword);
  await db.put('vitals', { id: log.id, enc: encrypted });
}

export async function getVitalLogs(): Promise<VitalLog[]> {
  const db = await initDB();
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
