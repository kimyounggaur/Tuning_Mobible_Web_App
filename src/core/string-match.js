import { centsBetween, midiToFreq } from './note.js';

export function findClosestString(freq, tuning, a4 = 440) {
  if (!tuning?.strings?.length || !Number.isFinite(freq) || freq <= 0) return null;
  let best = null;
  tuning.strings.forEach((string, index) => {
    const diff = Math.abs(centsBetween(freq, midiToFreq(string.m, a4)));
    if (!best || diff < best.diff) best = { index, diff };
  });
  const bestString = tuning.strings[best.index];
  const neighbor = tuning.strings.reduce((nearest, string, index) => index === best.index || string.m === bestString.m
    ? nearest : Math.min(nearest, Math.abs(string.m - bestString.m) * 100), Infinity);
  const threshold = Math.min(200, Number.isFinite(neighbor) ? neighbor / 2 : 200);
  return best.diff <= threshold ? best : null;
}

export const stringKey = (string, index) => `${index}:${string.n}:${string.m}`;
