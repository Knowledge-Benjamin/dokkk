/**
 * rPPG (Remote Photoplethysmography) Engine
 * Measures heart rate from facial video via green channel analysis + FFT
 */

export type RppgStatus = 'idle' | 'requesting' | 'calibrating' | 'measuring' | 'done' | 'error';

export interface RppgResult {
  bpm: number;
  confidence: 'high' | 'medium' | 'low';
  samples: number;
}

const SAMPLE_DURATION_MS = 30000; // 30 seconds for stable reading
const FAST_SAMPLE_MS = 15000;     // 15 seconds for quick reading
const SAMPLE_FPS = 15;

function fft(re: number[], im: number[]): void {
  const n = re.length;
  if (n <= 1) return;

  const reEven = re.filter((_, i) => i % 2 === 0);
  const imEven = im.filter((_, i) => i % 2 === 0);
  const reOdd  = re.filter((_, i) => i % 2 !== 0);
  const imOdd  = im.filter((_, i) => i % 2 !== 0);

  fft(reEven, imEven);
  fft(reOdd, imOdd);

  for (let k = 0; k < n / 2; k++) {
    const angle = -2 * Math.PI * k / n;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const trRe = cosA * reOdd[k] - sinA * imOdd[k];
    const trIm = sinA * reOdd[k] + cosA * imOdd[k];
    re[k]         = reEven[k] + trRe;
    im[k]         = imEven[k] + trIm;
    re[k + n / 2] = reEven[k] - trRe;
    im[k + n / 2] = imEven[k] - trIm;
  }
}

function nextPow2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

function estimateBpmFromSamples(greenValues: number[], sampleRate: number): RppgResult {
  // Detrend
  const mean = greenValues.reduce((a, b) => a + b, 0) / greenValues.length;
  const detrended = greenValues.map(v => v - mean);

  // Zero-pad to next power of 2 for FFT
  const n = nextPow2(detrended.length);
  const re = [...detrended, ...Array(n - detrended.length).fill(0)];
  const im = Array(n).fill(0);

  fft(re, im);

  // Compute magnitudes
  const magnitudes = re.map((r, i) => Math.sqrt(r * r + im[i] * im[i]));

  // Find dominant frequency in 0.67–3.33 Hz (40–200 BPM)
  const freqResolution = sampleRate / n;
  const minBin = Math.floor(0.67 / freqResolution);
  const maxBin = Math.ceil(3.33 / freqResolution);

  let maxMag = -Infinity;
  let maxBinIdx = minBin;
  for (let i = minBin; i <= maxBin && i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      maxBinIdx = i;
    }
  }

  const dominantFreq = maxBinIdx * freqResolution;
  const bpm = Math.round(dominantFreq * 60);

  // Confidence: signal-to-noise ratio of the peak vs surroundings
  const surroundMags = magnitudes.slice(minBin, maxBin + 1).filter((_, i) => i !== (maxBinIdx - minBin));
  const avgNoise = surroundMags.reduce((a, b) => a + b, 0) / surroundMags.length;
  const snr = maxMag / (avgNoise || 1);

  const confidence = snr > 3 ? 'high' : snr > 1.5 ? 'medium' : 'low';

  return { bpm, confidence, samples: greenValues.length };
}

export async function measureHeartRate(
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement,
  onProgress: (progress: number, status: string) => void,
  quick = false
): Promise<RppgResult> {
  const ctx = canvasElement.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  const duration = quick ? FAST_SAMPLE_MS : SAMPLE_DURATION_MS;
  const greenValues: number[] = [];
  const interval = 1000 / SAMPLE_FPS;
  let elapsed = 0;

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      try {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);

        // Sample the center of the face (forehead region)
        const cx = Math.floor(canvasElement.width / 2);
        const cy = Math.floor(canvasElement.height * 0.25); // upper quarter (forehead)
        const sampleSize = 40;
        const imageData = ctx.getImageData(cx - sampleSize / 2, cy - sampleSize / 2, sampleSize, sampleSize);
        const pixels = imageData.data;
        let greenSum = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          greenSum += pixels[i + 1]; // green channel
        }
        const avgGreen = greenSum / (pixels.length / 4);
        greenValues.push(avgGreen);

        elapsed += interval;
        const progress = Math.min(100, Math.round((elapsed / duration) * 100));
        const secondsLeft = Math.round((duration - elapsed) / 1000);
        onProgress(progress, `Capturing signal... ${secondsLeft}s remaining. Stay still.`);

        if (elapsed >= duration) {
          clearInterval(timer);
          try {
            const result = estimateBpmFromSamples(greenValues, SAMPLE_FPS);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        }
      } catch (e) {
        clearInterval(timer);
        reject(e);
      }
    }, interval);
  });
}

export async function connectBluetoothHeartRate(): Promise<number> {
  if (!('bluetooth' in navigator)) {
    throw new Error('Web Bluetooth API is not supported in this browser. Use Chrome or Edge.');
  }
  const device = await (navigator as any).bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }]
  });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService('heart_rate');
  const characteristic = await service.getCharacteristic('heart_rate_measurement');
  const value = await characteristic.readValue();
  // Heart Rate Measurement characteristic format per BT spec
  const flags = value.getUint8(0);
  const bpm = (flags & 0x01) ? value.getUint16(1, true) : value.getUint8(1);
  await device.gatt.disconnect();
  return bpm;
}
