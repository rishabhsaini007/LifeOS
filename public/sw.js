const CACHE_NAME = 'lifeos-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-first falling back to cache)
self.addEventListener('fetch', (e) => {
  // Let the browser handle Firebase Auth and Firestore calls directly
  if (e.request.url.includes('firestore.googleapis.com') || e.request.url.includes('identitytoolkit.googleapis.com') || e.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }
  
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Cache successful GET requests of our own domain
        if (response.status === 200 && e.request.method === 'GET' && e.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // fallback response if asset not cached
          if (e.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, options, delay } = event.data;
    // Schedule a local notification using a timeout (best-effort background)
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(title, options);
      }, delay);
    } else {
      self.registration.showNotification(title, options);
    }
  }
});

// Handle notification actions (Complete / Snooze / Click)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const reminderId = event.notification.data?.id;
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find open window and send message
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: action || 'click',
            reminderId: reminderId
          });
          return client.focus();
        }
      }
      
      // If no window open, open the app
      if (self.clients.openWindow) {
        return self.clients.openWindow('/').then((client) => {
          if (client) {
            // Give the app time to load, then send message
            setTimeout(() => {
              client.postMessage({
                type: 'NOTIFICATION_ACTION',
                action: action || 'click',
                reminderId: reminderId
              });
            }, 3000);
          }
        });
      }
    })
  );
});
