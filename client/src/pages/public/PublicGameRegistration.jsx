import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gamepad2,
    CheckCircle2,
    Trophy,
    Users,
    Sparkles,
    User,
    ArrowRight,
    RefreshCw,
    AlertCircle,
    Check
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const DEFAULT_GAME_EMOJIS = {
    'chess': '♟️',
    'carrom': '🎯',
    'wooden block': '🪵',
    'interior based puzzle': '🧩',
    'ludo': '🎲',
    'uno': '🎴',
    'cricket': '🏏',
    'badminton': '🏸',
    'table tennis': '🏓',
    'football': '⚽',
    'volleyball': '🏐'
};

const getGameEmoji = (gameName, defaultEmoji) => {
    if (defaultEmoji && defaultEmoji !== '🎮') return defaultEmoji;
    const lower = (gameName || '').toLowerCase().trim();
    for (const [key, emoji] of Object.entries(DEFAULT_GAME_EMOJIS)) {
        if (lower.includes(key)) return emoji;
    }
    return defaultEmoji || '🎮';
};

const PublicGameRegistration = () => {
    const { id } = useParams();

    const [eventData, setEventData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [playerName, setPlayerName] = useState('');
    const [selectedGames, setSelectedGames] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedData, setSubmittedData] = useState(null);

    useEffect(() => {
        fetchEventDetails();
    }, [id]);

    const fetchEventDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const targetId = id || 'default';
            const res = await axios.get(`${API_URL}/public-events/${targetId}`);
            setEventData(res.data.event);
            setIsLoading(false);
        } catch (err) {
            console.error('Error fetching event:', err);
            try {
                const listRes = await axios.get(`${API_URL}/public-events`);
                if (listRes.data && listRes.data.length > 0) {
                    setEventData(listRes.data[0]);
                } else {
                    setError('No active game event found. Please check your link.');
                }
            } catch {
                setError('Unable to load registration page. Please try again.');
            }
            setIsLoading(false);
        }
    };

    const toggleGame = (gameName) => {
        if (selectedGames.includes(gameName)) {
            setSelectedGames(selectedGames.filter((g) => g !== gameName));
        } else {
            setSelectedGames([...selectedGames, gameName]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!playerName.trim()) {
            toast.warning('Please enter your name');
            return;
        }

        if (selectedGames.length === 0) {
            toast.warning('Please select at least one game');
            return;
        }

        setIsSubmitting(true);
        try {
            const eventId = eventData?.id || id;
            const res = await axios.post(`${API_URL}/public-events/${eventId}/register`, {
                name: playerName.trim(),
                selectedGames
            });

            setSubmittedData({
                name: playerName.trim(),
                games: selectedGames,
                message: res.data.message
            });
            toast.success('Registration completed successfully! 🎉');
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to submit registration. Please try again.';
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setPlayerName('');
        setSelectedGames([]);
        setSubmittedData(null);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 text-sm font-semibold">Loading Game Registration...</p>
            </div>
        );
    }

    if (error || !eventData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 text-center">
                <div className="p-6 bg-white border border-red-100 rounded-3xl mb-4 max-w-md shadow-lg shadow-red-500/5">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-600" />
                    <h3 className="font-black text-xl text-slate-900">Event Not Found</h3>
                    <p className="text-sm mt-1 text-slate-500">{error || 'Invalid or expired event link.'}</p>
                </div>
                <button
                    onClick={fetchEventDetails}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-95"
                >
                    <RefreshCw size={16} />
                    <span>Try Again</span>
                </button>
            </div>
        );
    }

    const gamesList = Array.isArray(eventData.games) ? eventData.games : [];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans selection:bg-red-600 selection:text-white">
            <div className="max-w-2xl mx-auto w-full space-y-6 my-auto py-4">

                {/* Header Banner */}
                <div className="text-center space-y-2 relative">
                    
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                        {eventData.title}
                    </h1>
                    {eventData.description && (
                        <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                            {eventData.description}
                        </p>
                    )}
                </div>

                {/* Main Content Box */}
                <AnimatePresence mode="wait">
                    {!submittedData ? (
                        <motion.form
                            key="registration-form"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            onSubmit={handleSubmit}
                            className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden"
                        >
                            {/* Decorative Top Accent Bar */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-700" />

                            {/* 1. Name Input */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                                    Your Full Name <span className="text-red-600">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        placeholder="Enter your full name..."
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm font-semibold focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/10 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* 2. Game Selection Cards */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                                        Select Game(s) <span className="text-red-600">*</span>
                                    </label>
                                    <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                                        Multiple Allowed
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {gamesList.map((game, idx) => {
                                        const gameName = typeof game === 'string' ? game : game.name;
                                        const playerCount = typeof game === 'object' ? (game.playerCount || '-') : '-';
                                        const emoji = getGameEmoji(gameName, typeof game === 'object' ? game.emoji : null);
                                        const isSelected = selectedGames.includes(gameName);

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => toggleGame(gameName)}
                                                className={`
                                                    p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 group
                                                    ${
                                                        isSelected
                                                            ? 'bg-gradient-to-r from-red-50 to-rose-50/50 border-red-500 shadow-md shadow-red-500/10 ring-2 ring-red-500/20'
                                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                                                        {emoji}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <span className={`block text-sm font-bold truncate ${isSelected ? 'text-red-950' : 'text-slate-900'}`}>
                                                            {gameName}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                            <Users size={12} className="text-red-600" />
                                                            <span>{playerCount} Players</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    className={`
                                                        w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
                                                        ${
                                                            isSelected
                                                                ? 'bg-red-600 text-white scale-100 shadow-md shadow-red-600/30'
                                                                : 'border border-slate-300 bg-slate-100 text-transparent scale-95'
                                                        }
                                                    `}
                                                >
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selected Count Indicator */}
                            {selectedGames.length > 0 && (
                                <div className="p-3.5 bg-red-50 border border-red-200/80 rounded-2xl text-xs flex items-center justify-between text-red-900">
                                    <span>
                                        Selected <strong>{selectedGames.length}</strong> game{selectedGames.length > 1 ? 's' : ''}:
                                    </span>
                                    <span className="font-bold text-red-700 truncate max-w-xs text-right">
                                        {selectedGames.join(', ')}
                                    </span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !playerName.trim() || selectedGames.length === 0}
                                className={`
                                    w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98]
                                    ${
                                        !playerName.trim() || selectedGames.length === 0
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                                            : 'bg-gradient-to-r from-red-600 via-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-red-600/30'
                                    }
                                `}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Recording Entry...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Confirm Registration</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.div
                            key="confirmation-screen"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border border-emerald-200 rounded-3xl p-8 shadow-xl text-center space-y-6"
                        >
                            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/10">
                                <CheckCircle2 size={36} />
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                    Registration Confirmed
                                </span>
                                <h3 className="text-2xl font-black text-slate-900">
                                    Thank you, {submittedData.name}! 🎉
                                </h3>
                                <p className="text-slate-500 text-xs">
                                    You have been successfully registered for:
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                                {submittedData.games.map((g, i) => (
                                    <span
                                        key={i}
                                        className="bg-red-50 border border-red-200 text-red-700 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                                    >
                                        <span>{getGameEmoji(g)}</span>
                                        <span>{g}</span>
                                    </span>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all"
                                >
                                    Register Another Person
                                </button>
                                <Link
                                    to="/events-hub"
                                    className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-slate-900/20"
                                >
                                    <Trophy size={14} />
                                    <span>View Live Event Hub</span>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

    
            </div>
        </div>
    );
};

export default PublicGameRegistration;
