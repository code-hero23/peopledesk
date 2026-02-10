import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Quote, User, Save, Eye, Power, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const PopupManagement = () => {
    const [config, setConfig] = useState({
        quote: '',
        author: '',
        imageUrl: '',
        isActive: true,
        type: 'INSPIRATIONAL'
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const API_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = user?.token;
            if (!token) return;
            const res = await axios.get(`${API_URL}/popup`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setConfig(res.data);
                if (res.data.imageUrl) {
                    setPreviewImage(`${API_URL}${res.data.imageUrl}`);
                }
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'image/png') {
            setMessage({ type: 'error', text: 'Please upload a PNG image with a transparent background.' });
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        setIsUploading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = user?.token;
            const res = await axios.post(`${API_URL}/popup/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            setConfig({ ...config, imageUrl: res.data.imageUrl });
            setPreviewImage(`${API_URL}${res.data.imageUrl}`);
            setMessage({ type: 'success', text: 'Image uploaded successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Upload failed. Please try again.' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = user?.token;
            await axios.post(`${API_URL}/popup`, config, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save configuration.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 lg:p-10 bg-[#0a0a0b] min-h-screen text-white font-sans">
            <header className="mb-10">
                <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white mb-2">Popup <span className="text-red-600">Management</span></h1>
                <p className="text-slate-500 font-medium">Configure the global "Visionary Spotlight" motivational popup.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* Editor Section */}
                <section className="space-y-8 bg-[#151719] p-8 rounded-[2rem] border border-white/5 shadow-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-600/10 rounded-xl">
                                <Quote className="w-6 h-6 text-red-600" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Configuration</h2>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.isActive}
                                onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                            <span className="ml-3 text-sm font-black uppercase tracking-widest text-slate-500">{config.isActive ? 'Active' : 'Disabled'}</span>
                        </label>
                    </div>

                    <div className="space-y-6">
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Author PNG (Cutout)</label>
                            <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-3xl bg-black/20 hover:border-red-600/50 hover:bg-red-600/5 transition-all cursor-pointer group/upload">
                                {isUploading ? (
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                                ) : config.imageUrl ? (
                                    <img src={previewImage} className="h-full object-contain p-4" alt="Preview" />
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload className="w-8 h-8 text-slate-600 group-hover/upload:text-red-600 mb-2 transition-colors" />
                                        <span className="text-xs font-black text-slate-600 group-hover/upload:text-slate-400">Click to upload PNG</span>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/png" onChange={handleImageUpload} />
                            </label>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Popup Type</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setConfig({ ...config, type: 'INSPIRATIONAL' })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${config.type === 'INSPIRATIONAL' ? 'border-red-600 bg-red-600/10 text-white' : 'border-white/10 bg-black/20 text-slate-500 hover:border-white/20'}`}
                                >
                                    <Quote className="w-6 h-6" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Inspirational</span>
                                </button>
                                <button
                                    onClick={() => setConfig({ ...config, type: 'BIRTHDAY' })}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${config.type === 'BIRTHDAY' ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 bg-black/20 text-slate-500 hover:border-white/20'}`}
                                >
                                    <span className="text-xl">🎉</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">Birthday Wish</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">{config.type === 'BIRTHDAY' ? 'Birthday Message' : 'Inspirational Quote'}</label>
                            <textarea
                                value={config.quote}
                                onChange={(e) => setConfig({ ...config, quote: e.target.value })}
                                className="w-full p-6 bg-black/20 border border-white/10 rounded-3xl text-sm font-medium focus:border-red-600/50 outline-none transition-all h-32 resize-none"
                                placeholder={config.type === 'BIRTHDAY' ? "Enter the birthday wish..." : "Enter the visionary message here..."}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">{config.type === 'BIRTHDAY' ? 'Birthday Person Name' : 'Author Name'}</label>
                            <div className="relative">
                                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                <input
                                    type="text"
                                    value={config.author}
                                    onChange={(e) => setConfig({ ...config, author: e.target.value })}
                                    className="w-full pl-14 pr-6 py-4 bg-black/20 border border-white/10 rounded-2xl text-sm font-bold focus:border-red-600/50 outline-none transition-all"
                                    placeholder={config.type === 'BIRTHDAY' ? "Name of the celebrant" : "Author Name"}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <AnimatePresence>
                            {message.text && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}
                                >
                                    {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {message.text}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button
                            disabled={isSaving}
                            onClick={handleSave}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all shadow-xl shadow-red-600/20 active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </section>

                {/* Live Preview Section */}
                <section className="relative h-[600px] xl:h-auto bg-[#151719] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-white/5 flex items-center gap-3">
                        <Eye className="w-6 h-6 text-slate-500" />
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-500 italic">Live <span className="text-white">Preview</span></h2>
                    </div>

                    <div className="flex-grow flex items-end justify-center p-12 bg-black/40 relative">
                        {/* Simulation of App Layout */}
                        <div className="absolute inset-0 flex flex-col p-8 opacity-20 pointer-events-none">
                            <div className="w-1/3 h-4 bg-white/20 rounded-full mb-4" />
                            <div className="w-full h-32 bg-white/10 rounded-3xl mb-8" />
                            <div className="grid grid-cols-3 gap-6">
                                <div className="h-24 bg-white/10 rounded-2xl" />
                                <div className="h-24 bg-white/10 rounded-2xl" />
                                <div className="h-24 bg-white/10 rounded-2xl" />
                            </div>
                        </div>

                        {/* The Actual Popup Preview */}
                        <AnimatePresence>
                            {config.isActive && (
                                <motion.div
                                    initial={{ y: 100, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="relative z-10 w-full max-w-lg mb-4"
                                >
                                    {/* Author PNG Cutout */}
                                    {config.imageUrl && (
                                        <motion.img
                                            src={previewImage}
                                            className="absolute -top-32 left-0 h-48 w-auto object-contain z-20"
                                            initial={{ y: 20 }}
                                            animate={{ y: 0 }}
                                            transition={{ repeat: Infinity, duration: 3, repeatType: "reverse", ease: "easeInOut" }}
                                        />
                                    )}

                                    {/* Glass Quote Box */}
                                    <div className={`backdrop-blur-2xl border p-8 pt-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden ${config.type === 'BIRTHDAY' ? 'bg-purple-900/40 border-purple-500/30' : 'bg-white/10 border-white/20'}`}>
                                        {config.type === 'BIRTHDAY' ? (
                                            <div className="absolute -top-2 -right-2 w-24 h-24 text-purple-500/10 -rotate-12 text-6xl flex justify-center items-center select-none pointer-events-none">
                                                🎉
                                            </div>
                                        ) : (
                                            <Quote className="absolute -top-2 -right-2 w-24 h-24 text-white/5 -rotate-12" />
                                        )}

                                        <p className="text-lg font-bold leading-tight italic mb-4 text-white relative z-10">
                                            "{config.quote || (config.type === 'BIRTHDAY' ? 'Wishing you a fantastic year ahead!' : 'Enter your visionary message to see it in action...')}"
                                        </p>
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={`w-8 h-[2px] rounded-full ${config.type === 'BIRTHDAY' ? 'bg-purple-500' : 'bg-red-600'}`} />
                                            <p className={`text-xs font-black uppercase tracking-widest ${config.type === 'BIRTHDAY' ? 'text-purple-400' : 'text-red-500'}`}>
                                                {config.author || (config.type === 'BIRTHDAY' ? 'Birthday Person' : 'Author Name')}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!config.isActive && (
                            <div className="flex flex-col items-center text-slate-700 font-black uppercase tracking-widest">
                                <Power className="w-16 h-16 mb-4 opacity-20" />
                                Popup is currently disabled
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-red-600/5 text-center text-[10px] font-black uppercase tracking-[0.3em] text-red-600/60">
                        Visionary Spotlight Simulator
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PopupManagement;
