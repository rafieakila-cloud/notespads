const CACHE = 'notespads-v1';
const SHELL = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icons/icon.svg'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); });
self.addEventListener('activate', e => { self.clients.claim(); e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); });
self.addEventListener('fetch', e => { if (e.request.url.startsWith(self.location.origin)) e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
