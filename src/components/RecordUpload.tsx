import React, { useState, useRef } from 'react';
import { Camera, FileUp, Upload, CheckCircle2, Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { performOCR, chunkText } from '../lib/ocr';
import { generateEmbedding } from '../lib/ai';
import { saveRecord } from '../lib/db';
import { MedicalRecord, RecordType } from '../types';

export default function RecordUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState<RecordType>('manual_entry');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processText = async (text: string, title: string, type: RecordType, source: string) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(false);
    
    try {
      if (!text || text.trim().length < 10) {
        throw new Error('Content is too short to be a valid medical record.');
      }

      setProgress('Chunking and embedding text...');
      const chunks = chunkText(text);
      const embeddings = await Promise.all(chunks.map(chunk => generateEmbedding(chunk)));

      const record: MedicalRecord = {
        id: crypto.randomUUID(),
        title,
        content: text,
        type,
        date: new Date().toISOString(),
        source,
        tags: [type],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chunks,
        embeddings
      };

      setProgress('Saving to local vault...');
      await saveRecord(record);
      
      setSuccess(true);
      setProgress('');
      setManualText('');
      setManualTitle('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setProgress('Performing OCR on document...');
    const text = await performOCR(file);
    await processText(text, file.name.split('.')[0], 'visit_note', 'File Upload');
  };

  const handleManualSubmit = async () => {
    if (!manualTitle) {
      setError('Please provide a title for the entry.');
      return;
    }
    await processText(manualText, manualTitle, manualType, 'Manual Entry');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Ingestion Pipeline</h2>
        <p className="text-slate-500">Securely add records to your persistent medical vault.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="medical-card flex flex-col items-center justify-center gap-4 py-12 border-dashed border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50/30 transition-all group"
        >
          <div className="p-4 bg-teal-50 rounded-full text-teal-600 group-hover:scale-110 transition-transform">
            <Camera size={32} />
          </div>
          <div className="text-center">
            <h4 className="font-bold text-slate-900">Scan Paper Record</h4>
            <p className="text-sm text-slate-500">OCR physical notes locally</p>
          </div>
        </button>

        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="medical-card flex flex-col items-center justify-center gap-4 py-12 border-dashed border-2 border-slate-300 hover:border-teal-500 hover:bg-teal-50/30 transition-all group"
        >
          <div className="p-4 bg-teal-50 rounded-full text-teal-600 group-hover:scale-110 transition-transform">
            <FileUp size={32} />
          </div>
          <div className="text-center">
            <h4 className="font-bold text-slate-900">Upload Digital File</h4>
            <p className="text-sm text-slate-500">PDF, JPG, PNG processed on-device</p>
          </div>
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,application/pdf"
        onChange={handleFileUpload}
      />

      {isProcessing && (
        <div className="medical-card bg-teal-50 border-teal-200 flex items-center gap-4 mb-6">
          <Loader2 className="animate-spin text-teal-600" size={24} />
          <div>
            <p className="font-bold text-teal-900">Processing Pipeline Active...</p>
            <p className="text-sm text-teal-700">{progress}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="medical-card bg-emerald-50 border-emerald-200 flex items-center gap-4 mb-6">
          <CheckCircle2 className="text-emerald-600" size={24} />
          <div>
            <p className="font-bold text-emerald-900">Record Vaulted Successfully</p>
            <p className="text-sm text-emerald-700">The document has been encrypted and indexed.</p>
          </div>
          <button onClick={() => setSuccess(false)} className="ml-auto text-emerald-600"><X size={20} /></button>
        </div>
      )}

      {error && (
        <div className="medical-card bg-rose-50 border-rose-200 flex items-center gap-4 mb-6">
          <AlertCircle className="text-rose-600" size={24} />
          <div>
            <p className="font-bold text-rose-900">Pipeline Error</p>
            <p className="text-sm text-rose-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-rose-600"><X size={20} /></button>
        </div>
      )}

      <div className="mt-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Plus size={20} className="text-teal-600" />
          Manual Entry / Symptom Log
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Title</label>
            <input 
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              placeholder="e.g., Morning Headache Log"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Record Type</label>
            <select 
              value={manualType}
              onChange={(e) => setManualType(e.target.value as RecordType)}
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            >
              <option value="manual_entry">General Note</option>
              <option value="symptom_log">Symptom Log</option>
              <option value="prescription">Prescription</option>
              <option value="visit_note">Visit Note</option>
            </select>
          </div>
        </div>

        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Content</label>
        <textarea 
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          className="w-full h-40 p-4 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          placeholder="Describe symptoms, medications, or doctor instructions..."
        ></textarea>
        
        <button 
          onClick={handleManualSubmit}
          disabled={isProcessing || !manualText || !manualTitle}
          className="mt-6 w-full py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          Securely Save to Vault
        </button>
      </div>
    </div>
  );
}
