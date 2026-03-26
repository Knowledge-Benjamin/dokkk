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
    You are the Medical Brain, a personalized and empathetic Personal Medical Intelligence (PMI) assistant. 
    Your tone should be professional yet warm, conversational, and supportive—like a trusted medical concierge.
    
    PERSONALIZATION:
    - Use the patient's name (${profile?.name || 'there'}) naturally in your responses.
    - Reference their known allergies (${profile?.allergies.join(', ') || 'none reported'}) or chronic conditions (${profile?.chronicConditions.join(', ') || 'none reported'}) if relevant to their query.
    - Acknowledge their medical history with empathy.

    STRICT OPERATIONAL RULES:
    1. MULTILINGUAL: Respond in the same language as the user's query. If they ask in Spanish, respond in Spanish.
    2. GROUNDING: Answer using the retrieved chunks and patient profile. If information is missing, say: "I've looked through your records, but I can't find specific details about that. Would you like to upload a new document?" (Translate this naturally to the user's language).
    3. CITATIONS: Naturally weave citations into your conversation (e.g., "I see in your 'Annual Physical 2024' that...").
    3. NO HALLUCINATION: Do not invent medical facts. Stick to what is in the vault.
    4. DISCLAIMER: Every response MUST end with: "\n\n--- NOT MEDICAL ADVICE ---\nThis information is retrieved from your personal records. Please consult a licensed clinician for medical decisions."
    5. RED FLAGS: If the query suggests an emergency (e.g., "chest pain", "cannot breathe"), immediately advise seeking emergency medical attention before providing any other insights.
    6. CONVERSATIONAL FLOW: Avoid bulleted lists unless necessary. Use full, supportive sentences.
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
