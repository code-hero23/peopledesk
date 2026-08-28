import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
    MapPin,
    Calendar,
    Clock,
    Search,
    HardHat,
    CheckCircle2,
    RefreshCw,
    Download,
    ExternalLink,
    Building,
    FileText,
    ChevronLeft,
    ChevronRight,
    Play,
    CheckCircle
} from 'lucide-react';

const STATUS_CONFIG = {
    SCHEDULED: {
        label: 'Scheduled',
        bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        action: 'Start Visit'
    },
    IN_PROGRESS: {
        label: 'In Progress',
        bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        action: 'Mark Completed'
    },
    COMPLETED: {
        label: 'Completed',
        bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        action: null
    },
    CANCELLED: {
        label: 'Cancelled',
        bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        action: null
    }
};

const MySiteAssignments = () => {
    const { user } = useSelector((state) => state.auth);
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
    const [selectedDateFilter, setSelectedDateFilter] = useState('');

    const [summary, setSummary] = useState({
        total: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        today: 0
    });

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Bearer ${user?.token}` }
    }), [user?.token]);

    const fetchMyAssignments = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                sortBy: 'scheduledDate',
                sortOrder: 'desc'
            });

            if (searchTerm.trim()) params.append('search', searchTerm.trim());
            if (selectedStatusFilter !== 'ALL') params.append('status', selectedStatusFilter);
            if (selectedDateFilter) params.append('date', selectedDateFilter);

            const res = await axios.get(`${baseUrl}/site-assignments?${params.toString()}`, authHeaders);
            setAssignments(res.data.data || []);
            setTotalPages(res.data.pagination?.totalPages || 1);
            setTotalRecords(res.data.pagination?.total || 0);
            if (res.data.summary) {
                setSummary(res.data.summary);
            }
        } catch (error) {
            console.error('Failed to load my assignments:', error);
            toast.error(error.response?.data?.message || 'Failed to load site assignments');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.token) {
            fetchMyAssignments();
        }
    }, [page, limit, selectedStatusFilter, selectedDateFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchMyAssignments();
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await axios.put(`${baseUrl}/site-assignments/${id}`, { status: newStatus }, authHeaders);
            toast.success(`Site marked as ${newStatus.replace('_', ' ')}`);
            fetchMyAssignments();
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams({ format: 'xlsx' });
        if (selectedStatusFilter !== 'ALL') params.append('status', selectedStatusFilter);
        window.open(`${baseUrl}/site-assignments/export?${params.toString()}&token=${user?.token}`, '_blank');
        toast.info('Downloading your site schedule...');
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto min-h-screen text-slate-100">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-950 p-8 md:p-10 border border-white/10 shadow-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-3">
                            <HardHat size={13} className="text-blue-400" />
                            AE Site Schedule
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                            My Assigned Sites
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium">
                            Review your allocated site inspection, measurement, and installation schedules with live location details.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-emerald-400 transition-all shadow-md active:scale-95"
                        >
                            <Download size={16} /> Export Schedule
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0e131f] border border-white/5 p-5 rounded-3xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Assigned</span>
                    <p className="text-2xl font-black text-white mt-1">{summary.total || 0}</p>
                </div>
                <div className="bg-[#0e131f] border border-white/5 p-5 rounded-3xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Today's Visits</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{summary.today || 0}</p>
                </div>
                <div className="bg-[#0e131f] border border-white/5 p-5 rounded-3xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">In Progress</span>
                    <p className="text-2xl font-black text-amber-400 mt-1">{summary.inProgress || 0}</p>
                </div>
                <div className="bg-[#0e131f] border border-white/5 p-5 rounded-3xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Completed</span>
                    <p className="text-2xl font-black text-purple-400 mt-1">{summary.completed || 0}</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[#0e131f] border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search sites or clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select
                        value={selectedStatusFilter}
                        onChange={(e) => { setSelectedStatusFilter(e.target.value); setPage(1); }}
                        className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>

                    <input
                        type="date"
                        value={selectedDateFilter}
                        onChange={(e) => { setSelectedDateFilter(e.target.value); setPage(1); }}
                        className="bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                    />

                    {(searchTerm || selectedStatusFilter !== 'ALL' || selectedDateFilter) && (
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedStatusFilter('ALL'); setSelectedDateFilter(''); setPage(1); }}
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* List / Cards */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="p-16 text-center text-slate-500 font-bold bg-[#0e131f] rounded-3xl border border-white/5">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                        Loading assigned site schedules...
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="p-16 text-center text-slate-500 bg-[#0e131f] rounded-3xl border border-white/5">
                        <MapPin size={32} className="mx-auto text-slate-600 mb-3" />
                        <h3 className="text-lg font-bold text-slate-300">No Assigned Sites</h3>
                        <p className="text-xs text-slate-500 mt-1">You do not have any site assignments matching your filter.</p>
                    </div>
                ) : (
                    assignments.map((item) => {
                        const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.SCHEDULED;
                        const isToday = item.scheduledDate && new Date(item.scheduledDate).toDateString() === new Date().toDateString();

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#0e131f] border border-white/5 hover:border-blue-500/30 rounded-3xl p-6 shadow-xl transition-all"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-black text-white">{item.siteName}</h3>
                                            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${statusCfg.bg}`}>
                                                {statusCfg.label}
                                            </span>
                                            {isToday && (
                                                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                                                    Today's Visit
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-1">
                                            <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                                                <Calendar size={14} className="text-blue-400" />
                                                {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                                                <Clock size={14} className="text-slate-400" />
                                                {item.scheduledTime || '--:--'}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                                                <HardHat size={14} className="text-indigo-400" />
                                                {item.workType || 'Site Inspection'}
                                            </span>
                                            {item.clientName && (
                                                <span className="flex items-center gap-1 text-slate-400">
                                                    Client: <b className="text-white">{item.clientName}</b>
                                                </span>
                                            )}
                                        </div>

                                        {item.location && (
                                            <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                                                <MapPin size={14} className="text-rose-400 flex-shrink-0" />
                                                <span>{item.location}</span>
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[11px] font-bold ml-2 underline underline-offset-2"
                                                >
                                                    View on Maps <ExternalLink size={11} />
                                                </a>
                                            </div>
                                        )}

                                        {item.remarks && (
                                            <div className="bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs text-slate-300 italic mt-2">
                                                <b>Instructions:</b> "{item.remarks}"
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons for AE */}
                                    <div className="flex items-center gap-3">
                                        {item.status === 'SCHEDULED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(item.id, 'IN_PROGRESS')}
                                                className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                                            >
                                                <Play size={14} /> Start Site Visit
                                            </button>
                                        )}

                                        {item.status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={() => handleUpdateStatus(item.id, 'COMPLETED')}
                                                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                                            >
                                                <CheckCircle size={14} /> Mark Completed
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-5 bg-[#0e131f] border border-white/5 rounded-3xl flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                        Page <b className="text-white">{page}</b> of <b className="text-white">{totalPages}</b>
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            disabled={page <= 1}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={page >= totalPages}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MySiteAssignments;
