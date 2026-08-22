import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Heart } from 'lucide-react';

const FloatingMascot = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 50 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="fixed bottom-6 right-6 z-[9999] pointer-events-auto flex flex-col items-end select-none"
            >
                {!isMinimized ? (
                    <motion.div 
                        className="relative group flex flex-col items-end"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    >
                        {/* Action Control Buttons */}
                        <div className="flex items-center gap-1.5 mb-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-900/80 hover:bg-slate-900 text-white rounded-full backdrop-blur-md border border-white/20 shadow-lg transition-transform active:scale-95"
                                title="Minimize"
                            >
                                Minimize
                            </button>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full backdrop-blur-md shadow-lg transition-transform active:scale-95"
                                title="Close"
                            >
                                <X size={12} />
                            </button>
                        </div>

                        {/* Interactive Floating Card */}
                        <motion.div 
                            className="relative cursor-pointer filter drop-shadow-[0_15px_35px_rgba(0,0,0,0.3)]"
                            whileHover={{ scale: 1.08, rotate: 2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <img
                                src="/floating-mascot.gif"
                                alt="Mascot"
                                className="w-28 h-28 md:w-36 md:h-36 object-contain pointer-events-none drop-shadow-2xl"
                            />

                            {/* Ambient Glowing Aura */}
                            <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-amber-400/20 via-orange-500/20 to-red-500/20 rounded-full blur-xl animate-pulse" />
                        </motion.div>
                    </motion.div>
                ) : (
                    /* Minimized Bubble State */
                    <motion.button
                        onClick={() => setIsMinimized(false)}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="relative w-12 h-12 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-amber-400/50 shadow-xl flex items-center justify-center overflow-hidden p-1 group"
                        title="Show Mascot"
                    >
                        <img
                            src="/floating-mascot.gif"
                            alt="Mascot Mini"
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
