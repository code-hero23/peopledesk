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

    return null;
};

export default PWAFresher;
