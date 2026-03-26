import { pipeline } from '@xenova/transformers';
import { GoogleGenAI } from '@google/genai';
import { MedicalRecord, SearchResult, UserProfile } from '../types';
import { getAllRecords, getProfile } from './db';

let embedder: any = null;

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export async function searchContext(query: string, limit = 8): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const records = await getAllRecords();
  const results: SearchResult[] = [];

  for (const record of records) {
    if (!record.chunks || !record.embeddings) continue;
    
    for (let i = 0; i < record.chunks.length; i++) {
      const similarity = cosineSimilarity(queryEmbedding, record.embeddings[i]);
      results.push({
        recordId: record.id,
        recordTitle: record.title,
        text: record.chunks[i],
        score: similarity
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateGroundedResponse(query: string, context: SearchResult[]) {
  const profile = await getProfile();
  const contextText = context.map(c => `[Source: ${c.recordTitle} (${c.recordId})] ${c.text}`).join('\n\n');
  
  const profileContext = profile ? `
    Patient Profile:
    Name: ${profile.name}
    DOB: ${profile.dateOfBirth || 'Unknown'}
    Blood Type: ${profile.bloodType || 'Unknown'}
    Allergies: ${profile.allergies.join(', ') || 'None reported'}
    Chronic Conditions: ${profile.chronicConditions.join(', ') || 'None reported'}
  ` : '';

  const systemInstruction = `
    You are the PMI (Personal Medical Intelligence) System, a rugged, 100% offline medical brain.
    Your goal is to provide medical insights based ONLY on the provided patient records and profile.
    
    STRICT OPERATIONAL RULES:
    1. GROUNDING: Answer only using the retrieved chunks. If the information is not in the context, explicitly state: "I cannot find this information in your records."
    2. CITATIONS: Cite the exact source title/ID natively in the response (e.g., "According to [Visit Note 2024]...").
    3. NO HALLUCINATION: Do not use outside medical knowledge or general AI knowledge.
    4. DISCLAIMER: Every response MUST end with: "--- NOT MEDICAL ADVICE --- This information is retrieved from your personal records. Consult a licensed clinician for medical decisions."
    5. TONE: Professional, concise, and focused on patient safety.
    6. RED FLAGS: If the query suggests an emergency (e.g., "chest pain", "cannot breathe"), prioritize advising immediate physical medical attention.
  `;

  const prompt = `
    ${profileContext}
    
    Retrieved Medical Context:
    ${contextText}
    
    User Query: ${query}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction
    }
  });

  return response.text;
}
