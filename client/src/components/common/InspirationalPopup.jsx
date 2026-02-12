import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, X } from 'lucide-react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const InspirationalPopup = () => {
    const [config, setConfig] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const location = useLocation();

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        // Don't show on login page or admin management page
        if (location.pathname === '/login' || location.pathname === '/admin/popup-management') {
            setIsVisible(false);
            return;
        }

        fetchConfig();
    }, [location.pathname]);

    const fetchConfig = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = user?.token;
            if (!token) return;

            const res = await axios.get(`${API_URL}/popup`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.isActive) {
                const lastShowTime = localStorage.getItem('last_popup_time');
                const lastConfigUpdate = localStorage.getItem('last_popup_data_update'); // Track the version of content seen

                const now = Date.now();
                const oneHour = 60 * 60 * 1000;

                // Check if this is BRAND NEW content (based on updatedAt timestamp from server)
                // If the config's updatedAt is newer than what we last saw, SHOW IT regardless of time.
                const isNewContent = !lastConfigUpdate || (new Date(res.data.updatedAt).getTime() > new Date(lastConfigUpdate).getTime());

                // Logic: 
                // 1. If content is NEW -> Show immediately (bypass timer)
                // 2. If content is OLD -> Check 1-hour timer
                if (!isNewContent && lastShowTime && (now - parseInt(lastShowTime)) < oneHour) {
                    setIsVisible(false);
                    return;
                }

                setConfig(res.data);

                // Show after a short delay
                const timer = setTimeout(() => {
                    setIsVisible(true);
                    // Mark as shown & store the version we just showed
                    localStorage.setItem('last_popup_time', now.toString());
                    localStorage.setItem('last_popup_data_update', res.data.updatedAt);
                }, 2000);

                return () => clearTimeout(timer);
            } else {
                setIsVisible(false);
            }
        } catch (error) {
            console.error('Error fetching popup config:', error);
        }
    };

    if (!config || !isVisible) return null;

    const isBirthday = config.type === 'BIRTHDAY';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 100, opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="fixed bottom-6 right-6 z-[100] w-[calc(100%-3rem)] max-w-[500px] pointer-events-none font-sans"
                >
                    <div className="relative pointer-events-auto group">
                        {/* Premium Container */}
                        <div className={`
                            ${isBirthday
                                ? 'bg-gradient-to-br from-purple-900/95 via-purple-800/95 to-indigo-900/95 border-purple-400/30 shadow-[0_0_50px_-10px_rgba(168,85,247,0.4)]'
                                : 'bg-slate-900/95 border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]'
                            }
                            backdrop-blur-3xl border rounded-[2.5rem] flex items-stretch ring-1 ring-white/10 relative overflow-hidden transition-all duration-500
                        `}>

                            {/* Birthday Confetti Effect */}
                            {isBirthday && (
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                    {[...Array(30)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute rounded-full"
                                            style={{
                                                width: Math.random() * 6 + 4 + 'px',
                                                height: Math.random() * 6 + 4 + 'px',
                                                backgroundColor: ['#FFD700', '#FF69B4', '#00BFFF', '#32CD32', '#FFF'][i % 5],
                                                left: `${Math.random() * 100}%`,
                                                top: `${Math.random() * 100}%`,
                                                borderRadius: i % 2 === 0 ? '50%' : '2px',
                                            }}
                                            animate={{
                                                y: [0, -120],
                                                x: [0, (i % 2 === 0 ? 20 : -20)],
                                                opacity: [0, 1, 0],
                                                rotate: [0, 360],
                                                scale: [0.5, 1.2, 0.5],
                                            }}
                                            transition={{
                                                duration: 3 + Math.random() * 2,
                                                repeat: Infinity,
                                                ease: "linear",
                                                delay: Math.random() * 3
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* LEFT SIDE: Content */}
                            <div className="flex-1 p-5 md:p-8 md:pr-4 flex flex-col justify-center relative z-10 min-h-[180px] md:min-h-[220px]">
                                {/* Decorative Icon */}
                                {isBirthday ? (
                                    <div className="absolute top-4 right-6 text-4xl md:text-5xl animate-bounce-slow opacity-20 pointer-events-none filter blur-[1px]">
                                        🎂
                                    </div>
                                ) : (
                                    <Quote className="absolute top-6 right-8 w-12 h-12 md:w-16 md:h-16 text-white/5 -rotate-12 pointer-events-none" />
                                )}

                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="relative z-10 space-y-3 md:space-y-4"
                                >
                                    {/* Quote/Message */}
                                    <div className="relative">
                                        <span className={`absolute -top-4 -left-2 text-3xl md:text-4xl ${isBirthday ? 'text-purple-300' : 'text-slate-600'} opacity-30 font-serif`}>“</span>
                                        <p className={`text-base md:text-2xl font-bold leading-relaxed tracking-tight ${isBirthday ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-purple-200' : 'text-white'} drop-shadow-sm`}>
                                            {config.quote}
                                        </p>
                                        <span className={`absolute -bottom-4 -right-2 text-4xl ${isBirthday ? 'text-purple-300' : 'text-slate-600'} opacity-30 font-serif`}>”</span>
                                    </div>

                                    {/* Divider & Author */}
                                    <div className="pt-2 flex items-center gap-4">
                                        <div className={`h-[3px] w-12 ${isBirthday ? 'bg-gradient-to-r from-purple-400 to-pink-400' : 'bg-red-600'} rounded-full shadow-lg`} />

                                        <div className="flex flex-col">
                                            <p className={`text-xs font-black uppercase tracking-[0.2em] ${isBirthday ? 'text-purple-300' : 'text-red-500'}`}>
                                                {config.author}
                                            </p>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                                                {isBirthday ? '🎉 Birthday & Celebration' : '✨ Visionary Spotlight'}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* RIGHT SIDE: Author Cutout Image */}
                            {config.imageUrl && (
                                <div className="hidden sm:block w-[180px] relative flex-shrink-0 mt-auto self-end">
                                    <motion.img
                                        src={`${API_URL}${config.imageUrl}`}
                                        alt={config.author}
                                        className="w-full h-[240px] object-cover object-top mask-image-gradient"
                                        style={{
                                            maskImage: 'linear-gradient(to top, black 80%, transparent 100%)',
                                            WebkitMaskImage: 'linear-gradient(to top, black 80%, transparent 100%)'
                                        }}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ duration: 0.8 }}
                                    />
                                    {/* Glow behind image specifically for birthday */}
                                    {isBirthday && (
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-purple-500/30 blur-[40px] -z-10" />
                                    )}
                                </div>
                            )}

                            {/* Mobile Image (Now on right for mobile too due to order) */}
                            <div className={`sm:hidden w-16 h-16 rounded-2xl overflow-hidden border-2 ${isBirthday ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'border-blue-500/30'} m-5 flex-shrink-0 self-start`}>
                                <img src={`${API_URL}${config.imageUrl}`} className="w-full h-full object-cover" />
                            </div>

                            {/* Close Button - Always visible for better UX, especially on mobile */}
                            <button
                                onClick={() => setIsVisible(false)}
                                className={`absolute top-3 right-3 md:top-4 md:right-4 p-3 md:p-2.5 rounded-full ${isBirthday ? 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white' : 'bg-white/10 text-white/60 hover:bg-red-600 hover:text-white'} transition-all duration-300 z-50 backdrop-blur-md border border-white/10 shadow-lg`}
                                title="Close"
                            >
                                <X size={20} className="md:w-4 md:h-4" />
                            </button>

                            {/* Background Atmosphere */}
                            <div className={`absolute top-0 right-0 w-64 h-64 ${isBirthday ? 'bg-pink-600/20' : 'bg-blue-600/5'} blur-[80px] -z-10 animate-pulse-slow`} />
                            <div className={`absolute bottom-0 left-0 w-48 h-48 ${isBirthday ? 'bg-purple-600/20' : 'bg-red-600/5'} blur-[60px] -z-10`} />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InspirationalPopup;
