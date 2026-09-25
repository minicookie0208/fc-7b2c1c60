// 離線快取：版本號由 build.mjs 自動更新，裝置連網時就會拿到新版
const VERSION = 'fancards-99fcc7debf';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];
const NET_TIMEOUT = 3000;   // 網路太慢就改用平板裡存的版本

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 打開 App（頁面本身）：有網路先拿最新版，沒網路或太慢就用快取
async function pageFirstFromNetwork(req) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), NET_TIMEOUT);
    const res = await fetch(req, { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) (await caches.open(VERSION)).put('index.html', res.clone());
    return res;
  } catch {
    return (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
  }
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') { e.respondWith(pageFirstFromNetwork(e.request)); return; }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request))
  );
});
