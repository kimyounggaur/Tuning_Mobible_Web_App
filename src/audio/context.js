let context = null;
const listeners = new Set();

export function getAudioContext() {
  if (!context || context.state === 'closed') {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is unavailable');
    context = new AudioContextClass();
    context.addEventListener('statechange', () => listeners.forEach((callback) => callback(context.state)));
  }
  return context;
}
export async function unlock() {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') await ctx.resume();
  return ctx;
}
export function onStateChange(callback) { listeners.add(callback); return () => listeners.delete(callback); }
export async function suspendContext() { if (context?.state === 'running') await context.suspend().catch(() => {}); }
