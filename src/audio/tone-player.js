import { unlock } from './context.js';
const INTERVAL_SECONDS = 2.5;
const HOLD_SECONDS = 1.65;
const RELEASE_SECONDS = 0.25;
const RAMP_SECONDS = 0.02;
const DRONE_PEAK_GAIN = 0.25 / 1.75;

export function createTonePlayer({ onPlaybackStart, onPlaybackStop } = {}) {
  let repeat = null;
  let activeKey = null;
  let generation = 0;
  const voices = new Set();
  function voice(ctx, freq, { drone = false, vibrato = false, beep = false } = {}) {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    let modulation; let depth; let endAt;
    oscillator.frequency.setValueAtTime(freq, now);
    if (drone) oscillator.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(4), Float32Array.of(0, 1, 0.5, 0.25), { disableNormalization: true }));
    else oscillator.type = beep ? 'sine' : 'triangle';
    filter.type = 'lowpass'; filter.frequency.value = 2000;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(drone ? DRONE_PEAK_GAIN : beep ? 0.11 : 0.25, now + (beep ? 0.006 : RAMP_SECONDS));
    if (!drone) {
      const hold = beep ? 0.01 : HOLD_SECONDS; const release = beep ? 0.07 : RELEASE_SECONDS;
      gain.gain.setValueAtTime(beep ? 0.11 : 0.25, now + hold);
      gain.gain.linearRampToValueAtTime(0, now + hold + release);
      endAt = now + hold + release + RAMP_SECONDS;
    }
    if (drone && vibrato) {
      modulation = ctx.createOscillator(); depth = ctx.createGain(); modulation.frequency.value = 4; depth.gain.value = 2;
      modulation.connect(depth).connect(oscillator.detune); modulation.start(now);
    }
    oscillator.connect(filter).connect(gain).connect(ctx.destination);
    let stopped = false;
    const stopVoice = () => {
      if (stopped) return; stopped = true;
      const at = ctx.currentTime;
      if (gain.gain.cancelAndHoldAtTime) gain.gain.cancelAndHoldAtTime(at);
      else { const value = gain.gain.value; gain.gain.cancelScheduledValues(at); gain.gain.setValueAtTime(value, at); }
      gain.gain.linearRampToValueAtTime(0, at + RAMP_SECONDS);
      try { oscillator.stop(at + RAMP_SECONDS); modulation?.stop(at + RAMP_SECONDS); } catch { /* 종료된 노드는 무시 */ }
    };
    oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); modulation?.disconnect(); depth?.disconnect(); voices.delete(stopVoice); };
    voices.add(stopVoice); oscillator.start(now); if (endAt) oscillator.stop(endAt);
  }
  function stop({ notify = true } = {}) {
    generation += 1; clearInterval(repeat); repeat = null;
    for (const stopVoice of voices) stopVoice();
    activeKey = null; if (notify) onPlaybackStop?.();
  }
  async function play({ freq, key, drone = false, vibrato = false }) {
    if (activeKey === key) { stop(); return false; }
    stop({ notify: false }); const token = generation;
    const context = await unlock();
    if (token !== generation) return false;
    activeKey = key; onPlaybackStart?.({ drone, freq });
    voice(context, freq, { drone, vibrato });
    if (!drone) repeat = setInterval(() => voice(context, freq), INTERVAL_SECONDS * 1000);
    return true;
  }
  async function beep({ enabled = true, freq = 880 } = {}) {
    if (!enabled) return;
    const token = generation; const context = await unlock();
    if (token === generation) voice(context, freq, { beep: true });
  }
  return { unlock, play, stop, beep, isPlaying: () => activeKey !== null };
}
