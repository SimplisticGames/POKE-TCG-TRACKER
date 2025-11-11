// A minimal service worker to make the app installable
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});