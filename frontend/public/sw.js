// Service Worker for Caretaker AI
// Handles push notifications - minimal caching for dev compatibility

const CACHE_NAME = 'caretaker-ai-v1';

// Install - skip waiting immediately for dev
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate - claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Fetch - pass through to network (don't cache in development)
self.addEventListener('fetch', (event) => {
    // Only handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip caching for development - just pass through to network
    event.respondWith(
        fetch(event.request).catch(() => {
            // Only return cached response for navigation requests
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
            // Return empty response for other failed requests
            return new Response('', { status: 503, statusText: 'Service Unavailable' });
        })
    );
});

// Push notification handler
self.addEventListener('push', (event) => {
    let data = { title: 'Caretaker AI', body: 'New notification' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body || 'New notification from Caretaker AI',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Caretaker AI', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window or open new one
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data?.url || '/');
            }
        })
    );
});
