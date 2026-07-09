const CACHE = "spirits-box-pwa-v7";
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./audio/many_villains_victory.mp3",
  "./assets/char_alex.webp",
  "./assets/char_billy.webp",
  "./assets/char_catherine.png",
  "./assets/char_demarin.webp",
  "./assets/char_elisa.webp",
  "./assets/char_ester.png",
  "./assets/char_eva.png",
  "./assets/char_evaggelia.png",
  "./assets/char_evelyn.webp",
  "./assets/char_hope.webp",
  "./assets/char_ian.png",
  "./assets/char_irene.png",
  "./assets/char_jasmine.png",
  "./assets/char_luna.webp",
  "./assets/char_paul.png",
  "./assets/char_pauline.webp",
  "./assets/char_phillip.webp",
  "./assets/char_rino.webp",
  "./assets/char_sargenie.jpeg",
  "./assets/char_smaragda.jpeg",
  "./assets/char_sorina.png",
  "./assets/char_tony.webp",
  "./assets/char_vicky.jpg",
  "./assets/char_violet.png",
  "./assets/char_vincent.jpg",
  "./assets/char_zoe.jpeg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
