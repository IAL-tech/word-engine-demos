// Cache content-hashed Expo assets (images, audio, data, JS, CSS).
// The hash is in the URL, so a new export is a new request and this cache
// cannot pin a stale file. HTML, this script, and unhashed engine files
// stay on the network.

const CACHE = 'codex-hashed-v1';
const HASHED = /[.-][a-f0-9]{32}\./i;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!HASHED.test(url.pathname)) return;

  event.respondWith(fromCache(event, url));
});

async function fromCache(event, url) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(url.href);
  if (hit) return hit;

  // Fetch by URL so the page request's abort signal is not attached.
  // An <img> unmount or Audio.remove() would otherwise cancel the download
  // before it can be stored.
  const response = await fetch(url.href, { credentials: 'same-origin' });
  if (response.ok && response.status === 200 && response.type === 'basic') {
    event.waitUntil(cache.put(url.href, response.clone()).catch(() => {}));
  }
  return response;
}
