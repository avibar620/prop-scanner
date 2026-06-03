// Prop-Scanner Service Worker — minimal pass-through.
// Registered from app/layout.tsx, scoped to the site root.
// We do NOT cache anything here: stats, listings, and AI analysis change
// frequently, and the auth-gated nature of the dashboard means stale cached
// responses can leak data across sessions. Future versions can add a
// network-first cache for static assets if needed.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
