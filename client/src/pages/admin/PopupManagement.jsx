import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Quote, User, Save, Eye, Power, CheckCircle, AlertCircle, Trash2, RefreshCw, Camera, X } from 'lucide-react';
import axios from 'axios';

export const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
            const parsed = new URL(url);
            if (parsed.pathname.startsWith('/uploads/')) {
                parsed.pathname = `/api${parsed.pathname}`;
                return parsed.toString();
            }
            if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
                typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                const pathname = parsed.pathname;
                if (pathname.includes('/uploads/')) {
                    const filename = pathname.split('/uploads/').pop();
                    return `/api/uploads/${filename}`;
                }
            }
            return url;
        } catch {
            return url;
        }
    }

    const cleanUrl = url.startsWith('/') ? url : `/${url}`;

    if (cleanUrl.startsWith('/api/uploads/')) {
        return cleanUrl;
    }

    if (cleanUrl.startsWith('/uploads/')) {
        return `/api${cleanUrl}`;
    }

    if (cleanUrl.startsWith('/api/')) {
        return cleanUrl;
    }

    return `/api/uploads${cleanUrl}`;
};

const getApiBase = () => {
    const envBase = import.meta.env.VITE_API_BASE_URL;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return '/api';
    }
    return envBase || '/api';
};

