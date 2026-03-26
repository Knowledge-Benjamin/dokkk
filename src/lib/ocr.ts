import { createWorker } from 'tesseract.js';

export async function performOCR(imageSource: string | File): Promise<string> {
  const worker = await createWorker('eng+spa+fra+deu');
  const { data: { text } } = await worker.recognize(imageSource);
  await worker.terminate();
  return text;
}

export function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  
  return chunks;
}
