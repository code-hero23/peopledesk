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
                setInterval(() => {
                    r.update();
                }, 60 * 60 * 1000); // Check every hour
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