const PopupManagement = () => {
    const [config, setConfig] = useState({
        quote: '',
        author: '',
        imageUrl: '',
        isActive: true,
        type: 'INSPIRATIONAL'
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [imageLoadError, setImageLoadError] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const API_URL = getApiBase();

    useEffect(() => {
        fetchConfig();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const fetchConfig = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const token = user?.token;
            if (!token) return;
            const res = await axios.get(`${API_URL}/popup`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setConfig(res.data);
                if (res.data.imageUrl) {
                    setPreviewImage(resolveImageUrl(res.data.imageUrl));
                    setImageLoadError(false);
                } else {
                    setPreviewImage(null);
                }
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input value so selecting the same file triggers change again
        e.target.value = '';

        // Valid types: PNG, JPG, JPEG, WEBP, GIF
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            setMessage({ type: 'error', text: 'Please upload a PNG, JPG, WEBP, or GIF image.' });
            return;
        }

        // 10MB Limit
        if (file.size > 10 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Image size must be less than 10MB.' });
            return;
        }

        // Instant local preview
        const localPreview = URL.createObjectURL(file);
        setPreviewImage(localPreview);
        setImageLoadError(false);

        const formData = new FormData();
        formData.append('image', file);

        setIsUploading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const token = user?.token;
            const res = await axios.post(`${API_URL}/popup/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            const newImgUrl = res.data.imageUrl;
            setConfig(prev => ({ ...prev, imageUrl: newImgUrl }));
            setPreviewImage(resolveImageUrl(newImgUrl));
            setMessage({ type: 'success', text: 'Image uploaded! Click "Save Configuration" to apply.' });
        } catch (error) {
            console.error(error);
            const errText = error.response?.data?.message || 'Upload failed. Please try again.';
            setMessage({ type: 'error', text: errText });
        } finally {
            setIsUploading(false);
        }
    };

    const startCamera = async () => {
        setCameraError('');
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.warn(e));
            }
        } catch (err) {
            console.error('Camera error:', err);
            setCameraError('Unable to access camera. Please allow camera permissions in your browser.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            stopCamera();

            const file = new File([blob], `popup-camera-${Date.now()}.png`, { type: 'image/png' });
            const localUrl = URL.createObjectURL(blob);
            setPreviewImage(localUrl);
            setImageLoadError(false);

            const formData = new FormData();
            formData.append('image', file);

            setIsUploading(true);
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const token = user?.token;
                const res = await axios.post(`${API_URL}/popup/upload`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });
                const newImgUrl = res.data.imageUrl;
                setConfig(prev => ({ ...prev, imageUrl: newImgUrl }));
                setPreviewImage(resolveImageUrl(newImgUrl));
                setMessage({ type: 'success', text: 'Photo captured & uploaded! Click "Save Configuration" to apply.' });
            } catch (error) {
                console.error(error);
                const errText = error.response?.data?.message || 'Upload failed. Please try again.';
                setMessage({ type: 'error', text: errText });
            } finally {
                setIsUploading(false);
            }
        }, 'image/png');
    };

    const handleRemoveImage = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        setConfig(prev => ({ ...prev, imageUrl: '' }));
        setPreviewImage(null);
        setImageLoadError(false);
        setMessage({ type: 'success', text: 'Image removed. Click "Save Configuration" to apply.' });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const token = user?.token;
            await axios.post(`${API_URL}/popup`, config, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage({ type: 'success', text: 'Configuration saved successfully!' });
        } catch (error) {
            console.error(error);
            const errText = error.response?.data?.message || 'Failed to save configuration.';
            setMessage({ type: 'error', text: errText });
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
                                onChange={(e) => setConfig(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-600"></div>
                            <span className="ml-3 text-sm font-black uppercase tracking-widest text-slate-500">{config.isActive ? 'Active' : 'Disabled'}</span>
                        </label>
                    </div>

                    <div className="space-y-6">
                        <div className="group">
                            <div className="flex items-center justify-between mb-3 ml-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Author Image / GIF (PNG recommended)
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="text-[10px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors px-2.5 py-1 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20 border border-indigo-500/20"
                                    >
                                        <Camera className="w-3.5 h-3.5" />
                                        Take Photo
                                    </button>
                                    {config.imageUrl && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-400 flex items-center gap-1.5 transition-colors px-2.5 py-1 bg-red-500/10 rounded-lg hover:bg-red-500/20"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            <label className="relative flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-white/10 rounded-3xl bg-black/20 hover:border-red-600/50 hover:bg-red-600/5 transition-all cursor-pointer group/upload overflow-hidden">
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                                        <span className="text-xs font-bold text-slate-400">Uploading image...</span>
                                    </div>
                                ) : previewImage && !imageLoadError ? (
                                    <div className="relative w-full h-full flex items-center justify-center p-4">
                                        <img
                                            src={previewImage}
                                            className="h-full max-h-48 object-contain rounded-xl"
                                            alt="Preview"
                                            onError={() => {
                                                console.warn('Failed to load image preview');
                                                setImageLoadError(true);
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm opacity-0 group-hover/upload:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <div className="p-3 bg-red-600/20 rounded-full border border-red-500/40 text-red-400">
                                                <RefreshCw className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-wider text-white">Click to Replace Image</span>
                                            <span className="text-[10px] text-slate-400 font-medium">Or use "Take Photo" above</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center p-6 text-center">
                                        {imageLoadError ? (
                                            <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/30 text-amber-400 mb-3">
                                                <AlertCircle className="w-6 h-6" />
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-white/5 rounded-full border border-white/10 text-slate-400 group-hover/upload:text-red-500 group-hover/upload:border-red-500/30 transition-all mb-3">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                        )}
                                        <span className="text-xs font-black text-slate-400 group-hover/upload:text-white block transition-colors">
                                            {imageLoadError ? 'Image failed to load — Click to select replacement' : 'Click to Upload Image / GIF'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-600 block mt-1">PNG, JPG, WEBP, GIF (Max 10MB)</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Popup Type</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setConfig(prev => ({ ...prev, type: 'INSPIRATIONAL' }))}
                                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${config.type === 'INSPIRATIONAL' ? 'border-red-600 bg-red-600/10 text-white' : 'border-white/10 bg-black/20 text-slate-500 hover:border-white/20'}`}
                                >
                                    <Quote className="w-6 h-6" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Inspirational</span>
                                </button>
                                <button
                                    onClick={() => setConfig(prev => ({ ...prev, type: 'BIRTHDAY' }))}
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
                                onChange={(e) => setConfig(prev => ({ ...prev, quote: e.target.value }))}
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
                                    onChange={(e) => setConfig(prev => ({ ...prev, author: e.target.value }))}
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
                                    {/* Glass Quote Box */}
                                    <div className={`backdrop-blur-2xl border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex items-end gap-4 ${config.type === 'BIRTHDAY' ? 'bg-purple-900/40 border-purple-500/30' : 'bg-white/10 border-white/20'}`}>

                                        {/* Left Side: Content */}
                                        <div className="flex-1 relative z-10">
                                            {config.type === 'BIRTHDAY' ? (
                                                <div className="absolute -top-6 -right-2 w-24 h-24 text-purple-500/10 -rotate-12 text-6xl flex justify-center items-center select-none pointer-events-none">
                                                    🎉
                                                </div>
                                            ) : (
                                                <Quote className="absolute -top-6 -right-2 w-24 h-24 text-white/5 -rotate-12" />
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

                                        {/* Right Side: Image */}
                                        {config.imageUrl && previewImage && !imageLoadError && (
                                            <motion.img
                                                src={previewImage}
                                                className="h-32 w-auto object-contain z-20 relative -mb-8 -mr-4 mask-image-gradient"
                                                initial={{ y: 20 }}
                                                animate={{ y: 0 }}
                                                transition={{ repeat: Infinity, duration: 3, repeatType: "reverse", ease: "easeInOut" }}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        )}
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

            {/* Camera Capture Modal */}
            <AnimatePresence>
                {isCameraOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <div className="bg-[#151719] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-indigo-400" />
                                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Capture Photo with Camera</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={stopCamera}
                                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {cameraError ? (
                                <div className="py-12 text-center space-y-4">
                                    <div className="p-4 bg-red-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-red-400 border border-red-500/20">
                                        <AlertCircle className="w-8 h-8" />
                                    </div>
                                    <p className="text-xs text-red-400 font-bold px-4">{cameraError}</p>
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="text-xs bg-red-600 hover:bg-red-700 px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-white"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/10">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            onLoadedMetadata={(e) => e.target.play()}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={stopCamera}
                                            className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={capturePhoto}
                                            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Capture & Use Photo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PopupManagement;
