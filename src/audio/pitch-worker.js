import { detectPitch, decimate } from './detect-pitch.js';
import { MIN_FREQ } from '../config.js';
let nsdf;
let reduced;
self.onmessage = ({ data }) => {
  const { input, sampleRate, options, generation, slot, sentAt } = data;
  if (!nsdf || nsdf.length < sampleRate / MIN_FREQ + 3) nsdf = new Float32Array(Math.ceil(sampleRate / MIN_FREQ) + 3);
  let signal = input;
  let sr = sampleRate;
  if (options.lowRange && options.decimation !== false) {
    if (reduced?.length !== input.length / 2) reduced = new Float32Array(input.length / 2);
    signal = decimate(input, reduced); sr /= 2;
  }
  const start = performance.now();
  const result = detectPitch(signal, sr, nsdf, options);
  self.postMessage({ result, input, generation, slot, sentAt, processingMs: performance.now() - start }, [input.buffer]);
};
