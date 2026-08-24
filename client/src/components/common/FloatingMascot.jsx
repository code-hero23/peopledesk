import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GripHorizontal } from 'lucide-react';
import axios from 'axios';

const FloatingMascot = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [mascotSrc, setMascotSrc] = useState('/floating-mascot.gif');

    const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
    const SERVER_URL = API_URL.replace(/\/api$/, '');

    useEffect(() => {
        const fetchMascot = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const token = user?.token;
                const res = await axios.get(`${API_URL}/popup`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (res.data && res.data.imageUrl) {
                    const fullImg = res.data.imageUrl.startsWith('http') ? res.data.imageUrl : `${SERVER_URL}${res.data.imageUrl}`;
                    setMascotSrc(fullImg);
                }
            } catch (err) {
                console.warn('Could not fetch custom floating mascot config, using default.');
            }
        };
        fetchMascot();
    }, []);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0.1}
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="fixed bottom-6 right-6 z-[9999] pointer-events-auto flex flex-col items-end select-none cursor-grab active:cursor-grabbing"
            >
                {!isMinimized ? (
                    <div className="relative group flex flex-col items-end">
                        {/* Action Control Buttons & Drag Handle */}
                        <div className="flex items-center gap-1.5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-900/90 text-white rounded-full backdrop-blur-md border border-white/20 shadow-xl">
                                <GripHorizontal size={12} className="text-amber-400" />
                                <span>Drag Me</span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMinimized(true);
                                }}
                                className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-900/90 hover:bg-slate-900 text-white rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-transform active:scale-95"
                                title="Minimize"
                            >
                                Minimize
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsVisible(false);
                                }}
                                className="p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-full backdrop-blur-md shadow-xl transition-transform active:scale-95"
                                title="Close"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        {/* Interactive Large Floating Card */}
                        <div className="relative cursor-grab active:cursor-grabbing">
                            <img
                                src={mascotSrc}
                                alt="Mascot"
                                onError={() => setMascotSrc('/floating-mascot.gif')}
                                className="w-64 h-64 md:w-96 md:h-96 object-contain pointer-events-none drop-shadow-2xl translate-z-0"
                            />
                        </div>
                    </div>
                ) : (
                    /* Minimized Bubble State */
                    <motion.button
                        onClick={() => setIsMinimized(false)}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="relative w-14 h-14 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-amber-400/50 shadow-xl flex items-center justify-center overflow-hidden p-1 group cursor-grab active:cursor-grabbing"
                        title="Show Mascot (Click to expand, drag to move)"
                    >
                        <img
                            src={mascotSrc}
                            alt="Mascot Mini"
                            onError={() => setMascotSrc('/floating-mascot.gif')}
                            className="w-full h-full object-contain pointer-events-none"
                        />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                    </motion.button>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default FloatingMascot;
