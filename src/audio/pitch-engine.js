export const BUFFER_SIZE = 4096;
export const LOW_RANGE_BUFFER_SIZE = 8192;
export const RMS_MIN = 0.008;
export const RMS_LEVELS = {
  low: 0.014,
  normal: RMS_MIN,
  high: 0.004,
};

const MIN_FREQ = 25;
const MAX_FREQ = 1100;
const CLARITY_MIN = 0.9;
const PEAK_RATIO = 0.9;
const ANALYSIS_INTERVAL_MS = 25;

export function createPitchEngine({ onResult, onError } = {}) {
  let audioContext = null;
  let analyser = null;
  let source = null;
  let mediaStream = null;
  let buffer = null;
  let nsdf = null;
  let timerId = null;
  let sampleRate = 48000;
  let lowRange = false;
  let rmsMin = RMS_MIN;
  let paused = false;
  let running = false;

  async function start(options = {}) {
    if (running) {
      return;
    }

    lowRange = Boolean(options.lowRange);
    rmsMin = options.rmsMin ?? rmsMin;
    paused = false;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
      await audioContext.resume();
      sampleRate = audioContext.sampleRate;

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });

      analyser = audioContext.createAnalyser();
      analyser.fftSize = lowRange ? LOW_RANGE_BUFFER_SIZE : BUFFER_SIZE;
      analyser.smoothingTimeConstant = 0;

      source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      buffer = new Float32Array(analyser.fftSize);
      nsdf = new Float32Array(Math.ceil(sampleRate / MIN_FREQ) + 2);
      timerId = window.setInterval(analyzeFrame, ANALYSIS_INTERVAL_MS);
      running = true;
    } catch (error) {
      await stop();
      onError?.(error);
      throw error;
    }
  }

  async function stop() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }

    if (source) {
      source.disconnect();
      source = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    if (audioContext) {
      const closingContext = audioContext;
      audioContext = null;
      await closingContext.close().catch(() => {});
    }

    analyser = null;
    buffer = null;
    nsdf = null;
    running = false;
    paused = false;
  }

  async function restart(options = {}) {
    await stop();
    await start({
      lowRange: options.lowRange ?? lowRange,
      rmsMin: options.rmsMin ?? rmsMin,
    });
  }

  function pauseAnalysis() {
    paused = true;
  }

  async function resumeAnalysis() {
    paused = false;
    if (audioContext?.state === 'suspended') {
      await audioContext.resume().catch(() => {});
    }
  }

  function updateOptions(options = {}) {
    rmsMin = options.rmsMin ?? rmsMin;
  }

  function isRunning() {
    return running;
  }

  function analyzeFrame() {
    if (!analyser || !buffer || !nsdf || paused) {
      return;
    }

    analyser.getFloatTimeDomainData(buffer);
    const result = detectPitch(buffer, sampleRate, nsdf, rmsMin);
    if (result.silent) {
      onResult?.({ silent: true, rms: result.rms });
      return;
    }

    if (result.valid) {
      if (window.__pitchDebug === true) {
        console.info(`${result.freq.toFixed(2)} Hz (clarity ${result.clarity.toFixed(2)})`);
      }
      onResult?.({
        freq: result.freq,
        clarity: result.clarity,
        rms: result.rms,
        silent: false,
      });
      return;
    }

    onResult?.({ silent: true, rms: result.rms, rejected: true });
  }

  return {
    start,
    stop,
    restart,
    pauseAnalysis,
    resumeAnalysis,
    updateOptions,
    isRunning,
  };
}

export function detectPitch(input, sampleRate, nsdf, rmsMin = RMS_MIN) {
  const size = input.length;
  let squareSum = 0;

  for (let i = 0; i < size; i += 1) {
    const sample = input[i];
    squareSum += sample * sample;
  }

  const rms = Math.sqrt(squareSum / size);
  if (rms < rmsMin) {
    return { silent: true, rms };
  }

  const tauMin = Math.max(2, Math.floor(sampleRate / MAX_FREQ));
  const tauMax = Math.min(size - 3, Math.ceil(sampleRate / MIN_FREQ));

  for (let tau = tauMin; tau <= tauMax; tau += 1) {
    let acf = 0;
    let divisor = 0;
    const limit = size - tau;

    for (let i = 0; i < limit; i += 1) {
      const a = input[i];
      const b = input[i + tau];
      acf += a * b;
      divisor += a * a + b * b;
    }

    nsdf[tau] = divisor > 0 ? (2 * acf) / divisor : 0;
  }

  let startTau = tauMin + 1;
  while (startTau < tauMax && nsdf[startTau] > 0) {
    startTau += 1;
  }
  while (startTau < tauMax && nsdf[startTau] <= 0) {
    startTau += 1;
  }

  let maxPeak = 0;
  for (let tau = startTau + 1; tau < tauMax; tau += 1) {
    if (isLocalPeak(nsdf, tau) && nsdf[tau] > maxPeak) {
      maxPeak = nsdf[tau];
    }
  }

  if (maxPeak <= 0) {
    return { silent: false, valid: false, rms };
  }

  const peakFloor = maxPeak * PEAK_RATIO;
  let selectedTau = -1;

  for (let tau = startTau + 1; tau < tauMax; tau += 1) {
    if (isLocalPeak(nsdf, tau) && nsdf[tau] >= peakFloor) {
      selectedTau = tau;
      break;
    }
  }

  if (selectedTau < 0) {
    return { silent: false, valid: false, rms };
  }

  const { tau, peak } = refinePeak(nsdf, selectedTau);
  const freq = sampleRate / tau;

  if (peak < CLARITY_MIN || freq < MIN_FREQ || freq > MAX_FREQ) {
    return { silent: false, valid: false, rms, freq, clarity: peak };
  }

  return {
    silent: false,
    valid: true,
    freq,
    clarity: peak,
    rms,
  };
}

function isLocalPeak(values, index) {
  return values[index] > values[index - 1] && values[index] >= values[index + 1] && values[index] > 0;
}

function refinePeak(values, index) {
  const left = values[index - 1];
  const center = values[index];
  const right = values[index + 1];
  const denominator = left - 2 * center + right;

  if (Math.abs(denominator) < 1e-12) {
    return { tau: index, peak: center };
  }

  const shift = 0.5 * (left - right) / denominator;
  const tau = index + Math.max(-1, Math.min(1, shift));
  const peak = center - 0.25 * (left - right) * shift;
  return { tau, peak };
}
