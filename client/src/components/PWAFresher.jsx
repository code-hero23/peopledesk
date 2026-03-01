import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAFresher = () => {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
            // Optional: Check for updates periodically
            if (r) {
                // Check immediately
                r.update();

                // Check every 5 minutes
                setInterval(() => {
                    console.log('Checking for SW update...');
                    r.update();
                }, 5 * 60 * 1000);

                // Check on window focus/visibility change
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') {
                        console.log('App visible, checking for SW update...');
                        r.update();
                    }
                });
            }
        },
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
    });

    useEffect(() => {
        if (needRefresh) {
            console.log('New content available, reloading...');
            updateServiceWorker(true);
        }
    }, [needRefresh, updateServiceWorker]);

    // Handle CacheStorage errors or Unexpected internal errors
    useEffect(() => {
        const handleError = async (event) => {
            const error = event.reason || event;
            const errorMessage = error?.message || String(error);

            if (
                errorMessage.includes('CacheStorage') ||
                errorMessage.includes('Unexpected internal error') ||
                errorMessage.includes('Failed to execute \'open\' on \'CacheStorage\'')
            ) {
                console.error('Detected PWA Cache Corruption. Attempting to clear caches...', error);

                try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('Caches cleared. Reloading app...');
                    window.location.reload();
                } catch (e) {
                    console.error('Failed to clear caches manually.', e);
                }
            }
        };

        window.addEventListener('unhandledrejection', handleError);
        return () => window.removeEventListener('unhandledrejection', handleError);
    }, []);

    return null;
};

export default PWAFresher;
