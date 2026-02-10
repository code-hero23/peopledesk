import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headset, X } from 'lucide-react';
import SupportModal from './SupportModal';

const SupportButton = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-6 z-[999] p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full text-white shadow-[0_10px_30px_-5px_rgba(0,0,0,0.5)] hover:bg-slate-800 transition-all group overflow-hidden"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-2">
                    <Headset className="w-6 h-6" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:ml-2">
                        Get Support
                    </span>
                </div>
            </motion.button>

            <AnimatePresence>
                {isOpen && <SupportModal onClose={() => setIsOpen(false)} />}
            </AnimatePresence>
        </>
    );
};

export default SupportButton;
