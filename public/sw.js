const CACHE_NAME = 'tunestring-__BUILD_ID__';
const PRECACHE = JSON.parse('__PRECACHE__');
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME); await cache.addAll(PRECACHE);
    // v1에는 업데이트 UI가 없다. 한 번만 제어권을 넘기되 페이지는 새로고침하지 않는다.
    if ((await caches.keys()).includes('tunestring-v1')) await self.skipWaiting();
  })());
});
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter((name) => name.startsWith('tunestring-') && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
async function navigation(request) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (!response.ok) throw new Error('Navigation unavailable');
    const cache = await caches.open(CACHE_NAME); await cache.put('/index.html', response.clone());
    return response;
  } catch { return await caches.match('/index.html') ?? Response.error(); }
  finally { clearTimeout(timer); }
}
self.addEventListener('fetch', (event) => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/sw.js') return;
  if (request.mode === 'navigate') { event.respondWith(navigation(request)); return; }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cached = await caches.match(request); if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) { const cache = await caches.open(CACHE_NAME); await cache.put(request, response.clone()); }
        return response;
      } catch { return Response.error(); }
    })());
    return;
  }
  const refresh = (async () => {
    try {
      const response = await fetch(request);
      if (response.ok) { const cache = await caches.open(CACHE_NAME); await cache.put(request, response.clone()); }
      return response;
    } catch { return null; }
  })();
  event.waitUntil(refresh);
  event.respondWith((async () => await caches.match(request) ?? await refresh ?? Response.error())());
});
