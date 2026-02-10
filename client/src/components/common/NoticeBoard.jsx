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

    const renderContent = (content) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return content.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8"
        >
            <div className={`
                p-1 rounded-[2rem] bg-gradient-to-r 
                ${currentNotice.priority === 'URGENT' ? 'from-red-600/50 via-orange-500/30 to-red-600/50 animate-pulse' : 'from-blue-600/30 via-slate-700/30 to-blue-600/30'}
                backdrop-blur-xl shadow-2xl
            `}>
                <div className="bg-slate-900/90 rounded-[1.8rem] p-6 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] -z-10 group-hover:bg-blue-500/10 transition-all duration-700" />

                    <div className="flex items-start gap-4">
                        <div className={`
                            p-3 rounded-2xl flex items-center justify-center
                            ${getPriorityColor(currentNotice.priority)}
                        `}>
                            {getIcon(currentNotice.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${getPriorityColor(currentNotice.priority)}`}>
                                    {currentNotice.priority}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    {new Date(currentNotice.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 truncate">
                                {currentNotice.title}
                            </h3>

                            <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 md:line-clamp-none whitespace-pre-wrap">
                                {renderContent(currentNotice.content)}
                            </p>
                        </div>

                        {announcements.length > 1 && (
                            <div className="flex flex-col gap-2 ml-4">
                                <button onClick={prevNotice} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="text-[10px] font-mono text-center text-slate-500">
                                    {currentIndex + 1}/{announcements.length}
                                </div>
                                <button onClick={nextNotice} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default NoticeBoard;
