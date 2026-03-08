// Service Worker for PeopleDesk Push Notifications
self.addEventListener('push', (event) => {
    try {
        const data = event.data ? event.data.json() : {
            title: 'PeopleDesk Alert',
            body: 'You have a new notification'
        };

        const options = {
            body: data.body,
            icon: data.icon || '/orbix-logo.png',
            badge: data.badge || '/orbix-logo.png',
            tag: data.tag || 'general-notification',
            data: data.data || { url: '/' },
            vibrate: [200, 100, 200, 100, 200, 100, 400],
            actions: [
                { action: 'open', title: 'Open App' },
                { action: 'close', title: 'Dismiss' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    } catch (error) {
        console.error('Push handling error:', error);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window open and focus it if so
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
