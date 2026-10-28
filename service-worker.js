'use strict';

const APP_VERSION = '0.9.16';
const CACHE_PREFIX = 'warfarin-dose-optimizer-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './pwa-update.js',
  './optimizer.js',
  './app.js',
  './drug-interactions.js',
  './drug-interaction-clinical-review.js',
  './drug-interaction-final-review.js',
  './drug-interaction-emr.js',
  './drug-interaction-presentation.js',
  './drug-interactions-imported.js',
  './drug-interaction-review.js',
  './drug-interaction-th.js',
  './drug-interaction-core.js',
  './drug-interaction-ui.js',
  './manifest.json',
  './assets/warfarin-logo.png',
  './icons/favicon.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(APP_SHELL.map(async (url) => {
    const request = new Request(url, { cache: 'reload' });
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Unable to precache ${url}`);
    await cache.put(request, response);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAppShell());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, fallback) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (fallback ? await cache.match(fallback) : undefined);
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    cacheFirst(request, request.mode === 'navigate' ? './index.html' : null)
      .then((response) => response || Response.error())
  );
});
