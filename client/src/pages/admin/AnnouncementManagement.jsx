import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Megaphone,
    Plus,
    Trash2,
    Edit2,
    X,
    Sparkles,
    Calendar,
    AlertCircle,
    Info,
    ScrollText,
    Trophy
} from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-toastify';

const AnnouncementManagement = () => {
    const { user: authUser } = useSelector((state) => state.auth);
    const navigate = useNavigate();

    useEffect(() => {
        // Only Admin and HR can manage announcements
        if (authUser && !['ADMIN', 'HR'].includes(authUser.role)) {
            navigate('/admin-dashboard');
        }
    }, [authUser, navigate]);

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

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await axios.get(`${API_URL}/announcements`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setAnnouncements(Array.isArray(res.data) ? res.data : []);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching announcements:', error);
            setAnnouncements([]);
            setIsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (editingAnnouncement) {
                await axios.put(`${API_URL}/announcements/${editingAnnouncement.id}`, formData, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setMessage({ type: 'success', text: 'Announcement updated successfully!' });
                toast.success('Announcement updated successfully!');
            } else {
                await axios.post(`${API_URL}/announcements`, formData, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setMessage({ type: 'success', text: 'Announcement posted successfully!' });
                toast.success('Announcement posted successfully!');
            }
            setIsModalOpen(false);
            setEditingAnnouncement(null);
            setFormData({
                title: '',
                content: '',
                type: 'INFO',
                priority: 'LOW',
                expiresAt: ''
            });
            fetchAnnouncements();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Error saving announcement';
            setMessage({ type: 'error', text: errorMsg });
            toast.error(errorMsg);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this announcement?')) return;
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await axios.delete(`${API_URL}/announcements/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMessage({ type: 'success', text: 'Announcement deleted successfully!' });
            toast.success('Announcement deleted successfully!');
            fetchAnnouncements();
        } catch (error) {
            setMessage({ type: 'error', text: 'Error deleting announcement' });
            toast.error('Error deleting announcement');
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

    const getTypeIcon = (type) => {
        switch (type) {
            case 'RULE':
                return <ScrollText size={16} className="text-purple-600" />;
            case 'EVENT':
                return <Trophy size={16} className="text-amber-500" />;
            case 'NEWS':
                return <Sparkles size={16} className="text-blue-500" />;
            default:
                return <Info size={16} className="text-slate-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
                        <Megaphone className="text-blue-600 w-7 h-7" />
                        <span>Company Announcements</span>
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Broadcast updates, company news, events, and rules to all employee dashboards.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingAnnouncement(null);
                        setFormData({
                            title: '',
                            content: '',
                            type: 'INFO',
                            priority: 'LOW',
                            expiresAt: ''
                        });
                        setIsModalOpen(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-5 py-3 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-500/20"
                >
                    <Plus size={20} />
                    <span>New Announcement</span>
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Announcements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(announcements) && announcements.length === 0 && !isLoading && (
                    <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                        <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="font-bold text-slate-700 text-base">No announcements posted yet</h4>
                        <p className="text-slate-400 text-xs mt-1">Click &quot;New Announcement&quot; above to create your first announcement.</p>
                    </div>
                )}

                {(Array.isArray(announcements) ? announcements : []).map((announcement) => (
                    <div key={announcement.id} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow group">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border 
                                        ${announcement.priority === 'URGENT' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600'}
                                    `}>
                                        {announcement.priority}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                                        {getTypeIcon(announcement.type)}
                                        {announcement.type}
                                    </span>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => openEditModal(announcement)} className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(announcement.id)} className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h4 className="font-bold text-slate-900 text-lg mb-2 leading-snug">{announcement.title}</h4>
                            <p className="text-slate-600 text-sm mb-4 line-clamp-4 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                            <span>{formatDate(announcement.createdAt)}</span>
                            {announcement.expiresAt && (
                                <span className="text-slate-500 font-normal flex items-center gap-1">
                                    <Calendar size={12} />
                                    Expires: {formatDate(announcement.expiresAt)}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Create / Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl relative my-8"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={22} />
                            </button>

                            <div className="mb-6">
                                <h3 className="text-2xl font-black text-slate-900">
                                    {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                                </h3>
                                <p className="text-slate-500 text-xs mt-1">Broadcast an important announcement or update across the company.</p>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Announcement Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Office Relocation / Holiday Notice / Policy Update"
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Notice Content</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Enter the announcement details or message for employees..."
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Type</label>
                                        <select
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="INFO">Information</option>
                                            <option value="EVENT">Upcoming Event</option>
                                            <option value="RULE">New Rule</option>
                                            <option value="NEWS">Company News</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Priority</label>
                                        <select
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent (Pulsing)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Expiry Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none text-sm bg-white"
                                            value={formData.expiresAt}
                                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-6 shadow-lg shadow-slate-900/20"
                                >
                                    <Megaphone size={20} />
                                    <span>{editingAnnouncement ? 'Save & Update Notice' : 'Broadcast Announcement'}</span>
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
