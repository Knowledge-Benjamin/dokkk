import { useState, useRef } from 'react';
import { Camera, ScanLine, Pill, Apple, FlaskConical, Upload, Loader2, AlertTriangle, CheckCircle2, X, ZoomIn } from 'lucide-react';
import { analyzeImage, ScanMode, ScanResult } from '../lib/vision';

const MODES: { id: ScanMode; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'skin', label: 'Skin / Wound', icon: ScanLine, color: 'rose', desc: 'Analyze rashes, wounds, bruising, or skin changes' },
  { id: 'medication', label: 'Medication', icon: Pill, color: 'blue', desc: 'Identify pills & check for interactions with your vault' },
  { id: 'food', label: 'Food / Label', icon: Apple, color: 'green', desc: 'Analyze meals or nutrition labels vs your conditions' },
  { id: 'lab', label: 'Lab Report', icon: FlaskConical, color: 'amber', desc: 'Parse printed lab results into plain language' },
];

const colorMap: Record<string, string> = {
  rose: 'bg-rose-50 border-rose-200 text-rose-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
};

export default function SmartScanner() {
  const [mode, setMode] = useState<ScanMode>('skin');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedMode = MODES.find(m => m.id === mode)!;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImageDataUrl(ev.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
      setCameraOpen(true);
    } catch (e: any) {
      setError('Camera access denied: ' + e.message);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    canvasRef.current.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
    setImageDataUrl(dataUrl);
    setResult(null);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const analyze = async () => {
    if (!imageDataUrl) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await analyzeImage(imageDataUrl, mode);
      setResult(res);
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => { setImageDataUrl(null); setResult(null); setError(''); };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <ZoomIn className="text-teal-600" size={32} /> AI Smart Scanner
        </h2>
        <p className="text-slate-500">Powered by Gemini Vision. Point your camera at anything health-related — the AI cross-references your medical vault.</p>
      </header>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {MODES.map(m => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); reset(); }}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${mode === m.id ? colorMap[m.color] + ' border-2' : 'bg-white border-slate-200 hover:border-slate-300'}`}
            >
              <Icon size={22} className="mb-2" />
              <p className="font-bold text-sm">{m.label}</p>
              <p className="text-[10px] text-slate-500 leading-tight mt-1">{m.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Image Capture Area */}
      {!imageDataUrl ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center mb-6">
          {cameraOpen ? (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black">
                <video ref={videoRef} className="w-full" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <button onClick={captureFrame} className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">
                📸 Capture Photo
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl mx-auto flex items-center justify-center text-teal-600">
                <Camera size={32} />
              </div>
              <p className="text-slate-500 font-medium">Take a photo or upload an image</p>
              <p className="text-sm text-slate-400">Scanning mode: <strong className="text-slate-700">{selectedMode.label}</strong></p>
              <div className="flex gap-3 justify-center">
                <button onClick={openCamera} className="px-6 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 flex items-center gap-2">
                  <Camera size={18} /> Use Camera
                </button>
                <button onClick={() => fileRef.current?.click()} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 flex items-center gap-2">
                  <Upload size={18} /> Upload Image
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-72 flex items-center justify-center bg-slate-50">
            <img src={imageDataUrl} alt="captured" className="max-h-72 object-contain" />
            <button onClick={reset} className="absolute top-3 right-3 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-600 shadow">
              <X size={16} />
            </button>
          </div>
          <button
            onClick={analyze}
            disabled={analyzing}
            className="w-full py-4 bg-teal-600 text-white font-black text-lg rounded-2xl hover:bg-teal-700 flex items-center justify-center gap-3 disabled:opacity-60"
          >
            {analyzing ? <><Loader2 size={24} className="animate-spin" /> Analyzing with Gemini Vision...</> : <><ZoomIn size={24} /> Analyze Image</>}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 mb-6 text-rose-700">
          <AlertTriangle size={20} /> <span className="text-sm">{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-200 mb-1">{selectedMode.label} Analysis</p>
            <p className="text-lg font-bold leading-snug">{result.summary}</p>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {result.findings.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Findings</h4>
                <ul className="space-y-2">
                  {result.findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 size={14} className="text-teal-600 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.warnings.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Warnings</h4>
                <ul className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <AlertTriangle size={14} className="text-rose-600 mt-0.5 shrink-0" /> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.recommendations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-teal-600 font-bold shrink-0">{i + 1}.</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="px-6 pb-4">
            <button onClick={reset} className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 text-sm">Scan Another Image</button>
          </div>
        </div>
      )}
    </div>
  );
}
