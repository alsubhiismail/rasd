/* رصد · Rasd — receives phone notifications and opens the request when one is tapped.
   It does not cache anything, so the app always loads its latest version. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  const opts = {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    lang: d.lang || 'ar',
    dir: d.dir || 'rtl',
    data: { url: d.url || './' },
    vibrate: [200, 100, 200]
  };
  if (d.tag) { opts.tag = d.tag; opts.renotify = true; }
  e.waitUntil(self.registration.showNotification(d.title || 'رصد', opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.indexOf(self.registration.scope) === 0) {
        await w.focus();
        w.postMessage({ rasd: 'go', url: target });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
