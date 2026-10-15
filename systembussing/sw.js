"use strict";

const CACHE_NAME = "scical600-systembussing-v1";
const OFFLINE_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match("./index.html"))),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CHECK_OFFLINE_READY") return;
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.match("./index.html"))
      .then((response) => event.ports[0]?.postMessage({ ready: Boolean(response) })),
  );
});
