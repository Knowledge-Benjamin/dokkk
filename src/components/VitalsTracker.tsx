import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Bluetooth, Camera, Plus, TrendingUp, Loader2, CheckCircle2, AlertTriangle, Activity, X, Wifi } from 'lucide-react';
import { measureHeartRate, connectBluetoothHeartRate, RppgResult } from '../lib/rppg';
import { saveVitalLog, getVitalLogs, VitalLog } from '../lib/vitals';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

type Tab = 'log' | 'scan' | 'history';

export default function VitalsTracker() {
  const [tab, setTab] = useState<Tab>('log');
  const [logs, setLogs] = useState<VitalLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Manual form state
  const [form, setForm] = useState({ heartRate: '', systolic: '', diastolic: '', glucose: '', weight: '', spo2: '', sleep: '', notes: '' });

  // rPPG state
  const [rppgStatus, setRppgStatus] = useState<'idle' | 'starting' | 'measuring' | 'done' | 'error'>('idle');
  const [rppgProgress, setRppgProgress] = useState(0);
  const [rppgMsg, setRppgMsg] = useState('');
  const [rppgResult, setRppgResult] = useState<RppgResult | null>(null);
  const [rppgError, setRppgError] = useState('');

  // Bluetooth state
  const [btLoading, setBtLoading] = useState(false);
  const [btBpm, setBtBpm] = useState<number | null>(null);
  const [btError, setBtError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    getVitalLogs().then(setLogs);
    return () => { stopCamera(); };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startRppg = async () => {
    setRppgStatus('starting');
    setRppgError('');
    setRppgResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRppgStatus('measuring');
      const result = await measureHeartRate(
        videoRef.current!,
        canvasRef.current!,
        (progress, msg) => { setRppgProgress(progress); setRppgMsg(msg); }
      );
      setRppgResult(result);
      setRppgStatus('done');
      stopCamera();
      // Auto-fill form
      setForm(f => ({ ...f, heartRate: String(result.bpm) }));
    } catch (e: any) {
      setRppgError(e.message || 'Camera error');
      setRppgStatus('error');
      stopCamera();
    }
  };

  const connectBluetooth = async () => {
    setBtLoading(true);
    setBtError('');
    setBtBpm(null);
    try {
      const bpm = await connectBluetoothHeartRate();
      setBtBpm(bpm);
      setForm(f => ({ ...f, heartRate: String(bpm) }));
    } catch (e: any) {
      setBtError(e.message || 'Bluetooth failed');
    } finally {
      setBtLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const log: VitalLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      heartRate: form.heartRate ? Number(form.heartRate) : undefined,
      systolic: form.systolic ? Number(form.systolic) : undefined,
      diastolic: form.diastolic ? Number(form.diastolic) : undefined,
      glucose: form.glucose ? Number(form.glucose) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      spo2: form.spo2 ? Number(form.spo2) : undefined,
      sleep: form.sleep ? Number(form.sleep) : undefined,
      notes: form.notes || undefined,
      source: rppgResult ? 'rppg' : btBpm ? 'bluetooth' : 'manual'
    };
    await saveVitalLog(log);
    const updated = await getVitalLogs();
    setLogs(updated);
    setIsSaving(false);
    setSaveSuccess(true);
    setForm({ heartRate: '', systolic: '', diastolic: '', glucose: '', weight: '', spo2: '', sleep: '', notes: '' });
    setRppgResult(null); setBtBpm(null);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const chartData = logs.slice(-20).map(l => ({
    time: format(new Date(l.timestamp), 'MM/dd HH:mm'),
    HR: l.heartRate,
    SBP: l.systolic,
    Glucose: l.glucose,
    SpO2: l.spo2,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Vitals Tracker</h2>
        <p className="text-slate-500">Contactless biometrics, Bluetooth wearables, or manual entry — all encrypted locally.</p>
      </header>

      <div className="flex gap-2 mb-8 bg-slate-100 p-1 rounded-2xl w-fit">
        {(['log', 'scan', 'history'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 rounded-xl font-bold text-sm capitalize transition-all ${tab === t ? 'bg-white shadow text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'log' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contactless + BT */}
          <div className="space-y-4">
            {/* rPPG Camera Scanner */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><Camera size={18} className="text-teal-600" /> Contactless Heart Rate</h3>
              <p className="text-xs text-slate-500 mb-4">Uses your front camera to detect facial color pulses (rPPG). No wearable needed.</p>

              {rppgStatus === 'idle' && (
                <button onClick={startRppg} className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 flex items-center justify-center gap-2">
                  <Camera size={18} /> Start Camera Scan (30s)
                </button>
              )}
              {(rppgStatus === 'starting' || rppgStatus === 'measuring') && (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 border-4 border-teal-400/70 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-teal-600 h-full rounded-full transition-all duration-500" style={{ width: `${rppgProgress}%` }} />
                  </div>
                  <p className="text-xs text-center text-slate-600">{rppgMsg || 'Initializing camera...'}</p>
                </div>
              )}
              {rppgStatus === 'done' && rppgResult && (
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center gap-4">
                  <div className="text-4xl font-black text-teal-700">{rppgResult.bpm}</div>
                  <div>
                    <p className="text-xs font-bold text-teal-900 uppercase tracking-widest">BPM detected</p>
                    <p className="text-xs text-teal-600">Confidence: <span className="font-bold capitalize">{rppgResult.confidence}</span></p>
                    <button onClick={() => { setRppgStatus('idle'); setRppgResult(null); }} className="text-xs text-teal-700 underline mt-1">Scan again</button>
                  </div>
                </div>
              )}
              {rppgStatus === 'error' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700 flex items-center gap-2">
                  <AlertTriangle size={16} /> {rppgError}
                  <button onClick={() => setRppgStatus('idle')} className="ml-auto"><X size={16} /></button>
                </div>
              )}
            </div>

            {/* Bluetooth */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><Bluetooth size={18} className="text-blue-600" /> Bluetooth Wearable</h3>
              <p className="text-xs text-slate-500 mb-4">Connect any BLE heart rate monitor (Polar, Garmin, etc.) via Chrome.</p>
              <button onClick={connectBluetooth} disabled={btLoading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
                {btLoading ? <Loader2 size={18} className="animate-spin" /> : <Bluetooth size={18} />}
                {btLoading ? 'Pairing...' : 'Connect BLE Device'}
              </button>
              {btBpm && <p className="mt-3 text-center text-2xl font-black text-blue-700">{btBpm} <span className="text-sm font-normal text-slate-500">BPM from wearable</span></p>}
              {btError && <p className="mt-2 text-xs text-rose-600 flex items-center gap-1"><AlertTriangle size={12} /> {btError}</p>}
            </div>
          </div>

          {/* Manual Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Plus size={18} className="text-slate-600" /> Manual Entry</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Heart Rate (BPM)', key: 'heartRate', unit: 'bpm', icon: '❤️' },
                { label: 'Blood Pressure SYS', key: 'systolic', unit: 'mmHg', icon: '🩸' },
                { label: 'Blood Pressure DIA', key: 'diastolic', unit: 'mmHg', icon: '🩸' },
                { label: 'Blood Glucose', key: 'glucose', unit: 'mg/dL', icon: '💉' },
                { label: 'Weight', key: 'weight', unit: 'kg', icon: '⚖️' },
                { label: 'SpO2', key: 'spo2', unit: '%', icon: '🫁' },
                { label: 'Sleep Duration', key: 'sleep', unit: 'hrs', icon: '😴' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{field.icon} {field.label}</label>
                  <input
                    type="number"
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.unit}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)..."
              rows={2}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
            />
            <button onClick={handleSave} disabled={isSaving} className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 flex items-center justify-center gap-2">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Plus size={18} />}
              {saveSuccess ? 'Saved to Vault!' : 'Save Vitals'}
            </button>
          </div>
        </div>
      )}

      {tab === 'scan' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2"><Activity size={20} className="text-teal-600" /><h3 className="font-bold text-slate-900 text-lg">Live Vitals — Camera Mode</h3></div>
          <p className="text-slate-500 text-sm mb-6">Point your front camera and hold still for a 30-second rPPG reading. Works best in good lighting.</p>
          {rppgStatus === 'idle' && (
            <button onClick={startRppg} className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 text-lg flex items-center justify-center gap-3">
              <Camera size={24} /> Begin Contactless Scan
            </button>
          )}
          {(rppgStatus === 'starting' || rppgStatus === 'measuring') && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-black" style={{ maxHeight: 360 }}>
                <video ref={videoRef} className="w-full object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-end p-4">
                  <div className="w-full bg-black/60 rounded-xl p-3">
                    <div className="w-full bg-white/30 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="bg-teal-400 h-full transition-all" style={{ width: `${rppgProgress}%` }} />
                    </div>
                    <p className="text-white text-xs text-center">{rppgMsg}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {rppgStatus === 'done' && rppgResult && (
            <div className="text-center py-10">
              <div className="text-8xl font-black text-teal-700 mb-2">{rppgResult.bpm}</div>
              <p className="text-2xl text-slate-600 font-bold mb-4">BPM</p>
              <p className="text-sm text-slate-500">Confidence: <span className={`font-bold ${rppgResult.confidence === 'high' ? 'text-teal-600' : rppgResult.confidence === 'medium' ? 'text-amber-600' : 'text-rose-600'}`}>{rppgResult.confidence}</span></p>
              <div className="flex gap-3 justify-center mt-6">
                <button onClick={() => { setForm(f => ({ ...f, heartRate: String(rppgResult.bpm) })); setTab('log'); }} className="px-6 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">Save to Vault</button>
                <button onClick={() => { setRppgStatus('idle'); setRppgResult(null); }} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Scan Again</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-8">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No vitals logged yet. Add your first reading above.</div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-teal-600" /> Trends (Last 20 Readings)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,.1)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="HR" stroke="#ef4444" strokeWidth={2} dot={false} name="Heart Rate" />
                  <Line type="monotone" dataKey="SBP" stroke="#3b82f6" strokeWidth={2} dot={false} name="Systolic BP" />
                  <Line type="monotone" dataKey="Glucose" stroke="#f59e0b" strokeWidth={2} dot={false} name="Glucose" />
                  <Line type="monotone" dataKey="SpO2" stroke="#10b981" strokeWidth={2} dot={false} name="SpO2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {logs.slice(-10).reverse().map(log => (
            <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap gap-4">
              <div className="text-xs text-slate-400 font-mono w-full mb-2">{format(new Date(log.timestamp), 'MMMM dd, yyyy HH:mm')} · <span className="capitalize">{log.source}</span></div>
              {log.heartRate && <div className="text-center"><p className="text-2xl font-black text-rose-600">{log.heartRate}</p><p className="text-[10px] font-bold text-slate-400 uppercase">BPM</p></div>}
              {log.systolic && log.diastolic && <div className="text-center"><p className="text-2xl font-black text-blue-600">{log.systolic}/{log.diastolic}</p><p className="text-[10px] font-bold text-slate-400 uppercase">BP mmHg</p></div>}
              {log.glucose && <div className="text-center"><p className="text-2xl font-black text-amber-600">{log.glucose}</p><p className="text-[10px] font-bold text-slate-400 uppercase">mg/dL</p></div>}
              {log.spo2 && <div className="text-center"><p className="text-2xl font-black text-teal-600">{log.spo2}</p><p className="text-[10px] font-bold text-slate-400 uppercase">SpO2%</p></div>}
              {log.sleep && <div className="text-center"><p className="text-2xl font-black text-purple-600">{log.sleep}</p><p className="text-[10px] font-bold text-slate-400 uppercase">Sleep hrs</p></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
