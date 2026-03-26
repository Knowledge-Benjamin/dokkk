import { GoogleGenAI } from '@google/genai';
import { getProfile, getAllRecords } from './db';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ScanMode = 'skin' | 'medication' | 'food' | 'lab';

export interface ScanResult {
  summary: string;
  findings: string[];
  warnings: string[];
  recommendations: string[];
  raw: string;
}

function imageToBase64Part(dataUrl: string) {
  const [meta, data] = dataUrl.split(',');
  const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
  return { inlineData: { data, mimeType } };
}

const systemPrompts: Record<ScanMode, string> = {
  skin: `You are a dermatology AI assistant. Analyze the skin/wound image provided.
Identify: visible skin condition, color, texture, size estimate, potential causes.
Flag any red flags: signs of infection, potential malignancy, requires urgent care.
Cross-reference patient allergies if relevant.
Output as JSON: { "summary": string, "findings": string[], "warnings": string[], "recommendations": string[] }
ALWAYS end with a disclaimer that this is NOT a diagnosis and the user should see a dermatologist.`,

  medication: `You are a clinical pharmacist AI. Analyze the medication image.
Identify: drug name, visible dosage, form (tablet/capsule/liquid).
Check if the identified drug could interact with the patient's known medications or allergies.
Output as JSON: { "summary": string, "findings": string[], "warnings": string[], "recommendations": string[] }
Include a disclaimer that interactions should be verified with a pharmacist.`,

  food: `You are a clinical nutritionist AI. Analyze this food/label image.
Identify: food items or label contents, estimated macronutrients, concerning ingredients.
Flag items that may be incompatible with the patient's chronic conditions (e.g., high sugar for diabetics, high sodium for hypertension).
Output as JSON: { "summary": string, "findings": string[], "warnings": string[], "recommendations": string[] }`,

  lab: `You are a clinical laboratory AI assistant. Parse and explain this lab report image.
Identify: test names, values, reference ranges, abnormal markers (high/low).
Explain each abnormal value in plain language.
Output as JSON: { "summary": string, "findings": string[], "warnings": string[], "recommendations": string[] }
Include disclaimer that results should be discussed with a physician.`
};

export async function analyzeImage(imageDataUrl: string, mode: ScanMode): Promise<ScanResult> {
  const profile = await getProfile();
  const records = await getAllRecords();

  const profileContext = profile ? `
Patient: ${profile.name}
Allergies: ${profile.allergies.join(', ') || 'None'}
Chronic Conditions: ${profile.chronicConditions.join(', ') || 'None'}
Current Medications (from vault): ${records.filter(r => r.type === 'prescription').map(r => r.title).join(', ') || 'None documented'}
` : '';

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${profileContext}\nAnalyze the following image:` },
          imageToBase64Part(imageDataUrl)
        ]
      }
    ],
    config: {
      systemInstruction: systemPrompts[mode],
      responseMimeType: 'application/json'
    }
  });

  try {
    const parsed = JSON.parse(response.text || '{}');
    return {
      summary: parsed.summary || 'Analysis complete.',
      findings: parsed.findings || [],
      warnings: parsed.warnings || [],
      recommendations: parsed.recommendations || [],
      raw: response.text || ''
    };
  } catch {
    return {
      summary: response.text || 'Could not parse response.',
      findings: [],
      warnings: [],
      recommendations: [],
      raw: response.text || ''
    };
  }
}
