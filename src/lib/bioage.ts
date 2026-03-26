// Inline VitalLog to avoid circular/ordering issues with the IDE
interface VitalLog {
  id: string;
  timestamp: string;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  weight?: number;
  spo2?: number;
  sleep?: number;
  source: 'manual' | 'rppg' | 'bluetooth';
  notes?: string;
}

export type { VitalLog };

export interface BioAgeResult {
  bioAge: number;
  chronologicalAge: number;
  delta: number; // positive = older, negative = younger
  score: number; // 0-100 health score
  breakdown: { metric: string; score: number; label: string }[];
}

/** Score a single metric 0-100 based on clinical optimal range */
function scoreMetric(value: number, optimalMin: number, optimalMax: number, absoluteMin: number, absoluteMax: number): number {
  if (value >= optimalMin && value <= optimalMax) return 100;
  if (value < absoluteMin || value > absoluteMax) return 0;
  if (value < optimalMin) {
    return 100 * (value - absoluteMin) / (optimalMin - absoluteMin);
  }
  return 100 * (absoluteMax - value) / (absoluteMax - optimalMax);
}

export function calculateBioAge(logs: VitalLog[], dateOfBirth?: string): BioAgeResult {
  // Calculate chronological age
  const chronologicalAge = dateOfBirth
    ? Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 35; // default if unknown

  if (logs.length === 0) {
    return { bioAge: chronologicalAge, chronologicalAge, delta: 0, score: 50, breakdown: [] };
  }

  // Use last 30 days of data, averaged
  const recent = logs.slice(-30);
  const avg = (key: keyof VitalLog) => {
    const vals = recent.map(l => l[key] as number).filter(v => v !== undefined && v > 0);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const breakdown: { metric: string; score: number; label: string }[] = [];

  const hrAvg = avg('heartRate');
  if (hrAvg !== null) {
    const s = scoreMetric(hrAvg, 55, 75, 40, 110);
    breakdown.push({ metric: 'Resting Heart Rate', score: s, label: `${Math.round(hrAvg)} BPM` });
  }

  const sysAvg = avg('systolic');
  if (sysAvg !== null) {
    const s = scoreMetric(sysAvg, 100, 120, 70, 160);
    breakdown.push({ metric: 'Systolic BP', score: s, label: `${Math.round(sysAvg)} mmHg` });
  }

  const diaAvg = avg('diastolic');
  if (diaAvg !== null) {
    const s = scoreMetric(diaAvg, 60, 80, 40, 100);
    breakdown.push({ metric: 'Diastolic BP', score: s, label: `${Math.round(diaAvg)} mmHg` });
  }

  const glucoseAvg = avg('glucose');
  if (glucoseAvg !== null) {
    const s = scoreMetric(glucoseAvg, 70, 99, 50, 180);
    breakdown.push({ metric: 'Blood Glucose', score: s, label: `${Math.round(glucoseAvg)} mg/dL` });
  }

  const spo2Avg = avg('spo2');
  if (spo2Avg !== null) {
    const s = scoreMetric(spo2Avg, 97, 100, 90, 100);
    breakdown.push({ metric: 'SpO2', score: s, label: `${Math.round(spo2Avg)}%` });
  }

  const sleepAvg = avg('sleep');
  if (sleepAvg !== null) {
    const s = scoreMetric(sleepAvg, 7, 9, 3, 12);
    breakdown.push({ metric: 'Sleep Duration', score: s, label: `${sleepAvg.toFixed(1)} hrs` });
  }

  if (breakdown.length === 0) {
    return { bioAge: chronologicalAge, chronologicalAge, delta: 0, score: 50, breakdown };
  }

  const overallScore = breakdown.reduce((a, b) => a + b.score, 0) / breakdown.length;

  // Map score to age delta: 100% = -8 years younger, 50% = 0, 0% = +15 years older
  const delta = overallScore >= 50
    ? -8 * ((overallScore - 50) / 50)
    : 15 * ((50 - overallScore) / 50);

  const bioAge = Math.max(0, Math.round(chronologicalAge + delta));

  return {
    bioAge,
    chronologicalAge,
    delta: Math.round(delta),
    score: Math.round(overallScore),
    breakdown
  };
}
