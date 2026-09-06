// 서비스워커와 캐시 상태를 안다.
// DOM과 피치 처리 상태는 주입된 콜백 외에는 모른다.
export function createPwa({ view, stopTuning, env = globalThis }) {
  let registration = null;
  let requested = false;
  let timer;
  async function register() {
    if (!import.meta.env.PROD || !env.navigator.serviceWorker || new URLSearchParams(env.location.search).has('nosw')) return;
    try {
      registration = await env.navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      view.swStatus = 'sw.preparing'; view.dirty = true;
      env.navigator.serviceWorker.ready.then(() => { view.swStatus = 'sw.ready'; view.dirty = true; });
      const ready = () => { if (registration.waiting && env.navigator.serviceWorker.controller) { view.updateReady = true; view.dirty = true; } };
      ready();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') ready(); });
      });
      env.navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (requested) env.location.reload();
      });
      void registration.update().catch(() => {});
      timer = env.setInterval(() => { void registration.update().catch(() => {}); }, 60 * 60 * 1000);
    } catch { view.swStatus = 'sw.failed'; view.dirty = true; }
    try { view.buildInfo = await (await env.fetch('/build-info.json', { cache: 'no-store' })).json(); view.dirty = true; } catch { /* 오프라인에서는 기존 정보 유지 */ }
  }
  async function applyUpdate() {
    if (!registration?.waiting) return;
    await stopTuning(); requested = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  async function clearCache() {
    await stopTuning();
    if (env.caches) await Promise.all((await env.caches.keys()).filter((key) => key.startsWith('tunestring-')).map((key) => env.caches.delete(key)));
    const own = registration ?? await env.navigator.serviceWorker?.getRegistration('/');
    await own?.unregister(); env.location.reload();
  }
  return { register, applyUpdate, clearCache, dispose: () => env.clearInterval(timer) };
}
