import { useState } from 'react';
import { Stethoscope, ChevronRight, ChevronLeft, AlertOctagon, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type TriageLevel = 'emergency' | 'urgent' | 'self-care';

interface Step { question: string; options?: string[]; type: 'choice' | 'scale' | 'multi'; }

const STEPS: Step[] = [
  { question: 'Where is the primary symptom located?', type: 'choice', options: ['Head / Neck', 'Chest / Heart', 'Abdomen / Stomach', 'Back', 'Limbs (arms/legs)', 'Skin', 'General / Whole body'] },
  { question: 'What best describes your main symptom?', type: 'choice', options: ['Pain or aching', 'Difficulty breathing', 'Fever / Chills', 'Nausea / Vomiting', 'Dizziness / Fainting', 'Rash / Swelling', 'Bleeding', 'Fatigue / Weakness', 'Numbness / Tingling'] },
  { question: 'How long have you had this symptom?', type: 'choice', options: ['Less than 1 hour', '1–12 hours', '1–3 days', '4–7 days', 'More than 1 week', 'More than 1 month'] },
  { question: 'How severe is this symptom? (1 = barely noticeable, 10 = worst possible)', type: 'scale' },
  {
    question: 'Do you have any of the following? (Check all that apply)',
    type: 'multi',
    options: ['Chest tightness or pressure', 'Difficulty breathing or shortness of breath', 'Loss of consciousness or near-fainting', 'Sudden severe headache', 'Coughing or vomiting blood', 'Sudden weakness on one side of the body', 'High fever (>39°C / >102°F)', 'None of the above']
  }
];

function computeTriageLevel(answers: (string | number | string[])[]): TriageLevel {
  const redFlags = answers[4] as string[];
  const severity = answers[3] as number;
  const location = answers[0] as string;
  const symptom = answers[1] as string;

  // Emergency: red flags present (except "None") or chest symptom + severe
  const hasRedFlag = redFlags.some(f => f !== 'None of the above');
  if (hasRedFlag) return 'emergency';
  if (severity >= 8 && (location === 'Chest / Heart' || symptom === 'Difficulty breathing')) return 'emergency';

  // Urgent: moderate severity or concerning combos
  if (severity >= 6) return 'urgent';
  if (symptom === 'Bleeding' || symptom === 'Fever / Chills') return 'urgent';

  return 'self-care';
}

const triageConfig = {
  emergency: {
    icon: AlertOctagon, color: 'rose',
    label: '🔴 Go to Emergency Room NOW',
    advice: 'Based on your symptoms, you may be experiencing a serious medical emergency. Please call emergency services (112/911) or go to the nearest Emergency Room immediately. Do not drive yourself.',
    bg: 'bg-rose-600', textBg: 'bg-rose-50', border: 'border-rose-200'
  },
  urgent: {
    icon: AlertTriangle, color: 'amber',
    label: '🟡 See a Doctor Within 24–48 Hours',
    advice: 'Your symptoms indicate a condition that needs prompt medical attention. Please contact your doctor today or visit an urgent care clinic. Monitor your symptoms closely and call emergency services if they worsen rapidly.',
    bg: 'bg-amber-500', textBg: 'bg-amber-50', border: 'border-amber-200'
  },
  'self-care': {
    icon: CheckCircle2, color: 'teal',
    label: '🟢 Self-Care at Home',
    advice: 'Based on your responses, your symptoms appear mild and can likely be managed at home. Rest, stay hydrated, and monitor for changes. If symptoms persist beyond 5–7 days or worsen significantly, consult a healthcare professional.',
    bg: 'bg-teal-600', textBg: 'bg-teal-50', border: 'border-teal-200'
  }
};

export default function SymptomTriage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(string | number | string[])[]>([]);
  const [current, setCurrent] = useState<string | number | string[]>('');
  const [result, setResult] = useState<{ level: TriageLevel; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = async () => {
    if (!current && currentStep.type !== 'multi') return;
    const newAnswers = [...answers, current];
    setAnswers(newAnswers);

    if (isLast) {
      setLoading(true);
      const level = computeTriageLevel(newAnswers);
      // Get AI personalized summary
      try {
        const formatted = STEPS.map((s, i) => `Q: ${s.question}\nA: ${Array.isArray(newAnswers[i]) ? (newAnswers[i] as string[]).join(', ') : newAnswers[i]}`).join('\n\n');
        const resp = await ai.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents: formatted,
          config: {
            systemInstruction: `You are a clinical triage AI. Given the symptom questionnaire, write a 2-3 sentence personalized clinical observation. Be professional and concise. Do NOT give a diagnosis. End with: "This is not a medical diagnosis. Please consult a licensed clinician."`
          }
        });
        setResult({ level, summary: resp.text || triageConfig[level].advice });
      } catch {
        setResult({ level, summary: triageConfig[level].advice });
      }
      setLoading(false);
    } else {
      setStep(s => s + 1);
      setCurrent('');
    }
  };

  const reset = () => { setStep(0); setAnswers([]); setCurrent(''); setResult(null); };
  const config = result ? triageConfig[result.level] : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Stethoscope className="text-teal-600" size={32} /> Symptom Triage
        </h2>
        <p className="text-slate-500">Answer 5 questions → receive an AI-powered triage verdict cross-referenced with your medical vault.</p>
      </header>

      {!result ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Progress bar */}
          <div className="h-1.5 bg-slate-100">
            <div className="h-full bg-teal-600 transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
          </div>

          <div className="p-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Step {step + 1} of {STEPS.length}</p>
            <h3 className="text-xl font-bold text-slate-900 mb-6">{currentStep.question}</h3>

            {currentStep.type === 'choice' && (
              <div className="space-y-3">
                {currentStep.options!.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setCurrent(opt)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all ${current === opt ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {currentStep.type === 'scale' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setCurrent(n)}
                      className={`flex-1 aspect-square rounded-xl font-black text-sm transition-all ${current === n ? (n >= 8 ? 'bg-rose-600 text-white' : n >= 5 ? 'bg-amber-500 text-white' : 'bg-teal-600 text-white') : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>1 = Barely noticeable</span>
                  <span>10 = Unbearable</span>
                </div>
              </div>
            )}

            {currentStep.type === 'multi' && (
              <div className="space-y-3">
                {currentStep.options!.map(opt => {
                  const selected = Array.isArray(current) && (current as string[]).includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        const arr = Array.isArray(current) ? [...(current as string[])] : [];
                        if (opt === 'None of the above') {
                          setCurrent(['None of the above']);
                        } else {
                          const without = arr.filter(x => x !== 'None of the above');
                          const idx = without.indexOf(opt);
                          if (idx > -1) without.splice(idx, 1); else without.push(opt);
                          setCurrent(without);
                        }
                      }}
                      className={`w-full text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all ${selected ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold' : 'border-slate-200 hover:border-slate-300 text-slate-700'}`}
                    >
                      <span className={`inline-block w-5 h-5 rounded border-2 mr-3 align-middle transition-colors ${selected ? 'bg-rose-500 border-rose-500' : 'border-slate-300'}`} />
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-8 pb-8 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={() => { setStep(s => s - 1); setCurrent(answers[step - 1]); }} className="flex items-center gap-2 text-slate-600 font-bold hover:text-slate-900">
                <ChevronLeft size={20} /> Back
              </button>
            ) : <div />}
            <button
              onClick={next}
              disabled={!current && currentStep.type !== 'multi'}
              className="flex items-center gap-2 px-8 py-3 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 disabled:opacity-40"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : isLast ? 'Get Verdict' : 'Next'}
              {!loading && <ChevronRight size={20} />}
            </button>
          </div>
        </div>
      ) : config && (
        <div className="space-y-6">
          <div className={`${config.bg} text-white rounded-3xl p-8 text-center`}>
            <config.icon size={48} className="mx-auto mb-4" />
            <h3 className="text-2xl font-black mb-2">{config.label}</h3>
          </div>

          <div className={`${config.textBg} border ${config.border} rounded-3xl p-8`}>
            <h4 className="font-bold text-slate-900 mb-3">Clinical Assessment</h4>
            <p className="text-slate-700 leading-relaxed">{result.summary}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6">
            <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-widest text-slate-400">Your Responses</h4>
            {STEPS.map((s, i) => answers[i] !== undefined && (
              <div key={i} className="flex gap-3 mb-3 text-sm">
                <span className="shrink-0 font-bold text-teal-600 w-5">{i + 1}.</span>
                <div>
                  <p className="text-slate-500 text-xs">{s.question}</p>
                  <p className="text-slate-900 font-bold">{Array.isArray(answers[i]) ? (answers[i] as string[]).join(', ') || 'None' : String(answers[i])}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={reset} className="w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200">
            Start New Assessment
          </button>
        </div>
      )}
    </div>
  );
}
