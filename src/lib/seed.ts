import { MedicalRecord } from '../types';
import { SAMPLE_RECORDS } from '../constants';
import { generateEmbedding } from './ai';
import { chunkText } from './ocr';
import { saveRecord, logAction } from './db';

export async function seedMedicalDatabase() {
  try {
    for (const sample of SAMPLE_RECORDS) {
      const chunks = chunkText(sample.content!);
      const embeddings = await Promise.all(chunks.map(c => generateEmbedding(c)));
      
      const record: MedicalRecord = {
        id: crypto.randomUUID(),
        title: sample.title!,
        content: sample.content!,
        type: sample.type!,
        date: sample.date!,
        source: sample.source!,
        tags: sample.tags!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chunks,
        embeddings
      };
      await saveRecord(record);
    }
    await logAction('access', 'Seeded sample medical records');
    return true;
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  }
}
