import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Quote } from 'lucide-react';

const quotes = [
    "We are not just designing spaces — we are shaping the way people live their lives."
];

const CEOPopup = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [currentQuote, setCurrentQuote] = useState(0);

    // Auto-cycle quotes if applicable (currently only 1)
    useEffect(() => {
        if (quotes.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentQuote((prev) => (prev + 1) % quotes.length);
        }, 8000);

        return () => clearInterval(interval);
    }, []);

    // Slight delay on mount
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed bottom-0 right-0 z-50 flex items-end justify-end p-0 pointer-events-none overflow-hidden h-[350px] w-full max-w-[600px]">
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="relative w-full h-full pointer-events-auto"
                        style={{ willChange: 'transform, opacity' }}
                    >
                        {/* Quote Bubble - Smaller & Optimized */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: -20, rotate: -2 }}
                            animate={{ opacity: 1, scale: 1, x: 0, rotate: 0 }}
                            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                            className="absolute bottom-[130px] right-[130px] sm:bottom-[180px] sm:right-[220px] w-56 sm:w-[240px] bg-white/95 backdrop-blur-md border border-white/60 shadow-lg rounded-2xl p-4 z-30 rounded-br-none"
                            style={{ willChange: 'transform' }}
                        >
                            {/* Connector Triangle */}
                            <div className="absolute -bottom-[8px] right-0 w-0 h-0 border-l-[15px] border-l-transparent border-t-[15px] border-t-white/95 border-r-[0px] border-r-transparent"></div>

                            <button
                                onClick={() => setIsVisible(false)}
                                className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full p-1 shadow-sm border transition-all duration-200"
                                aria-label="Close popup"
                            >
                                <X size={12} />
                            </button>

                            <Quote size={20} className="text-blue-600/20 absolute top-2 left-2 -scale-x-100" />

                            <div className="relative z-10 pt-1 pl-1">
                                <p className="text-slate-800 text-xs sm:text-sm font-medium leading-relaxed italic">
                                    "{quotes[currentQuote]}"
                                </p>
                                <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-1 bg-blue-500 rounded-full"></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Raakesh Natarajan</span>
                                    </div>
                                    {/* Small animated indicator */}
                                    <motion.div
                                        animate={{ opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-1.5 h-1.5 bg-green-500 rounded-full cursor-help"
                                        title="Live"
                                    ></motion.div>
                                </div>
                            </div>
                        </motion.div>

                        {/* CEO Image - Smaller & Optimized */}
                        <motion.img
                            src="/ceo.png"
                            alt="CEO"
                            className="absolute bottom-0 right-0 h-[180px] sm:h-[280px] object-contain drop-shadow-xl z-20 origin-bottom"
                            initial={{ opacity: 0, scale: 0.95, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            whileHover={{ scale: 1.02 }}
                            drag
                            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                            dragElastic={0.05}
                            style={{ willChange: 'transform' }}
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CEOPopup;
