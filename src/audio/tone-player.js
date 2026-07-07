const TONE_INTERVAL_SECONDS = 2.5;
const ATTACK = 0.008;
const DECAY = 0.12;
const SUSTAIN = 0.35;
const RELEASE = 0.25;
const TONE_HOLD_SECONDS = 1.65;
const FILTER_FREQ = 2000;

export function createTonePlayer({ onPlaybackStart, onPlaybackStop } = {}) {
  let audioContext = null;
  let repeatId = null;
  let activeKey = null;
  let currentStop = null;

  async function ensureContext() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    return audioContext;
  }

  async function play({ freq, key }) {
    if (activeKey === key) {
      stop();
      return false;
    }

    stop({ notify: false });
    const ctx = await ensureContext();
    activeKey = key;
    onPlaybackStart?.();
    scheduleTone(ctx, freq);
    repeatId = window.setInterval(() => scheduleTone(ctx, freq), TONE_INTERVAL_SECONDS * 1000);
    return true;
  }

  async function unlock() {
    await ensureContext();
  }

  function stop({ notify = true } = {}) {
    if (repeatId !== null) {
      window.clearInterval(repeatId);
      repeatId = null;
    }
    currentStop?.();
    currentStop = null;
    activeKey = null;
    if (notify) {
      onPlaybackStop?.();
    }
  }

  async function beep({ enabled = true, freq = 880, duration = 0.08 } = {}) {
    if (!enabled) {
      return;
    }

    const ctx = await ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function isPlaying() {
    return activeKey !== null;
  }

  function scheduleTone(ctx, freq) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(FILTER_FREQ, now);

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + ATTACK);
    gain.gain.exponentialRampToValueAtTime(SUSTAIN, now + ATTACK + DECAY);
    gain.gain.setValueAtTime(SUSTAIN, now + TONE_HOLD_SECONDS);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + TONE_HOLD_SECONDS + RELEASE);

    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + TONE_HOLD_SECONDS + RELEASE + 0.05);

    currentStop = () => {
      const stopAt = ctx.currentTime + 0.03;
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.015);
        osc.stop(stopAt);
      } catch {
        // 이미 종료된 노드는 무시한다.
      }
    };
  }

  return {
    unlock,
    play,
    stop,
    beep,
    isPlaying,
  };
}
