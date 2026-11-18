// Service worker: lets the site be installed as an app and open without internet.
// Own files: network first (a fresh publish shows up at once), the saved copy when offline.
// Fonts and flags from CDNs: saved copy first (their addresses never change).
// League data from Google Sheets is not touched here; the page keeps its own copy of it.
const VERSION = '202611182032'; // set by scripts/release.py on every publish
const CACHE = `ppr-${VERSION}`;
const SHELL = [
  './', 'index.html', 'config.json', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/countries.js', 'js/data.js', 'js/i18n.js', 'js/preview.js',
  'js/search.js', 'js/teams.js', 'js/track-geo.js', 'js/ui.js', 'js/views.js',
  'assets/logo-transparent.png', 'assets/favicon.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/apple-touch-icon.png',
  // Team logos (today's and older eras), so every table looks complete offline.
  'assets/teams/alpine.png', 'assets/teams/astonmartin.png', 'assets/teams/audi.png', 'assets/teams/cadillac.png',
  'assets/teams/ferrari.png', 'assets/teams/haasf1team.png', 'assets/teams/mclaren.png', 'assets/teams/mercedes.png',
  'assets/teams/racingbulls.png', 'assets/teams/redbullracing.png', 'assets/teams/williams.png',
  'assets/teams/hist/alfaromeo.jpg', 'assets/teams/hist/alphatauri.svg', 'assets/teams/hist/kicksauber.png',
  'assets/teams/hist/racingpoint.svg', 'assets/teams/hist/renault.png',
];
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ppr-') && k !== CACHE && k !== 'ppr-cdn').map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) e.respondWith(networkFirst(req));
  else if (CDN.includes(url.hostname)) e.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // Versioned addresses (style.css?v=…) fall back to the copy saved without the version.
    const hit = await cache.match(req) || await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' && await cache.match('index.html'));
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open('ppr-cdn');
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
