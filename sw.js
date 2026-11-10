/* MoBe Revenue Tracker — service worker: l'app si apre anche senza rete */
const VERSION = 'mobe-rev-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/vendor/supabase.js', 'js/config.js', 'js/core.js', 'js/views.js',
  'img/logo.png', 'img/icon-192.png', 'img/icon-512.png', 'img/apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // file dell'app: prima la rete (sempre aggiornata), se manca la rete la copia salvata
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
      }
    })());
    return;
  }
  // font Google: copia salvata al primo uso
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION + '-fonts').then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })));
  }
  // Supabase e tutto il resto: rete diretta
});
