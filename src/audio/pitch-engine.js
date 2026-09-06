import { getAudioContext, unlock } from './context.js';
import { detectPitch, decimate } from './detect-pitch.js';
import { BUFFER_SIZE, LOW_RANGE_BUFFER_SIZE, RMS_MIN, MIN_FREQ, MAX_FREQ, ANALYSIS_INTERVAL_MS } from '../config.js';
export { detectPitch } from './detect-pitch.js';
export { BUFFER_SIZE, LOW_RANGE_BUFFER_SIZE, RMS_LEVELS } from '../config.js';

export function createPitchEngine({ onResult, onState } = {}) {
  let analyser = null;
  let source = null;
  let mediaStream = null;
  let timer = null;
  let worker = null;
  let workerBroken = false;
  let buffers = [];
  let reduced = null;
  let nsdf = null;
  let sampleRate = 48000;
  let slot = 0;
  let busy = false;
  let paused = false;
  let running = false;
  let generation = 0;
  let latency = 0;
  let options = { lowRange: false, rmsMin: RMS_MIN, minFreq: MIN_FREQ, maxFreq: MAX_FREQ, decimation: true };

  async function start(next = {}) {
    if (running) return;
    const token = ++generation;
    options = { ...options, ...next };
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('SecureContextRequired');
    try {
      const ctx = await unlock(); sampleRate = ctx.sampleRate;
      if (token !== generation) return;
      const constraints = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } };
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia(constraints); }
      catch (error) { if (error.name !== 'OverconstrainedError') throw error; stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      if (token !== generation) { stream.getTracks().forEach((track) => track.stop()); return; }
      mediaStream = stream;
      analyser = ctx.createAnalyser(); analyser.smoothingTimeConstant = 0;
      source = ctx.createMediaStreamSource(stream);
      // 마이크는 analyser까지만 연결하고 스피커 destination에는 연결하지 않는다.
      source.connect(analyser);
      nsdf = new Float32Array(Math.ceil(sampleRate / MIN_FREQ) + 3);
      setBufferSize(options.lowRange ? LOW_RANGE_BUFFER_SIZE : BUFFER_SIZE);
      for (const track of stream.getAudioTracks()) {
        track.addEventListener('ended', () => { if (mediaStream === stream) { void stop(); onState?.('lost'); } });
        track.addEventListener('mute', () => { if (mediaStream === stream) onState?.('muted'); });
        track.addEventListener('unmute', () => { if (mediaStream === stream) onState?.('unmuted'); });
      }
      paused = false; running = true; startWorker();
      timer = setInterval(analyzeFrame, ANALYSIS_INTERVAL_MS);
    } catch (error) { if (token === generation) await stop(); throw error; }
  }
  async function stop() {
    generation += 1; running = false; paused = false;
    clearInterval(timer); timer = null;
    worker?.terminate(); worker = null; busy = false;
    source?.disconnect(); source = null;
    const stream = mediaStream; mediaStream = null; stream?.getTracks().forEach((track) => track.stop());
    analyser?.disconnect(); analyser = null; buffers = []; reduced = null; nsdf = null;
  }
  function setBufferSize(size) {
    if (!analyser || analyser.fftSize === size && buffers[0]?.length === size) return;
    analyser.fftSize = size;
    buffers = [new Float32Array(size), new Float32Array(size)]; reduced = new Float32Array(size / 2);
    generation += 1; busy = false; slot = 0;
  }
  function updateOptions(next = {}) {
    options = { ...options, ...next };
    if (analyser) setBufferSize(options.lowRange ? LOW_RANGE_BUFFER_SIZE : BUFFER_SIZE);
    generation += 1; busy = false;
    // 진행 중 전송 버퍼가 분리되었으면 옵션 변경 시에만 복구한다.
    for (let i = 0; i < buffers.length; i += 1) if (!buffers[i].byteLength) buffers[i] = new Float32Array(analyser.fftSize);
  }
  function startWorker() {
    if (workerBroken || typeof Worker === 'undefined') { debugMode('main'); return; }
    try {
      worker = new Worker(new URL('./pitch-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => {
        if (data.generation !== generation) return;
        buffers[data.slot] = data.input; busy = false;
        latency = latency ? latency * 0.95 + (performance.now() - data.sentAt) * 0.05 : performance.now() - data.sentAt;
        if (import.meta.env.DEV) globalThis.__pitchLatency = latency;
        if (running && !paused) deliver(data.result);
      };
      worker.onerror = (event) => {
        event.preventDefault(); workerBroken = true; worker?.terminate(); worker = null; busy = false;
        if (analyser) buffers = [new Float32Array(analyser.fftSize), new Float32Array(analyser.fftSize)];
        debugMode('main');
      };
      debugMode('worker');
    } catch { worker = null; workerBroken = true; debugMode('main'); }
  }
  function debugMode(mode) { if (import.meta.env.DEV) globalThis.__pitchMode = mode; }
  function deliver(result) { onResult?.({ ...result, rejected: !result.silent && !result.valid, silent: result.silent || !result.valid }); }
  function analyzeFrame() {
    if (!running || paused || busy || !analyser) return;
    const input = buffers[slot]; if (!input?.byteLength) return;
    analyser.getFloatTimeDomainData(input);
    if (worker) {
      busy = true;
      worker.postMessage({ input, sampleRate, options, generation, slot, sentAt: performance.now() }, [input.buffer]);
      slot = 1 - slot;
    } else {
      const signal = options.lowRange && options.decimation ? decimate(input, reduced) : input;
      deliver(detectPitch(signal, signal === input ? sampleRate : sampleRate / 2, nsdf, options));
    }
  }
  function pauseAnalysis() { paused = true; }
  async function resumeAnalysis() {
    if (!running) return false;
    const ctx = getAudioContext();
    if (ctx.state !== 'running') await ctx.resume();
    paused = ctx.state !== 'running';
    return !paused;
  }
  return { start, stop, pauseAnalysis, resumeAnalysis, updateOptions, setBufferSize, isRunning: () => running };
}
