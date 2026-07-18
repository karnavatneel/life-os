const CACHE = 'life-os-v5';
const PRECACHE = ['/manifest.webmanifest', '/icon.svg'];

let lastNotifCheck = 0;

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => checkAndFireScheduled())
      .then(() => self.clients.claim())
  );
});

// ─── Fetch (network-first, offline fallback) ─────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  
  // Opportunistic notification check (throttle to once per minute)
  const now = Date.now();
  if (now - lastNotifCheck > 60000) {
    lastNotifCheck = now;
    e.waitUntil(checkAndFireScheduled());
  }

  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          // Prevent caching SPA fallback (index.html) for asset requests
          const contentType = res.headers.get('content-type') || '';
          const isAssetRequest = request.url.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff2?)$/i);
          if (isAssetRequest && contentType.includes('text/html')) {
            return res; // Don't cache bad response
          }
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/index.html');
        return Response.error();
      })
  );
});

// ─── Push notification ───────────────────────────────────────────────────────
// Receives a push from the server (or from scheduleNotification below via
// postMessage when the app IS open, or via periodic sync when closed).
self.addEventListener('push', (e) => {
  let data = { title: 'Life OS', body: 'You have a reminder', icon: '/icon.svg', badge: '/icon.svg', tag: 'life-os' };
  try { data = { ...data, ...e.data.json() }; } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});

// ─── Local scheduled notifications (postMessage from app) ───────────────────
// The app posts { type: 'SCHEDULE_NOTIFICATION', id, title, body, delayMs }
// We use setTimeout-based approach inside the SW to show it after delayMs.
// This works while the app tab is alive. When app is fully closed we rely on
// periodic background sync (below).
const pendingTimers = new Map();

self.addEventListener('message', (e) => {
  const { data } = e;
  if (!data) return;

  if (data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, delayMs = 0 } = data;
    // Clear existing timer for same id
    if (pendingTimers.has(id)) clearTimeout(pendingTimers.get(id));
    const timer = setTimeout(() => {
      self.registration.showNotification(title || 'Life OS', {
        body: body || '',
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: id,
        renotify: true,
        vibrate: [200, 100, 200],
      });
      pendingTimers.delete(id);
    }, delayMs);
    pendingTimers.set(id, timer);
  }

  if (data.type === 'CANCEL_NOTIFICATION') {
    const { id } = data;
    if (pendingTimers.has(id)) { clearTimeout(pendingTimers.get(id)); pendingTimers.delete(id); }
  }

  // App sends its current notification schedule so the SW can store it for
  // periodic sync when the app is closed.
  if (data.type === 'SYNC_SCHEDULE') {
    // Store in IndexedDB-like fashion via CacheStorage key
    caches.open('life-os-schedule').then((c) =>
      c.put('/schedule', new Response(JSON.stringify(data.schedule), { headers: { 'Content-Type': 'application/json' } }))
    );
  }
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// ─── Periodic Background Sync ─────────────────────────────────────────────────
// Fires even when the app is closed (if browser supports it & user granted permission).
// Reads the schedule stored via SYNC_SCHEDULE and fires any due notifications.
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'life-os-notify') {
    e.waitUntil(checkAndFireScheduled());
  }
});

async function checkAndFireScheduled() {
  try {
    const cache = await caches.open('life-os-schedule');
    const resp = await cache.match('/schedule');
    if (!resp) return;
    const schedule = await resp.json();
    const now = Date.now();
    for (const item of schedule) {
      // item: { id, title, body, fireAt (unix ms), fired }
      if (!item.fired && item.fireAt <= now) {
        await self.registration.showNotification(item.title || 'Life OS', {
          body: item.body || '',
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: item.id,
          renotify: true,
          vibrate: [200, 100, 200],
        });
        // Mark as fired
        item.fired = true;
      }
    }
    // Update cache with fired flags
    await cache.put('/schedule', new Response(JSON.stringify(schedule), { headers: { 'Content-Type': 'application/json' } }));
  } catch (_) {}
}
