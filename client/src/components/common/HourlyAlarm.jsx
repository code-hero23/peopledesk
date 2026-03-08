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
            
            // Create a pleasant "ding-dong" chime using oscillators
            const playNote = (freq, startTime, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            // Two-tone chime
            playNote(880, now, 1.5); // A5
            playNote(659.25, now + 0.3, 1.2); // E5

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
                        onClick={playChime}
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
                    setIsEnabled(!isEnabled);
                    toast.success(isEnabled ? "Hourly Alarm Muted" : "Hourly Alarm Enabled", { autoClose: 1000 });
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
