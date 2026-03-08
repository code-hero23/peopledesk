import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Bell, BellOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HourlyAlarm = () => {
    const { user } = useSelector((state) => state.auth);
    const [isEnabled, setIsEnabled] = useState(true);
    const audioContextRef = useRef(null);
    const lastRungHour = useRef(-1);

    // Only for AE
    const isAE = user?.designation === 'AE';

    const VAPID_PUBLIC_KEY = "BOP1fHGa34CnDiQuA8NSVd4DvmSLPrvphs-qMgJF2l75J0yOwiSHdYwTfESjPYGTy_Kkk8jTAjoxG4uXMvOsu4Y";

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const subscribeToPush = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Check for existing subscription
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // Request permission
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.log('Notification permission denied');
                    return;
                }

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }

            // Send subscription to backend
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/notifications/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Adjust based on your auth storage
                },
                body: JSON.stringify({ subscription })
            });

            if (response.ok) {
                console.log('Successfully subscribed to push notifications');
            }
        } catch (error) {
            console.error('Error subscribing to push:', error);
        }
    };

    const playChime = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;
            const ALARM_DURATION = 25; // 25 seconds total
            
            // Pleasant "ding-dong" chime
            const playDingDong = (startTime) => {
                const playNote = (freq, start, duration) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, start);
                    
                    gain.gain.setValueAtTime(0, start);
                    gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(start);
                    osc.stop(start + duration);
                };

                // Ding
                playNote(880, startTime, 1.2); 
                // Dong
                playNote(659.25, startTime + 0.3, 1.0);
            };

            // Loop the chime every 2 seconds for the duration
            for (let offset = 0; offset < ALARM_DURATION; offset += 2) {
                playDingDong(now + offset);
            }

            toast.info("⏰ Hourly Update! Time to record your project status.", {
                position: "bottom-right",
                icon: "🔔",
                style: { borderRadius: '1rem', fontWeight: 'bold' }
            });
        } catch (error) {
            console.error("Audio error:", error);
        }
    };

    useEffect(() => {
        if (!isAE || !isEnabled) return;

        // Subscribe to push when AE enables alarm
        subscribeToPush();

        const checkTime = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // Time window: 10:30 AM (10:30) to 7:30 PM (19:30)
            const currentTimeInMinutes = hours * 60 + minutes;
            const startLimit = 10 * 60 + 30; // 10:30
            const endLimit = 19 * 60 + 30;   // 19:30

            // Trigger at 30 minutes past every hour within the window
            if (currentTimeInMinutes >= startLimit && currentTimeInMinutes <= endLimit) {
                if (minutes === 30 && lastRungHour.current !== hours) {
                    playChime();
                    lastRungHour.current = hours;
                }
            }
        };

        // Check every 30 seconds to be precise
        const interval = setInterval(checkTime, 30000);
        checkTime(); // Initial check

        return () => clearInterval(interval);
    }, [isAE, isEnabled]);

    if (!isAE) return null;

    return (
        <div className="fixed bottom-24 right-5 z-[100] md:bottom-20 md:right-32 flex flex-col items-end gap-3">
            <AnimatePresence>
                {isEnabled && (
                    <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            playChime();
                            subscribeToPush(); // Ensure subscribed on test
                        }}
                        className="px-4 py-2 bg-white text-indigo-600 rounded-2xl shadow-lg border border-indigo-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                        <Sparkles size={14} /> Test Sound
                    </motion.button>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                    if (!audioContextRef.current) {
                        playChime(); // Initialize audio on first click
                    }
                    if (!isEnabled) {
                        subscribeToPush(); // Request permission when enabling
                    }
                    setIsEnabled(!isEnabled);
                    toast.success(isEnabled ? "Hourly Alarm Muted" : "Hourly Alarm Enabled & Notifications Active", { autoClose: 2000 });
                }}
                className={`p-4 rounded-full shadow-xl flex items-center gap-3 transition-all ${
                    isEnabled 
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' 
                    : 'bg-slate-200 text-slate-500'
                }`}
                title={isEnabled ? "Mute Hourly Alarm" : "Enable Hourly Alarm"}
            >
                {isEnabled ? <Bell size={24} className="animate-swing" /> : <BellOff size={24} />}
                {isEnabled && (
                    <motion.span 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 'auto', opacity: 1 }}
                        className="text-xs font-black uppercase tracking-widest overflow-hidden whitespace-nowrap"
                    >
                        AE Alarm Active
                    </motion.span>
                )}
            </motion.button>
        </div>
    );
};

export default HourlyAlarm;
