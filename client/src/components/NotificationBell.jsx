import { useState, useEffect, useRef } from 'react';
import { Bell, X, Info, Check, Trash2, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
    const { user } = useSelector((state) => state.auth);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };
            const { data } = await axios.get('/api/notifications', config);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };
            await axios.put(`/api/notifications/${id}/read`, {}, config);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const clearAll = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };
            await axios.delete('/api/notifications', config);
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group"
            >
                <Bell size={24} className={`transition-all ${unreadCount > 0 ? 'text-indigo-600 dark:text-primary animate-ring' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 items-center justify-center text-[10px] font-black text-white">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-96 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-[200] overflow-hidden"
                    >
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black tracking-tight">Notifications</h3>
                                <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mt-1">Updates & Alerts</p>
                            </div>
                            {notifications.length > 0 && (
                                <button 
                                    onClick={clearAll}
                                    className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
                                    title="Clear All"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto scrollbar-hide py-2">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                                        <Bell size={32} />
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div 
                                        key={notif.id}
                                        className={`p-5 m-2 rounded-2xl border transition-all hover:scale-[1.02] ${notif.isRead ? 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800' : 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30 shadow-sm'}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${notif.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                                <Info size={20} />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-sm font-black tracking-tight ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>{notif.title}</p>
                                                    {!notif.isRead && (
                                                        <button 
                                                            onClick={() => markAsRead(notif.id)}
                                                            className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                                                            title="Mark as read"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium text-slate-500 leading-relaxed">{notif.message}</p>
                                                <div className="flex items-center gap-2 pt-1">
                                                    <Clock size={10} className="text-slate-300" />
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style jsx>{`
                @keyframes ring {
                    0% { transform: rotate(0); }
                    10% { transform: rotate(15deg); }
                    20% { transform: rotate(-15deg); }
                    30% { transform: rotate(10deg); }
                    40% { transform: rotate(-10deg); }
                    50% { transform: rotate(5deg); }
                    60% { transform: rotate(-5deg); }
                    100% { transform: rotate(0); }
                }
                .animate-ring {
                    animation: ring 2s ease infinite;
                    transform-origin: top center;
                }
            `}</style>
        </div>
    );
};

export default NotificationBell;
