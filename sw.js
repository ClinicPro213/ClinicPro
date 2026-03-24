self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open('clinic-pro-cache').then(cache=>{
      return cache.addAll([
        '/dashboard.html',
        '/js/main.js',
        '/js/api.js',
        '/tooth-logo.svg'
      ]);
    })
  );
});

self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(response=>response || fetch(e.request))
  );
});