import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Plus, Trash2, Edit2, AlertCircle, Info, ScrollText, Calendar, X, Save, Clock, User } from 'lucide-react';
import axios from 'axios';

const AnnouncementManagement = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [message, setMessage] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'INFO',
        priority: 'LOW',
        expiresAt: ''
    });

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await axios.get(`${API_URL}/announcements`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setAnnouncements(res.data);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            setIsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (editingAnnouncement) {
                await axios.put(`${API_URL}/announcements/${editingAnnouncement.id}`, formData, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setMessage({ type: 'success', text: 'Announcement updated successfully!' });
            } else {
                await axios.post(`${API_URL}/announcements`, formData, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setMessage({ type: 'success', text: 'Announcement posted successfully!' });
            }
            setIsModalOpen(false);
            setEditingAnnouncement(null);
            setFormData({ title: '', content: '', type: 'INFO', priority: 'LOW', expiresAt: '' });
            fetchAnnouncements();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving announcement' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this announcement?')) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await axios.delete(`${API_URL}/announcements/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMessage({ type: 'success', text: 'Announcement deactivated successfully!' });
            fetchAnnouncements();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error deleting announcement' });
        }
    };

    const openEditModal = (announcement) => {
        setEditingAnnouncement(announcement);
        setFormData({
            title: announcement.title,
            content: announcement.content,
            type: announcement.type,
            priority: announcement.priority,
            expiresAt: announcement.expiresAt ? announcement.expiresAt.split('T')[0] : ''
        });
        setIsModalOpen(true);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'RULE': return <ScrollText className="w-5 h-5" />;
            case 'EVENT': return <Calendar className="w-5 h-5" />;
            case 'NEWS': return <Megaphone className="w-5 h-5" />;
            default: return <Info className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header Area */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                        <Megaphone size={30} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Announcement Center</h2>
                        <p className="text-slate-500 font-medium">Broadcast news, rules, and updates team-wide</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingAnnouncement(null);
                        setFormData({ title: '', content: '', type: 'INFO', priority: 'LOW', expiresAt: '' });
                        setIsModalOpen(true);
                    }}
                    className="group bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl transition-all active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    <span className="font-bold">Post Update</span>
                </button>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className={`p-6 rounded-[1.5rem] border flex items-center gap-4 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${message.type === 'success' ? 'bg-emerald-200' : 'bg-red-200'}`}>
                        {message.type === 'success' ? '✓' : '!'}
                    </div>
                    <span className="font-bold">{message.text}</span>
                </motion.div>
            )}

            {/* List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {announcements.map((announcement) => (
                        <motion.div
                            key={announcement.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white border-2 border-slate-50 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group relative overflow-hidden h-full flex flex-col"
                        >
                            {/* Priority Badge */}
                            <div className="flex justify-between items-start mb-6">
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border 
                                    ${announcement.priority === 'URGENT' ? 'bg-red-500 text-white border-red-400 animate-pulse' :
                                        announcement.priority === 'HIGH' ? 'bg-orange-500 text-white border-orange-400' :
                                            'bg-slate-100 text-slate-600 border-slate-200'}
                                `}>
                                    {announcement.priority}
                                </span>

                                <div className="flex gap-1">
                                    <button onClick={() => openEditModal(announcement)} className="p-2 rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(announcement.id)} className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    {getIcon(announcement.type)}
                                </div>
                                <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-blue-700 transition-colors">{announcement.title}</h4>
                            </div>

                            <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1 line-clamp-4 italic">
                                "{announcement.content}"
                            </p>

                            <div className="mt-auto space-y-3 pt-6 border-t border-slate-50">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <User size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{announcement.author.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Clock size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(announcement.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-blue-600/50 uppercase tracking-widest">{announcement.type}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Premium Post Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl relative overflow-hidden"
                        >
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X size={24} />
                            </button>

                            <div className="mb-8">
                                <h3 className="text-3xl font-black text-slate-800 mb-2">{editingAnnouncement ? 'Edit Notice' : 'New Broadcast'}</h3>
                                <p className="text-slate-500">Post an update that everyone will see.</p>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Notice Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. New Office Timings"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Message Content</label>
                                    <textarea
                                        required
                                        rows={4}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="What's the update?"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Category</label>
                                        <select
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none font-bold text-slate-700"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="INFO">Information</option>
                                            <option value="RULE">Office Law/Rule</option>
                                            <option value="NEWS">Big News</option>
                                            <option value="EVENT">Event/Celebration</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Priority</label>
                                        <select
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent outline-none font-bold text-slate-700"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        >
                                            <option value="LOW">Low (Casual)</option>
                                            <option value="MEDIUM">Medium (Normal)</option>
                                            <option value="HIGH">High (Important)</option>
                                            <option value="URGENT">Urgent (Flash Notice)</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
                                >
                                    <Save size={20} />
                                    <span>{editingAnnouncement ? 'Save Changes' : 'Broadcast Now'}</span>
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AnnouncementManagement;
