const CACHE_NAME = "spirits-pwa-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./assets/video/intro_spirits.mov",
  "./assets/audio/isopalia.mp3",
  "./assets/audio/many_villains_victory.mp3",
  "./assets/audio/one_villain_victory.mp3",
  "./assets/audio/spirits_victory.mp3",
  "./assets/characters/char_alex.webp",
  "./assets/characters/char_billy.webp",
  "./assets/characters/char_catherine.png",
  "./assets/characters/char_demarin.webp",
  "./assets/characters/char_elisa.webp",
  "./assets/characters/char_eva.png",
  "./assets/characters/char_evaggelia.png",
  "./assets/characters/char_evelyn.webp",
  "./assets/characters/char_hope.webp",
  "./assets/characters/char_irene.png",
  "./assets/characters/char_jasmine.png",
  "./assets/characters/char_luna.webp",
  "./assets/characters/char_pauline.webp",
  "./assets/characters/char_phillip.webp",
  "./assets/characters/char_rino.webp",
  "./assets/characters/char_sargenie.jpeg",
  "./assets/characters/char_smaragda.jpeg",
  "./assets/characters/char_sorina.png",
  "./assets/characters/char_tony.webp",
  "./assets/characters/char_vicky.jpg",
  "./assets/characters/char_violet.png",
  "./assets/characters/char_zoe.jpeg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.headers.has("range")) {
    event.respondWith(rangeResponse(event.request));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});

async function rangeResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(request.url);
  if (!response) {
    response = await fetch(request);
    cache.put(request.url, response.clone());
  }
  const buffer = await response.arrayBuffer();
  const range = request.headers.get("range") || "bytes=0-";
  const match = /bytes=(\d+)-(\d*)/.exec(range);
  const start = match ? Number(match[1]) : 0;
  const end = match && match[2] ? Number(match[2]) : buffer.byteLength - 1;
  const chunk = buffer.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${buffer.byteLength}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(chunk.byteLength)
    }
  });
}
