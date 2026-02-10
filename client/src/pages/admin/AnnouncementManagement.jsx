import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
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
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Error saving announcement' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await axios.delete(`${API_URL}/announcements/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMessage({ type: 'success', text: 'Announcement deleted successfully!' });
            fetchAnnouncements();
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

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Company Announcements</h2>
                    <p className="text-slate-500 text-sm">Circulate news, rules, and updates to all employees</p>
                </div>
                <button
                    onClick={() => {
                        setEditingAnnouncement(null);
                        setFormData({ title: '', content: '', type: 'INFO', priority: 'LOW', expiresAt: '' });
                        setIsModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    <span>New Announcement</span>
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {announcements.map((announcement) => (
                    <div key={announcement.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative group">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border 
                                ${announcement.priority === 'URGENT' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600'}
                            `}>
                                {announcement.priority}
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => openEditModal(announcement)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(announcement.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <h4 className="font-bold text-slate-800 mb-2">{announcement.title}</h4>
                        <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">{announcement.content}</p>
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(announcement.createdAt).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{announcement.type}</span>
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                            <h3 className="text-2xl font-bold text-slate-800 mb-6">{editingAnnouncement ? 'Edit' : 'Post'} Announcement</h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Announcement Title</label>
                                    <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Notice Content</label>
                                    <textarea required rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Type</label>
                                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="INFO">Information</option>
                                            <option value="RULE">New Rule</option>
                                            <option value="NEWS">Company News</option>
                                            <option value="EVENT">Upcoming Event</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Priority</label>
                                        <select className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                                    <Megaphone size={20} />
                                    <span>{editingAnnouncement ? 'Update Notice' : 'Broadcast Announcement'}</span>
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AnnouncementManagement;
