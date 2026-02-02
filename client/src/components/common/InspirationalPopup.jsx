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
                setConfig(res.data);

                // Show after a short delay
                const timer = setTimeout(() => {
                    setIsVisible(true);
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

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 200, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 200, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed bottom-8 right-8 z-[100] w-[calc(100%-4rem)] max-w-[450px] pointer-events-none"
                >
                    <div className="relative pointer-events-auto">
                        {/* Premium Glassmorphic Container - Removed overflow-hidden to prevent image clipping */}
                        <div className="bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] flex items-center ring-1 ring-white/10 relative">

                            {/* Left Side: Author Cutout Image Container */}
                            {config.imageUrl && (
                                <div className="hidden sm:block w-1/3 relative h-48 ml-4 pointer-events-none">
                                    <motion.img
                                        src={`${API_URL}${config.imageUrl}`}
                                        alt={config.author}
                                        className="absolute bottom-0 left-0 h-52 object-contain z-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] scale-110 origin-bottom"
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ duration: 0.8 }}
                                    />
                                </div>
                            )}

                            {/* Mobile Image (Small & Circular) */}
                            <div className="sm:hidden w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500/30 m-4 flex-shrink-0">
                                <img src={`${API_URL}${config.imageUrl}`} className="w-full h-full object-cover" />
                            </div>

                            {/* Right Side: Quote Content */}
                            <div className="flex-1 p-6 md:p-8 relative">
                                {/* Decorative elements */}
                                <Quote className="absolute top-2 right-4 w-12 h-12 text-blue-500/5 -rotate-12 pointer-events-none" />

                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="relative z-10"
                                >
                                    <p className="text-lg md:text-xl font-extrabold leading-tight italic text-white mb-6 pr-6">
                                        "{config.quote}"
                                    </p>

                                    <div className="flex items-center gap-3">
                                        <div className="h-[2px] w-8 bg-red-600 rounded-full" />
                                        <div className="flex flex-col">
                                            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-red-500">
                                                {config.author}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                Visionary Spotlight
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Improved Close Button */}
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-white/30 hover:text-white hover:bg-red-600/80 transition-all z-30 border border-white/10"
                                    title="Close"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Animated Background Pulse */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[50px] -z-10 animate-pulse" />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default InspirationalPopup;
