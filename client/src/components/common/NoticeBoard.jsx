import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Megaphone, ScrollText, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import axios from 'axios';

const NoticeBoard = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (announcements.length > 1) {
                nextNotice();
            }
        }, 8000); // Auto-scroll every 8 seconds
        return () => clearInterval(interval);
    }, [announcements.length, currentIndex]);

    const fetchAnnouncements = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = user?.token;
            if (!token) return;

            const res = await axios.get(`${API_URL}/announcements`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnnouncements(res.data);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            setIsLoading(false);
        }
    };

    if (isLoading || announcements.length === 0) return null;

    const currentNotice = announcements[currentIndex];

    const getIcon = (type) => {
        switch (type) {
            case 'RULE': return <ScrollText className="w-5 h-5" />;
            case 'URGENT': return <AlertCircle className="w-5 h-5 text-red-400" />;
            case 'EVENT': return <Calendar className="w-5 h-5" />;
            default: return <Megaphone className="w-5 h-5" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'URGENT': return 'bg-red-500/10 border-red-500/20 text-red-400';
            case 'HIGH': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
            case 'MEDIUM': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
            default: return 'bg-slate-500/10 border-slate-500/20 text-slate-400';
        }
    };

    const nextNotice = () => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
    };

    const prevNotice = () => {
        setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-8"
        >
            <div className={`
                p-1 rounded-[2rem] bg-gradient-to-r 
                ${currentNotice.priority === 'URGENT' ? 'from-red-600 via-orange-500 to-red-600 animate-pulse' : 'from-blue-600/30 via-slate-700/30 to-blue-600/30'}
                backdrop-blur-xl shadow-2xl relative overflow-hidden
            `}>
                {/* News Ticker Background Overlay for Urgent */}
                {currentNotice.priority === 'URGENT' && (
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03] overflow-hidden whitespace-nowrap flex items-center">
                        <motion.div
                            animate={{ x: [0, -1000] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="text-[120px] font-black uppercase text-white"
                        >
                            URGENT NOTICE • ATTENTION REQUIRED • IMPORTANT UPDATE • RULE CHANGE •&nbsp;
                        </motion.div>
                        <motion.div
                            animate={{ x: [0, -1000] }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="text-[120px] font-black uppercase text-white"
                        >
                            URGENT NOTICE • ATTENTION REQUIRED • IMPORTANT UPDATE • RULE CHANGE •&nbsp;
                        </motion.div>
                    </div>
                )}

                <div className="bg-slate-900/90 rounded-[1.8rem] p-6 text-white relative overflow-hidden group">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentNotice.id}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                            className="flex items-start gap-4"
                        >
                            <div className={`
                                p-3 rounded-2xl flex items-center justify-center relative
                                ${getPriorityColor(currentNotice.priority)}
                            `}>
                                {getIcon(currentNotice.type)}
                                {currentNotice.priority === 'URGENT' && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"
                                    />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${getPriorityColor(currentNotice.priority)}`}>
                                        {currentNotice.priority}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        {new Date(currentNotice.createdAt).toLocaleDateString()} • By {currentNotice.author.name}
                                    </span>
                                </div>

                                <h3 className="text-xl font-black text-white mb-2 truncate bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                    {currentNotice.title}
                                </h3>

                                <p className="text-slate-300 text-sm leading-relaxed font-medium">
                                    {currentNotice.content}
                                </p>
                            </div>

                            {/* Pagination Controls */}
                            {announcements.length > 1 && (
                                <div className="flex flex-col gap-2 ml-4 relative z-10">
                                    <button onClick={prevNotice} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-90">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div className="text-[10px] font-mono text-center text-slate-500 bg-white/5 py-1 rounded-lg">
                                        {currentIndex + 1}/{announcements.length}
                                    </div>
                                    <button onClick={nextNotice} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-90">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Progress Bar for Auto-scroll */}
                    {announcements.length > 1 && (
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                            <motion.div
                                key={currentIndex}
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 8, ease: "linear" }}
                                className={`h-full ${currentNotice.priority === 'URGENT' ? 'bg-red-500' : 'bg-blue-500'}`}
                            />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default NoticeBoard;
