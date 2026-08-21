import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Plus,
    Copy,
    Check,
    Download,
    Search,
    RefreshCw,
    Users,
    Gamepad2,
    ExternalLink,
    Filter,
    Calendar,
    Sparkles,
    FileSpreadsheet,
    X,
    ChevronDown,
    Share2,
    Award
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const PRESET_GAMES_DEFAULT = [
    { name: 'Chess', playerCount: '2', emoji: '♟️' },
    { name: 'Carrom', playerCount: '4', emoji: '🎯' },
    { name: 'Wooden Block', playerCount: '2', emoji: '🪵' },
    { name: 'Interior Based Puzzle', playerCount: '4', emoji: '🧩' },
    { name: 'Ludo', playerCount: '6', emoji: '🎲' },
    { name: 'UNO', playerCount: '4 to 6', emoji: '🎴' }
];

const PublicEventHub = () => {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [eventDetail, setEventDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Search, Filter & Sort
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'NAME_ASC' | 'NAME_DESC'

    // Create / Generate Link Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const [newEventData, setNewEventData] = useState({
        title: 'Games Registration',
        description: 'Select your favorite games to participate in the upcoming tournament!',
        games: PRESET_GAMES_DEFAULT
    });

    const [customGameInput, setCustomGameInput] = useState('');
    const [customPlayerCount, setCustomPlayerCount] = useState('2');

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        if (selectedEventId) {
            fetchEventDetails(selectedEventId);
        }
    }, [selectedEventId]);

    const fetchEvents = async () => {
        try {
            const res = await axios.get(`${API_URL}/public-events`);
            const list = res.data || [];
            setEvents(list);
            if (list.length > 0 && !selectedEventId) {
                setSelectedEventId(list[0].id);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEventDetails = async (eventId, silent = false) => {
        if (!silent) setIsRefreshing(true);
        try {
            const res = await axios.get(`${API_URL}/public-events/${eventId}`);
            setEventDetail(res.data);
        } catch (error) {
            console.error('Error fetching event details:', error);
            toast.error('Failed to load event dashboard');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        if (!newEventData.title.trim()) {
            toast.warning('Please enter an event title');
            return;
        }

        try {
            const res = await axios.post(`${API_URL}/public-events`, newEventData);
            toast.success('Event link generated successfully! 🎉');
            setIsCreateModalOpen(false);
            const created = res.data.event;
            await fetchEvents();
            setSelectedEventId(created.id);
        } catch (error) {
            console.error('Error creating event:', error);
            toast.error('Failed to generate event');
        }
    };

    const addCustomGame = () => {
        if (!customGameInput.trim()) return;
        const exists = newEventData.games.some(g => g.name.toLowerCase() === customGameInput.trim().toLowerCase());
        if (exists) {
            toast.info('Game already in list');
            return;
        }
        setNewEventData({
            ...newEventData,
            games: [
                ...newEventData.games,
                {
                    name: customGameInput.trim(),
                    playerCount: customPlayerCount || '2',
                    emoji: '🎮'
                }
            ]
        });
        setCustomGameInput('');
    };

    const removeGame = (index) => {
        setNewEventData({
            ...newEventData,
            games: newEventData.games.filter((_, i) => i !== index)
        });
    };

    const publicRegistrationUrl = useMemo(() => {
        if (!eventDetail?.event?.id) return '';
        const origin = window.location.origin;
        return `${origin}/register/${eventDetail.event.slug || eventDetail.event.id}`;
    }, [eventDetail]);

    const handleCopyLink = () => {
        if (!publicRegistrationUrl) return;
        navigator.clipboard.writeText(publicRegistrationUrl);
        setCopiedLink(true);
        toast.success('Registration link copied to clipboard! 📋');
        setTimeout(() => setCopiedLink(false), 2500);
    };

    const handleExportExcel = async () => {
        if (!eventDetail?.event?.id) return;
        try {
            toast.info('Generating Excel file...');
            const res = await axios.get(`${API_URL}/public-events/${eventDetail.event.id}/export`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const safeTitle = (eventDetail.event.title || 'Games').replace(/[^a-zA-Z0-9_-]/g, '_');
            link.setAttribute('download', `Games_Registration_${safeTitle}_${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Excel spreadsheet downloaded successfully! 📊');
        } catch (error) {
            console.error('Error exporting Excel:', error);
            toast.error('Failed to download Excel file');
        }
    };

    // Filter & Sort Participants
    const filteredResponses = useMemo(() => {
        if (!eventDetail?.responses) return [];

        return eventDetail.responses
            .filter((resp) => {
                const query = searchTerm.toLowerCase().trim();
                const nameMatches = (resp.name || '').toLowerCase().includes(query);
                const games = Array.isArray(resp.selectedGames) ? resp.selectedGames : [];
                const gameMatches = games.some(g => g.toLowerCase().includes(query));

                const matchesQuery = !query || nameMatches || gameMatches;

                const matchesFilter = selectedGameFilter === 'ALL' || games.includes(selectedGameFilter);

                return matchesQuery && matchesFilter;
            })
            .sort((a, b) => {
                if (sortBy === 'NAME_ASC') {
                    return (a.name || '').localeCompare(b.name || '');
                }
                if (sortBy === 'NAME_DESC') {
                    return (b.name || '').localeCompare(a.name || '');
                }
                // Default: NEWEST
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
    }, [eventDetail, searchTerm, selectedGameFilter, sortBy]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-900">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 text-sm font-semibold">Loading Event Hub...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-red-600 selection:text-white pb-20">

            {/* Top Navigation Bar */}
            <header className="border-b border-slate-200/80 bg-white sticky top-0 z-40 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img 
                            src="/cookscape_logo.jpeg" 
                            alt="Cookscape Logo" 
                            onError={(e) => {
                                if (e.target.src.endsWith('.jpeg')) {
                                    e.target.src = '/cookscape_logo.png';
                                }
                            }}
                            className="h-10 sm:h-11 object-contain" 
                        />
                        <div className="h-6 w-px bg-slate-200" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                                    Registration Hub
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                    Live
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">Live participant tracking & Excel export</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        {events.length > 1 && (
                            <select
                                value={selectedEventId || ''}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-2xl px-3.5 py-2.5 outline-none focus:border-red-600"
                            >
                                {events.map((ev) => (
                                    <option key={ev.id} value={ev.id}>
                                        {ev.title} ({ev.totalResponses} registered)
                                    </option>
                                ))}
                            </select>
                        )}

                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* 1. Shareable Link Card */}
                {eventDetail?.event && (
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white relative overflow-hidden">
                        {/* Accent Glow */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

                        <div className="space-y-1.5 flex-1 min-w-0">
                         
                            <h2 className="text-2xl font-black text-white truncate">
                                {eventDetail.event.title}
                            </h2>
                            <p className="text-xs font-mono text-red-200 truncate bg-slate-950/80 border border-slate-700 px-3.5 py-2 rounded-xl max-w-xl">
                                {publicRegistrationUrl}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={handleCopyLink}
                                className={`
                                    px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-md
                                    ${
                                        copiedLink
                                            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                                            : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                                    }
                                `}
                            >
                                {copiedLink ? <Check size={16} strokeWidth={3} /> : <Copy size={16} />}
                                <span>{copiedLink ? 'Link Copied!' : 'Copy Registration Link'}</span>
                            </button>

                            <a
                                href={publicRegistrationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 hover:border-slate-600 shadow-sm"
                            >
                                <ExternalLink size={15} />
                                <span>Open Form</span>
                            </a>
                        </div>
                    </div>
                )}

                {/* 2. Live Game Counters Grid */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Gamepad2 size={16} className="text-red-600" />
                            <span>Live Player Counters by Game</span>
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">
                            Auto-aggregates all multi-game choices
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
                        {/* Total Card */}
                        <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-3xl p-4 flex flex-col justify-between shadow-lg shadow-red-600/20">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-100 block mb-1">
                                    Total Registered
                                </span>
                                <div className="text-3xl font-black text-white">
                                    {eventDetail?.totalResponses || 0}
                                </div>
                            </div>
                            <span className="text-[11px] font-bold text-red-100/90 mt-2 flex items-center gap-1">
                                <Users size={12} />
                                <span>Participants</span>
                            </span>
                        </div>

                        {/* Individual Game Cards with Player Numbers */}
                        {(eventDetail?.gameStats || []).map((game, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedGameFilter(game.name === selectedGameFilter ? 'ALL' : game.name)}
                                className={`
                                    p-4 rounded-3xl border transition-all cursor-pointer select-none flex flex-col justify-between group
                                    ${
                                        selectedGameFilter === game.name
                                            ? 'bg-red-50 border-red-500 shadow-md shadow-red-500/10 ring-2 ring-red-500/20'
                                            : 'bg-white border-slate-200/80 hover:border-red-200 hover:shadow-md hover:bg-slate-50/50'
                                    }
                                `}
                            >
                                <div className="flex items-start justify-between">
                                    <span className="text-2xl group-hover:scale-110 transition-transform">
                                        {game.emoji}
                                    </span>
                                    <span className="text-lg font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-xl border border-slate-200">
                                        {game.count}
                                    </span>
                                </div>

                                <div className="mt-3">
                                    <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-red-700">
                                        {game.name}
                                    </h4>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-md mt-1">
                                        {game.playerCount} Players
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Participant Table Section */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">

                    {/* Table Controls */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        {/* Search Box */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search by player name or game..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/10 transition-all font-medium"
                            />
                        </div>

                        {/* Game Filter & Sort Chips */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Game Filter Dropdown */}
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs">
                                <Filter size={13} className="text-red-600" />
                                <select
                                    value={selectedGameFilter}
                                    onChange={(e) => setSelectedGameFilter(e.target.value)}
                                    className="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer"
                                >
                                    <option value="ALL">All Games ({eventDetail?.totalResponses || 0})</option>
                                    {(eventDetail?.gameStats || []).map((g, i) => (
                                        <option key={i} value={g.name}>
                                            {g.emoji} {g.name} ({g.count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort Dropdown */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-2xl px-3 py-2 outline-none cursor-pointer"
                            >
                                <option value="NEWEST">Latest First</option>
                                <option value="NAME_ASC">Name (A &rarr; Z)</option>
                                <option value="NAME_DESC">Name (Z &rarr; A)</option>
                            </select>

                            {/* Refresh Button */}
                            <button
                                onClick={() => selectedEventId && fetchEventDetails(selectedEventId)}
                                className={`p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 hover:text-slate-900 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                                title="Refresh data"
                            >
                                <RefreshCw size={14} />
                            </button>

                            {/* Excel Export Button */}
                            <button
                                onClick={handleExportExcel}
                                disabled={!eventDetail?.responses || eventDetail.responses.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                            >
                                <FileSpreadsheet size={15} />
                                <span>Export Excel (.xlsx)</span>
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-black uppercase tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 w-12 text-slate-400">#</th>
                                        <th className="p-4 text-slate-700">Player Name</th>
                                        <th className="p-4 text-slate-700">Interested Game(s)</th>
                                        <th className="p-4 text-right text-slate-700">Registration Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredResponses.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-12 text-center text-slate-400">
                                                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                                <p className="font-bold text-sm text-slate-700">No registrations found</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Share the link above to start collecting player names!
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredResponses.map((resp, idx) => {
                                            const games = Array.isArray(resp.selectedGames) ? resp.selectedGames : [];

                                            return (
                                                <tr key={resp.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 text-slate-400 font-mono">{idx + 1}</td>
                                                    <td className="p-4 font-bold text-slate-900 text-sm">
                                                        {resp.name}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {games.map((g, gIdx) => (
                                                                <span
                                                                    key={gIdx}
                                                                    className="bg-red-50 border border-red-200 text-red-700 font-semibold px-2.5 py-1 rounded-xl text-[11px]"
                                                                >
                                                                    {g}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right text-slate-500 font-mono text-[11px]">
                                                        {resp.createdAt ? new Date(resp.createdAt).toLocaleString() : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Table Footer Count */}
                    <div className="flex justify-between items-center text-xs text-slate-500 pt-2 font-medium">
                        <span>
                            Showing <strong>{filteredResponses.length}</strong> of <strong>{eventDetail?.responses?.length || 0}</strong> registrations
                        </span>
                        {selectedGameFilter !== 'ALL' && (
                            <button
                                onClick={() => setSelectedGameFilter('ALL')}
                                className="text-red-600 hover:underline font-bold"
                            >
                                Clear Game Filter
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {/* Generate Link / Create Event Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl relative my-8"
                        >
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="mb-6 space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                                    Link Generator
                                </span>
                                <h3 className="text-2xl font-black text-slate-900">
                                    Create Game Registration Link
                                </h3>
                                <p className="text-slate-500 text-xs">
                                    Set up your event title and choose the games for employees to register.
                                </p>
                            </div>

                            <form onSubmit={handleCreateEvent} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                        Event Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Annual Sports Meet 2026 / Office Game Day"
                                        value={newEventData.title}
                                        onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-medium focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/10 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                                        Description / Instructions (Optional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Select the games you want to play. Multiple selections allowed."
                                        value={newEventData.description}
                                        onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm font-medium focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/10 outline-none transition-all"
                                    />
                                </div>

                                {/* Games Configuration */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                                        Configured Games ({newEventData.games.length})
                                    </label>

                                    {/* Chips */}
                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                                        {newEventData.games.map((g, i) => (
                                            <span
                                                key={i}
                                                className="bg-red-50 border border-red-200 text-red-800 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-xs"
                                            >
                                                <span>{g.emoji}</span>
                                                <span>{g.name}</span>
                                                <span className="text-[10px] text-red-700 bg-red-200/60 px-1.5 py-0.5 rounded font-black">
                                                    {g.playerCount}P
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeGame(i)}
                                                    className="text-red-400 hover:text-red-700 transition-colors ml-1"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>

                                    {/* Add Custom Game */}
                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        <input
                                            type="text"
                                            placeholder="Custom game name..."
                                            value={customGameInput}
                                            onChange={(e) => setCustomGameInput(e.target.value)}
                                            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-red-600"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Players (e.g. 2, 4)"
                                            value={customPlayerCount}
                                            onChange={(e) => setCustomPlayerCount(e.target.value)}
                                            className="w-24 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-red-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={addCustomGame}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-red-600/25 active:scale-[0.98] mt-4"
                                >
                                    Generate & View Dashboard
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PublicEventHub;
