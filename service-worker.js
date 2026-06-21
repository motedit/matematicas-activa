const CACHE_NAME = 'matactiva-v1';
const ASSETS_TO_CACHE = [
  '/matematicas-activa/',
  '/matematicas-activa/index.html',
  '/matematicas-activa/styles.css',
  '/matematicas-activa/scripts.js',
  '/matematicas-activa/supabase-config.js',
  '/matematicas-activa/visual-fx.js',
  '/matematicas-activa/manifest.json',
  '/matematicas-activa/img/icon-192x192.png',
  '/matematicas-activa/img/icon-512x512.png',
  '/matematicas-activa/img/Logo.jpeg',
  '/matematicas-activa/img/marcos-diaz.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No cachear llamadas a Supabase
  if (url.origin === 'https://yidrpuizgtqpswefwdaa.supabase.co') {
    return;
  }

  // Stale-while-revalidate: servir cache, actualizar en background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
