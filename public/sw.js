/**
 * Basic Service Worker for PWA
 * No caching - just allows PWA installation
 */

const SW_VERSION = '1.0.0';

// Install event - just skip waiting
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);
  self.skipWaiting();
});

// Activate event - claim clients immediately
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);
  event.waitUntil(
    self.clients.claim()
  );
});

// Fetch event - pass through to network (no caching)
self.addEventListener('fetch', (event) => {
  // Just pass through all requests to the network
  event.respondWith(fetch(event.request));
});
