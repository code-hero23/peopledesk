import { motion } from 'framer-motion';
import { Mail, Phone, MessageCircle, X, ExternalLink } from 'lucide-react';

const SupportModal = ({ onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#0F1115] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
            >
                {/* Header Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-20"
                >
                    <X size={20} />
                </button>

                <div className="p-8 relative z-10">
                    <div className="mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                            <Headset className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Need Assistance?</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Our support team is here to help you. Choose a method below to get in touch with us.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <a
                            href="mailto:es.cookscape@gmail.com"
                            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group"
                        >
                            <div className="p-3 rounded-full bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <Mail size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold text-sm">Email Support</h3>
                                <p className="text-slate-500 text-xs mt-0.5">es.cookscape@gmail.com</p>
                            </div>
                            <ExternalLink size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                        </a>

                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed">
                            <div className="p-3 rounded-full bg-green-500/10 text-green-400">
                                <MessageCircle size={20} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold text-sm">Live Chat</h3>
                                <p className="text-slate-500 text-xs mt-0.5">Coming soon</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                            PeopleDesk Support Center
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SupportModal;
