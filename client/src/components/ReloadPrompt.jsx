import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

function ReloadPrompt() {
    const sw = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
    });

    // Safely extract properties to avoid "Symbol(Symbol.iterator)" crash
    const offlineReady = sw?.offlineReady?.[0] || false;
    const setOfflineReady = sw?.offlineReady?.[1];

    const needUpdate = sw?.needUpdate?.[0] || false;
    const setNeedUpdate = sw?.needUpdate?.[1];

    const updateServiceWorker = sw?.updateServiceWorker;

    const close = () => {
        if (setOfflineReady) setOfflineReady(false);
        if (setNeedUpdate) setNeedUpdate(false);
    };

    if (!offlineReady && !needUpdate) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] animate-bounce-in">
            <div className="bg-slate-800 text-white p-4 rounded-xl shadow-2xl border border-slate-700 max-w-sm flex items-start gap-4">
                <div className="bg-blue-500 p-2 rounded-lg">
                    <RefreshCw className={`w-5 h-5 ${needUpdate ? 'animate-spin' : ''}`} />
                </div>

                <div className="flex-1">
                    <h4 className="font-bold text-sm">
                        {needUpdate ? 'New Update Available!' : 'Ready for Offline'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                        {needUpdate
                            ? 'A new version of PeopleDesk is ready. Refresh now to see latest changes!'
                            : 'PeopleDesk is ready to work even without internet.'}
                    </p>

                    <div className="flex gap-2 mt-3">
                        {needUpdate && updateServiceWorker && (
                            <button
                                onClick={() => updateServiceWorker(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                                Refresh Now
                            </button>
                        )}
                        <button
                            onClick={close}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                            Later
                        </button>
                    </div>
                </div>

                <button onClick={close} className="text-slate-500 hover:text-white p-1">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default ReloadPrompt;
