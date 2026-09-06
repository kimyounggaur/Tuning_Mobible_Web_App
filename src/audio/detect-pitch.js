import { RMS_MIN, MIN_FREQ, MAX_FREQ, CLARITY_MIN, PEAK_RATIO, EDGE_TOLERANCE_CENTS } from '../config.js';
export function detectPitch(input, sampleRate, nsdf, options = RMS_MIN) {
  const { rmsMin = RMS_MIN, minFreq = MIN_FREQ, maxFreq = MAX_FREQ } = typeof options === 'number' ? { rmsMin: options } : options;
  const size = input.length;
  let mean = 0;
  for (let i = 0; i < size; i += 1) mean += input[i];
  let pairSum = 2 * mean;
  mean /= size;
  let squareSum = 0;

  for (let i = 0; i < size; i += 1) {
    const sample = input[i];
    squareSum += sample * sample;
  }

  const rms = Math.sqrt(squareSum / size);
  if (rms < rmsMin) {
    return { silent: true, rms };
  }

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(size - 3, nsdf.length - 1, Math.ceil(sampleRate / minFreq) + 1);
  let divisor = 2 * (squareSum - size * mean * mean);

  for (let tau = 1; tau <= tauMax; tau += 1) {
    let acf = 0;
    divisor -= (input[size - tau] - mean) ** 2 + (input[tau - 1] - mean) ** 2;
    pairSum -= input[size - tau] + input[tau - 1];
    const limit = size - tau;

    for (let i = 0; i < limit; i += 1) {
      const a = input[i];
      const b = input[i + tau];
      acf += a * b;
    }

    // 평균 제거를 합의 항등식으로 적용하여 입력 버퍼를 변경하지 않는다.
    acf -= mean * pairSum - limit * mean * mean;
    nsdf[tau] = divisor > 0 ? (2 * acf) / divisor : 0;
  }

  let startTau = 1;
  while (startTau < tauMax && nsdf[startTau] > 0) {
    startTau += 1;
  }
  while (startTau < tauMax && nsdf[startTau] <= 0) {
    startTau += 1;
  }

  let maxPeak = 0;
  for (let tau = Math.max(startTau + 1, tauMin); tau < tauMax; tau += 1) {
    if (isLocalPeak(nsdf, tau) && nsdf[tau] > maxPeak) {
      maxPeak = nsdf[tau];
    }
  }

  if (maxPeak <= 0) {
    return { silent: false, valid: false, rms };
  }

  const peakFloor = maxPeak * PEAK_RATIO;
  let selectedTau = -1;

  for (let tau = Math.max(startTau + 1, tauMin); tau < tauMax; tau += 1) {
    if (isLocalPeak(nsdf, tau) && nsdf[tau] >= peakFloor) {
      selectedTau = tau;
      break;
    }
  }

  if (selectedTau < 0) {
    return { silent: false, valid: false, rms };
  }

  const { tau, peak } = refinePeak(nsdf, selectedTau);
  let freq = sampleRate / tau;
  // 경계 주파수의 포물선 보간 오차만 흡수한다.
  if (freq > maxFreq && 1200 * Math.log2(freq / maxFreq) <= EDGE_TOLERANCE_CENTS) freq = maxFreq;
  if (freq < minFreq && 1200 * Math.log2(minFreq / freq) <= EDGE_TOLERANCE_CENTS) freq = minFreq;

  if (peak < CLARITY_MIN || freq < minFreq || freq > maxFreq) {
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

export function decimate(input, output) {
  for (let i = 0; i < output.length; i += 1) output[i] = (input[i * 2] + input[i * 2 + 1]) / 2;
  return output;
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
