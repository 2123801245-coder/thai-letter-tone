/* 泰语字母与声调 · Service Worker
   ─────────────────────────────────────────────
   策略：
   · 外壳（HTML/清单/图标/字体）——安装时预缓存，保证「加到主屏幕」后立刻能开
   · 音频（字母/单词 278 + 声调听音 99）——首次播放时按需缓存，播过就能离线播
     （全部预缓存要下载 1.2MB、耗时 90 秒以上，对手机不友好）
   ───────────────────────────────────────────── */
const CACHE = 'thai-letter-tone-v8';

const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          // 音频等大文件走这里：播过一次就进缓存，下次离线可用
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => {
        // 离线且没缓存：音频静默失败，页面回落首页
        if (e.request.destination === 'audio') return new Response('', { status: 504 });
        return caches.match('./index.html');
      });
    })
  );
});
