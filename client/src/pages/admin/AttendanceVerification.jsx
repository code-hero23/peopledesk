import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
    Search, Calendar, X, ExternalLink, Camera, CheckCircle2, XCircle, 
    UserCheck, Image as ImageIcon, Sparkles, RefreshCw, Download, ZoomIn, 
    ShieldCheck, Filter, Clock, Users, ArrowUpRight, MapPin, Building2
} from 'lucide-react';
import { formatTime } from '../../utils/dateUtils';

const isAeAttendanceUser = (userItem) => {
    if (!userItem) return false;
    const designation = (userItem.designation || '').trim().toUpperCase();
    const role = (userItem.role || '').trim().toUpperCase();
    return designation === 'AE' || designation === 'AE MANAGER' || role === 'AE_MANAGER';
};

const AttendanceVerification = () => {
    const { user } = useSelector((state) => state.auth);
    const [report, setReport] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    // Search & Filter Tabs
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState('ALL'); // ALL, WITH_PHOTOS, PRESENT, ABSENT

    // Modal
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const { data } = await axios.get(`${baseUrl}/admin/attendance/daily?date=${date}&onlyAE=true`, config);
            const aeData = (Array.isArray(data) ? data : []).filter(item => isAeAttendanceUser(item.user));
            setReport(aeData);
        } catch (error) {
            console.error(error);
            alert('Failed to fetch attendance report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [date]);

    // Construct full URL for photos
    const getPhotoUrl = (path) => {
        if (!path) return null;
        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `${cleanBase}${cleanPath}`;
        } catch (err) {
            console.error('URL parse error:', err);
            return path;
        }
    };

    // Filter Logic
    const filteredReport = report.filter(item => {
        const matchesSearch = item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        const hasPhotos = item.sessions?.some(s => s.checkInPhoto || s.checkoutPhoto);

        if (filterTab === 'WITH_PHOTOS') return hasPhotos;
        if (filterTab === 'PRESENT') return item.status === 'PRESENT';
        if (filterTab === 'ABSENT') return item.status === 'ABSENT';

        return true;
    });

    // KPI Metrics Calculations
    const totalEmployees = report.length;
    const presentCount = report.filter(r => r.status === 'PRESENT').length;
    const absentCount = report.filter(r => r.status === 'ABSENT').length;
    
    let totalPhotosCount = 0;
    let employeesWithPhotosCount = 0;

    report.forEach(item => {
        let itemHasPhoto = false;
        if (item.sessions && item.sessions.length > 0) {
            item.sessions.forEach(s => {
                if (s.checkInPhoto) { totalPhotosCount++; itemHasPhoto = true; }
                if (s.checkoutPhoto) { totalPhotosCount++; itemHasPhoto = true; }
            });
        }
        if (itemHasPhoto) employeesWithPhotosCount++;
    });

    const photoCoverage = presentCount > 0 
        ? Math.round((employeesWithPhotosCount / presentCount) * 100) 
        : 0;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
            {/* Executive Header Banner */}
            <header className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] text-white shadow-2xl border border-slate-800/80 overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25 ring-4 ring-white/10">
                                <Camera className="text-white" size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">Attendance Verification</h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                                        <Sparkles size={10} className="animate-pulse" /> EVIDENTIAL AUDIT
                                    </span>
                                </div>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em] mt-0.5">
                                    Photo Evidence Audit & Check-in Verification
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Date Selector Pill & Refresh */}
                    <div className="flex items-center gap-3">
                        <div 
                            onClick={(e) => {
                                const dateInput = e.currentTarget.querySelector('input[type="date"]');
                                if (dateInput && 'showPicker' in HTMLInputElement.prototype) {
                                    try { dateInput.showPicker(); } catch (err) { dateInput.focus(); }
                                }
                            }}
                            className="flex items-center gap-3 bg-slate-900/90 hover:bg-slate-900 border border-slate-700/80 hover:border-blue-500/60 p-2 px-4 rounded-2xl shadow-lg shadow-black/20 backdrop-blur-md cursor-pointer transition-all duration-200 group"
                        >
                            <div className="p-2 bg-blue-500/15 border border-blue-400/30 rounded-xl text-blue-400 group-hover:scale-105 group-hover:bg-blue-500/25 transition-all">
                                <Calendar size={18} className="shrink-0" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">DATE</span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                    className="bg-transparent text-xs font-black text-white outline-none cursor-pointer dark-picker tracking-wide"
                                />
                            </div>
                        </div>

                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 active:scale-95 disabled:opacity-50"
                            title="Refresh Report"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
            </header>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Employees</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalEmployees}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <UserCheck size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Present Today</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{presentCount}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <ImageIcon size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Verified Photos</p>
                        <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{totalPhotosCount}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Photo Coverage</p>
                        <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{photoCoverage}%</h3>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative group w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Search employee name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 ring-blue-500/30 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {[
                        { id: 'ALL', label: `All Records (${report.length})` },
                        { id: 'WITH_PHOTOS', label: `With Photos (${employeesWithPhotosCount})` },
                        { id: 'PRESENT', label: `Present (${presentCount})` },
                        { id: 'ABSENT', label: `Absent (${absentCount})` }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilterTab(tab.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                filterTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Attendance & Session Evidence Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/60 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-slate-800/60">
                            <tr>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Session Evidence & Photos</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Designation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-16 text-slate-400 font-bold uppercase tracking-widest">
                                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500 opacity-60" />
                                        Loading Photo Verification Records...
                                    </td>
                                </tr>
                            ) : filteredReport.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-16 text-slate-400 font-bold text-xs italic">
                                        No attendance verification records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredReport.map((item, index) => (
                                    <tr key={`row-${item.user.id || index}`} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                        {/* Employee Info */}
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md shrink-0">
                                                    {(item.user.name || "E").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 dark:text-slate-100 text-xs">{item.user.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{item.user.email}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 align-top text-center">
                                            <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider shadow-md ${
                                                item.status === 'PRESENT'
                                                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                                                    : 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-500/30'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>

                                        {/* Sessions Evidence */}
                                        <td className="px-6 py-4 align-top">
                                            {item.sessions && item.sessions.length > 0 ? (
                                                <div className="space-y-3">
                                                    {item.sessions.map((session, sIdx) => {
                                                        const inUrl = getPhotoUrl(session.checkInPhoto);
                                                        const outUrl = getPhotoUrl(session.checkoutPhoto);

                                                        return (
                                                            <div key={sIdx} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                                                <div className="flex items-center justify-between text-[11px] font-black text-slate-600 dark:text-slate-400 mb-2.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Clock size={12} className="text-blue-500" />
                                                                        <span>Session {sIdx + 1}:</span>
                                                                        <span className="text-slate-800 dark:text-slate-200 font-mono">
                                                                            {formatTime(session.timeIn)} – {session.timeOut ? formatTime(session.timeOut) : 'Active'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-4">
                                                                    {/* Check In Photo */}
                                                                    {inUrl ? (
                                                                        <div
                                                                            className="cursor-pointer group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm"                                                                             onClick={() => setSelectedPhoto({ 
                                                                                url: inUrl, 
                                                                                title: `${item.user.name} - Check In Photo`,
                                                                                time: formatTime(session.timeIn),
                                                                                type: 'Check In',
                                                                                siteName: session.siteName
                                                                            })}
                                                                        >
                                                                            <img src={inUrl} alt="Check In" className="w-20 h-20 object-cover group-hover:scale-105 transition-transform duration-300" />
                                                                            <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/60 transition-all flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100">
                                                                                <ZoomIn size={18} />
                                                                                <span className="text-[9px] font-bold mt-1">View</span>
                                                                            </div>
                                                                            <div className="absolute bottom-0 inset-x-0 bg-slate-950/75 py-0.5 text-center">
                                                                                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">In Photo</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-[10px] text-slate-400 gap-1">
                                                                            <Camera size={16} />
                                                                            <span>No Photo</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Check Out Photo */}
                                                                    {outUrl ? (
                                                                        <div
                                                                            className="cursor-pointer group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm"
                                                                            onClick={() => setSelectedPhoto({ 
                                                                                url: outUrl, 
                                                                                title: `${item.user.name} - Check Out Photo`,
                                                                                time: session.timeOut ? formatTime(session.timeOut) : 'Active',
                                                                                type: 'Check Out',
                                                                                siteName: session.checkoutSiteName || session.siteName
                                                                            })}
                                                                        >
                                                                            <img src={outUrl} alt="Check Out" className="w-20 h-20 object-cover group-hover:scale-105 transition-transform duration-300" />
                                                                            <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/60 transition-all flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100">
                                                                                <ZoomIn size={18} />
                                                                                <span className="text-[9px] font-bold mt-1">View</span>
                                                                            </div>
                                                                            <div className="absolute bottom-0 inset-x-0 bg-slate-950/75 py-0.5 text-center">
                                                                                <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Out Photo</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        session.timeOut ? (
                                                                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-[10px] text-slate-400 gap-1">
                                                                                <Camera size={16} />
                                                                                <span>No Photo</span>
                                                                            </div>
                                                                        ) : null
                                                                    )}
                                                                </div>

                                                                {/* Site Name Info Badges */}
                                                                {(session.siteName || session.checkoutSiteName) && (
                                                                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-2 text-[10px]">
                                                                        {session.siteName && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/50">
                                                                                <MapPin size={11} className="text-emerald-500 shrink-0" />
                                                                                <span className="opacity-70">In Site:</span> {session.siteName}
                                                                            </span>
                                                                        )}
                                                                        {session.checkoutSiteName && (
                                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold border border-rose-200/60 dark:border-rose-800/50">
                                                                                <MapPin size={11} className="text-rose-500 shrink-0" />
                                                                                <span className="opacity-70">Out Site:</span> {session.checkoutSiteName}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-600 font-bold italic">No active sessions</span>
                                            )}
                                        </td>

                                        {/* Designation */}
                                        <td className="px-6 py-4 align-top font-bold text-slate-600 dark:text-slate-400 uppercase text-[11px]">
                                            {item.user.designation || "EMPLOYEE"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Photo Evidence Fullscreen Glass Modal */}
            {selectedPhoto && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div 
                        className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Controls Header */}
                        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-black text-white">{selectedPhoto.title}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        Timestamp: <span className="text-blue-400 font-mono">{selectedPhoto.time}</span>
                                    </p>
                                    {selectedPhoto.siteName && (
                                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                            <MapPin size={12} />
                                            <span>Site: {selectedPhoto.siteName}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a 
                                    href={selectedPhoto.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                                >
                                    <ExternalLink size={14} />
                                    <span>Original</span>
                                </a>
                                <button
                                    onClick={() => setSelectedPhoto(null)}
                                    className="p-2.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Image Frame */}
                        <div className="relative max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black border border-slate-800">
                            <img
                                src={selectedPhoto.url}
                                alt="Verification Evidence"
                                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceVerification;

