import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { AlertCircle, CheckCircle, HelpCircle, Laptop, BellRing } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'info', confirmText = 'Confirm', cancelText = 'Cancel' }) => {

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Type configurations
    const config = {
        danger: {
            icon: AlertCircle,
            gradient: 'from-red-500 to-red-600',
            bgLight: 'bg-red-50',
            textColor: 'text-red-600',
            borderColor: 'border-red-100',
            shadow: 'shadow-red-500/20'
        },
        warning: {
            icon: BellRing,
            gradient: 'from-orange-500 to-amber-500',
            bgLight: 'bg-orange-50',
            textColor: 'text-orange-600',
            borderColor: 'border-orange-100',
            shadow: 'shadow-orange-500/20'
        },
        info: {
            icon: Laptop, // Using Laptop for "Login" context mostly, or generic Info
            gradient: 'from-blue-500 to-indigo-600',
            bgLight: 'bg-blue-50',
            textColor: 'text-blue-600',
            borderColor: 'border-blue-100',
            shadow: 'shadow-blue-500/20'
        },
        success: {
            icon: CheckCircle,
            gradient: 'from-emerald-500 to-green-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-600',
            borderColor: 'border-emerald-100',
            shadow: 'shadow-emerald-500/20'
        }
    }[type] || { // Fallback
        icon: HelpCircle,
        gradient: 'from-slate-700 to-slate-800',
        bgLight: 'bg-slate-100',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-200',
        shadow: 'shadow-slate-500/20'
    };

    const Icon = config.icon;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative z-10 font-sans"
                    >
                        {/* Interactive Top Pattern */}
                        <div className={`h-24 w-full bg-gradient-to-br ${config.gradient} relative overflow-hidden flex items-center justify-center`}>
                            <div className="absolute inset-0 opacity-20">
                                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                                </svg>
                            </div>

                            {/* Floating Icon with Ring Animation */}
                            <div className="relative">
                                {/* Pulse Ring */}
                                <motion.div
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 rounded-full bg-white blur-md"
                                />
                                {/* Main Icon */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                    className="bg-white p-3 rounded-full shadow-lg relative z-10"
                                >
                                    <Icon size={32} className={config.textColor} strokeWidth={2} />
                                </motion.div>
                            </div>
                        </div>

                        <div className="px-6 py-6 pt-10 -mt-6 relative z-0 bg-white rounded-t-3xl">
                            <div className="text-center space-y-3">
                                <h3 className="text-xl font-bold text-slate-800">
                                    {title}
                                </h3>
                                <div className="text-slate-500 text-sm leading-relaxed whitespace-pre-line px-2">
                                    {message}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: '#f1f5f9' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl transition-colors"
                                >
                                    {cancelText}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg bg-gradient-to-r ${config.gradient} ${config.shadow}`}
                                >
                                    {confirmText}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ConfirmationModal;
