// Offline support for the Shipment Tracker app.
// The app shell is cached on first open; pages load from cache first and refresh it in the background.
// AI calls (Google / Anthropic) and fonts always go to the network and are never cached.
const CACHE = 'shipments-v96';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const own = url.origin === location.origin;
  const lib = url.href.startsWith('https://cdnjs.cloudflare.com/ajax/libs/xlsx/');
  if (!own && !lib) return;                       // AI APIs, fonts, everything else: straight to the network
  e.respondWith(caches.match(req, { ignoreSearch: own }).then(hit => {
    const fresh = fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || fresh;
  }));
});
