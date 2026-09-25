import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Activity,
    Coffee,
    Video,
    Clock,
    Search,
    Download,
    RefreshCw,
    ChevronDown,
    Grid,
    List,
    AlertTriangle,
    Layers,
    Building2,
    Calendar,
    Utensils,
    Loader2,
    X,
    TrendingUp,
    Shield,
    Sparkles,
    CheckCircle2,
    Briefcase,
    ChevronRight,
    ArrowUpRight,
    SlidersHorizontal,
    Radio
} from 'lucide-react';
import axios from 'axios';
import { formatTime } from '../../utils/dateUtils';

// Helper to determine Level from Designation / Role
const getLevelFromDesignation = (designation, role) => {
    const d = (designation || role || '').toUpperCase();
    if (['ADMIN', 'BH', 'BUSINESS_HEAD', 'COO', 'DIRECTOR', 'MANAGER'].some(k => d.includes(k))) {
        return 'Level 1'; // Management
    }
    if (['AE', 'OPERATIONS', 'ACCOUNTS', 'CRE', 'LEAD'].some(k => d.includes(k))) {
        return 'Level 2'; // Operations
    }
    if (['LA', 'FA', 'SUPPORT', 'HR', 'COORDINATOR'].some(k => d.includes(k))) {
        return 'Level 3'; // Support
    }
    return 'Level 4'; // Interns & Field
};

const getLevelMeta = (level) => {
    switch (level) {
        case 'Level 1':
            return { label: 'Management', badgeColor: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
        case 'Level 2':
            return { label: 'Operations', badgeColor: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
        case 'Level 3':
            return { label: 'Support', badgeColor: 'bg-pink-100 text-pink-700 border-pink-200', dot: 'bg-pink-500' };
        default:
            return { label: 'Interns & Field', badgeColor: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    }
};

// Helper to determine Showroom
const getShowroomFromUser = (user, attendanceRecord) => {
    const text = `${user?.siteName || ''} ${attendanceRecord?.siteName || ''} ${user?.designation || ''} ${user?.name || ''}`.toUpperCase();
    if (text.includes('PORUR')) return 'Porur';
    if (text.includes('OMR')) return 'OMR';
    if (text.includes('MTRS')) return 'MTRS';
    const showrooms = ['MTRS', 'Porur', 'OMR'];
    return showrooms[(user?.id || 0) % 3];
};

// Professional Gradient Avatars with Initials
const AVATAR_GRADIENTS = [
    'from-blue-600 via-indigo-600 to-violet-700',
    'from-emerald-600 via-teal-600 to-cyan-700',
    'from-amber-500 via-orange-600 to-rose-600',
    'from-purple-600 via-fuchsia-600 to-pink-600',
    'from-cyan-600 via-sky-600 to-blue-700',
    'from-rose-600 via-pink-600 to-purple-600',
    'from-violet-600 via-purple-700 to-indigo-800',
    'from-teal-600 via-emerald-600 to-green-700'
];

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/);
    if (!parts.length || !parts[0]) return 'EM';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getGradient = (name = '') => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

// Isolated Live Clock (prevents dashboard from re-rendering every second)
const LiveClock = memo(() => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex items-center gap-2.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl px-3.5 py-2 text-xs font-medium text-slate-300 backdrop-blur-md shadow-inner">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-400 hidden sm:inline">{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="font-bold text-white tracking-wider tabular-nums font-mono">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
            </span>
        </div>
    );
});

LiveClock.displayName = 'LiveClock';

// Status Badge Component
const StatusPill = memo(({ status, isPulse = false }) => {
    switch (status) {
        case 'Working':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Working
                </span>
            );
        case 'Tea Break':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs">
                    <Coffee size={12} className="text-amber-600 shrink-0" />
                    Tea Break
                </span>
            );
        case 'Lunch Break':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200/80 shadow-xs">
                    <Utensils size={12} className="text-orange-600 shrink-0" />
                    Lunch Break
                </span>
            );
        case 'In Meeting':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
                    <Video size={12} className="text-indigo-600 shrink-0" />
                    In Meeting
                </span>
            );
        case 'Checked Out':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/80">
                    Checked Out
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Absent
                </span>
            );
    }
});

StatusPill.displayName = 'StatusPill';

const OverviewDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();

    useEffect(() => {
        if (user && !['ADMIN', 'SUPER_ADMIN', 'HR', 'BUSINESS_HEAD'].includes(user.role)) {
            navigate('/admin-dashboard', { replace: true });
        }
    }, [user, navigate]);

    const [selectedLevel, setSelectedLevel] = useState('All Levels');
    const [selectedShowroom, setSelectedShowroom] = useState('All Showrooms');
    const [statusTab, setStatusTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [sortBy, setSortBy] = useState('Status');
    const [breakTab, setBreakTab] = useState('Tea Break');

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [visibleCount, setVisibleCount] = useState(16);

    const isFetchingRef = useRef(false);

    // Fetch Real Data with Cache and In-Flight Deduplication
    const fetchRealData = async (isManual = false) => {
        if (isFetchingRef.current) return;
        if (!user?.token) return;

        isFetchingRef.current = true;
        if (isManual) setIsRefreshing(true);

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const [employeesRes, attendanceRes, activeStatusesRes] = await Promise.allSettled([
                axios.get(`${baseUrl}/admin/employees`, config),
                axios.get(`${baseUrl}/admin/attendance/daily?date=${todayStr}`, config),
                axios.get(`${baseUrl}/admin/active-statuses`, config)
            ]);

            const allUsers = employeesRes.status === 'fulfilled' && Array.isArray(employeesRes.value.data)
                ? employeesRes.value.data
                : [];

            const attendanceRecords = attendanceRes.status === 'fulfilled' && Array.isArray(attendanceRes.value.data)
                ? attendanceRes.value.data
                : [];

            const activeBreaks = activeStatusesRes.status === 'fulfilled' && Array.isArray(activeStatusesRes.value.data)
                ? activeStatusesRes.value.data
                : [];

            // Map attendance by user ID
            const attendanceMap = new Map();
            attendanceRecords.forEach(rec => {
                const uid = rec.user?.id || rec.userId;
                if (uid) attendanceMap.set(uid, rec);
            });

            // Map active breaks by user ID
            const activeBreakMap = new Map();
            activeBreaks.forEach(ab => {
                if (ab.userId) activeBreakMap.set(ab.userId, ab);
            });

            // Filter staff (exclude Admin, BH, HR)
            const staffUsers = allUsers.filter(emp => {
                const role = (emp.role || '').toUpperCase();
                const des = (emp.designation || '').toUpperCase();
                return !['ADMIN', 'BUSINESS_HEAD', 'HR'].includes(role) && des !== 'ADMIN' && des !== 'HR' && des !== 'BH';
            });

            // Process every real staff employee
            const processedEmployees = staffUsers.map(emp => {
                const att = attendanceMap.get(emp.id);
                const activeBreak = activeBreakMap.get(emp.id);

                let status = 'Absent';
                let inTime = '-';
                let outTime = '-';
                let teaMinutes = att?.breakData?.tea || 0;
                let lunchMinutes = att?.breakData?.lunch || 0;
                let totalBreakMinutes = teaMinutes + lunchMinutes;
                let activeBreakStartTime = null;

                if (att && att.status === 'PRESENT') {
                    if (activeBreak) {
                        activeBreakStartTime = activeBreak.startTime;
                        if (activeBreak.breakType === 'TEA') status = 'Tea Break';
                        else if (activeBreak.breakType === 'LUNCH') status = 'Lunch Break';
                        else if (['CLIENT_MEETING', 'BH_MEETING'].includes(activeBreak.breakType)) status = 'In Meeting';
                        else status = 'On Break';
                    } else if (att.timeOut) {
                        status = 'Checked Out';
                    } else {
                        status = 'Working';
                    }

                    inTime = att.timeIn ? formatTime(att.timeIn) : '-';
                    outTime = att.timeOut ? formatTime(att.timeOut) : '-';
                } else if (att && att.status === 'LEAVE') {
                    status = 'On Leave';
                }

                // If currently on break, calculate active elapsed minutes
                let currentBreakElapsedMins = 0;
                if (activeBreak && activeBreak.startTime) {
                    currentBreakElapsedMins = Math.max(1, Math.round((Date.now() - new Date(activeBreak.startTime).getTime()) / 60000));
                    totalBreakMinutes += currentBreakElapsedMins;
                    if (activeBreak.breakType === 'TEA') teaMinutes += currentBreakElapsedMins;
                    if (activeBreak.breakType === 'LUNCH') lunchMinutes += currentBreakElapsedMins;
                }

                const h = Math.floor(totalBreakMinutes / 60);
                const m = totalBreakMinutes % 60;
                const breakTimeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

                return {
                    id: `EMP-${emp.id}`,
                    rawId: emp.id,
                    name: emp.name,
                    role: emp.designation || emp.role || 'Employee',
                    level: getLevelFromDesignation(emp.designation, emp.role),
                    showroom: getShowroomFromUser(emp, att),
                    status,
                    inTime,
                    outTime,
                    breakTime: breakTimeStr,
                    breakMinutes: totalBreakMinutes,
                    teaMinutes,
                    lunchMinutes,
                    currentBreakElapsedMins,
                    activeBreakStartTime,
                    maxBreak: '1h 15m',
                    isExceeded: totalBreakMinutes > 75,
                    initials: getInitials(emp.name),
                    gradient: getGradient(emp.name)
                };
            });

            setEmployees(processedEmployees);
        } catch (err) {
            console.error('Failed to load real overview data:', err);
        } finally {
            isFetchingRef.current = false;
            setIsLoadingData(false);
            if (isManual) {
                setTimeout(() => setIsRefreshing(false), 300);
            }
        }
    };

    // Background-Aware Smart Polling
    useEffect(() => {
        let isMounted = true;
        let intervalId = null;

        const doFetch = (isManual = false) => {
            if (document.hidden) return;
            fetchRealData(isManual);
        };

        doFetch(false);
        intervalId = setInterval(() => doFetch(false), 15000);

        const handleVisibilityChange = () => {
            if (!document.hidden && isMounted) {
                doFetch(false);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleVisibilityChange);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleVisibilityChange);
        };
    }, [user?.token]);

    // Single-Pass High Performance Aggregations (Replaces 24 separate loops)
    const stats = useMemo(() => {
        let total = employees.length;
        let working = 0;
        let onBreak = 0;
        let meeting = 0;
        let absent = 0;
        let checkedOut = 0;
        let onLeave = 0;
        let totalBreakMinutes = 0;
        let teaMinutes = 0;
        let lunchMinutes = 0;
        let exceededCount = 0;

        const levels = {
            'Level 1': { total: 0, working: 0, break: 0, meeting: 0, label: 'Management' },
            'Level 2': { total: 0, working: 0, break: 0, meeting: 0, label: 'Operations' },
            'Level 3': { total: 0, working: 0, break: 0, meeting: 0, label: 'Support' },
            'Level 4': { total: 0, working: 0, break: 0, meeting: 0, label: 'Interns & Field' }
        };

        const teaList = [];
        const lunchList = [];

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const s = emp.status;
            totalBreakMinutes += emp.breakMinutes;
            teaMinutes += emp.teaMinutes;
            lunchMinutes += emp.lunchMinutes;
            if (emp.isExceeded) exceededCount++;

            const lvl = levels[emp.level] || levels['Level 4'];
            lvl.total++;

            if (s === 'Working') {
                working++;
                lvl.working++;
            } else if (s === 'Tea Break') {
                onBreak++;
                lvl.break++;
                teaList.push(emp);
            } else if (s === 'Lunch Break') {
                onBreak++;
                lvl.break++;
                lunchList.push(emp);
            } else if (s === 'On Break') {
                onBreak++;
                lvl.break++;
            } else if (s === 'In Meeting') {
                meeting++;
                lvl.meeting++;
            } else if (s === 'Checked Out') {
                checkedOut++;
            } else if (s === 'On Leave') {
                onLeave++;
            } else {
                absent++;
            }
        }

        const presentTotal = working + onBreak + meeting + checkedOut;
        const attendanceRate = total > 0 ? Math.round((presentTotal / total) * 100) : 0;

        const totalBreakHours = Math.floor(totalBreakMinutes / 60);
        const totalBreakMinsRemainder = totalBreakMinutes % 60;
        const totalBreakTimeStr = totalBreakHours > 0 
            ? `${totalBreakHours}h ${totalBreakMinsRemainder}m` 
            : `${totalBreakMinsRemainder}m`;

        const combinedBreakMins = Math.max(1, teaMinutes + lunchMinutes);
        const teaPct = Math.round((teaMinutes / combinedBreakMins) * 100);
        const lunchPct = 100 - teaPct;

        return {
            total,
            presentTotal,
            attendanceRate,
            working,
            onBreak,
            meeting,
            absent,
            checkedOut,
            onLeave,
            exceededCount,
            totalBreakTimeStr,
            totalBreakMinutes,
            teaMinutes,
            lunchMinutes,
            teaPct,
            lunchPct,
            levels,
            teaList,
            lunchList
        };
    }, [employees]);

    // High-Performance Filtering & Sorting
    const filteredEmployees = useMemo(() => {
        let list = employees;

        if (selectedLevel !== 'All Levels') {
            list = list.filter((emp) => emp.level === selectedLevel);
        }

        if (selectedShowroom !== 'All Showrooms') {
            list = list.filter((emp) => emp.showroom === selectedShowroom);
        }

        if (statusTab !== 'All') {
            if (statusTab === 'Working') list = list.filter((emp) => emp.status === 'Working');
            else if (statusTab === 'On Break') list = list.filter((emp) => ['Tea Break', 'Lunch Break', 'On Break'].includes(emp.status));
            else if (statusTab === 'In Meeting') list = list.filter((emp) => emp.status === 'In Meeting');
            else if (statusTab === 'Absent') list = list.filter((emp) => emp.status === 'Absent');
            else if (statusTab === 'Checked Out') list = list.filter((emp) => emp.status === 'Checked Out');
            else if (statusTab === 'Exceeded') list = list.filter((emp) => emp.isExceeded);
        }

        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((emp) =>
                emp.name.toLowerCase().includes(q) ||
                emp.id.toLowerCase().includes(q) ||
                emp.role.toLowerCase().includes(q)
            );
        }

        // Real Sorting
        return [...list].sort((a, b) => {
            if (sortBy === 'Name') {
                return a.name.localeCompare(b.name);
            }
            if (sortBy === 'Break Time') {
                return b.breakMinutes - a.breakMinutes;
            }
            if (sortBy === 'In Time') {
                return (b.inTime !== '-' ? 1 : 0) - (a.inTime !== '-' ? 1 : 0);
            }
            // Status priority
            const priority = {
                'Working': 1,
                'Tea Break': 2,
                'Lunch Break': 3,
                'On Break': 4,
                'In Meeting': 5,
                'Checked Out': 6,
                'Absent': 7
            };
            return (priority[a.status] || 99) - (priority[b.status] || 99);
        });
    }, [employees, selectedLevel, selectedShowroom, statusTab, searchQuery, sortBy]);

    // Export CSV
    const handleExport = () => {
        const headers = ['Employee ID,Name,Role,Level,Showroom,Status,Check In,Check Out,Break Duration,Exceeded Policy\n'];
        const rows = filteredEmployees.map(
            (e) => `${e.id},"${e.name}",${e.role},${e.level},${e.showroom},${e.status},${e.inTime},${e.outTime},${e.breakTime},${e.isExceeded ? 'YES' : 'NO'}`
        );
        const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Realtime_Overview_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6 pb-12 font-sans antialiased">
            {/* ── TOP HERO COMMAND BAR ─────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-2xl">
                {/* Background ambient decorative glow */}
                <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                LIVE PULSE
                            </span>
                            <span className="text-xs font-semibold text-slate-400">
                                Real-Time Workforce Telemetry
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2 flex items-center gap-2">
                            Overview Command Center
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl font-normal leading-relaxed">
                            Monitor real-time employee attendance, active break lounges, and level-wise desk utilization across all Cookscape showrooms.
                        </p>
                    </div>

                    {/* Filter Controls Bar */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        {/* Live Clock Widget */}
                        <LiveClock />

                        {/* Level Selector */}
                        <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm backdrop-blur-md">
                            <Layers size={14} className="text-indigo-400 shrink-0" />
                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-white cursor-pointer font-bold pr-2"
                            >
                                <option value="All Levels" className="bg-slate-900 text-white">All Levels</option>
                                <option value="Level 1" className="bg-slate-900 text-white">Level 1 (Management)</option>
                                <option value="Level 2" className="bg-slate-900 text-white">Level 2 (Operations)</option>
                                <option value="Level 3" className="bg-slate-900 text-white">Level 3 (Support)</option>
                                <option value="Level 4" className="bg-slate-900 text-white">Level 4 (Interns & Field)</option>
                            </select>
                        </div>

                        {/* Showroom Selector */}
                        <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm backdrop-blur-md">
                            <Building2 size={14} className="text-emerald-400 shrink-0" />
                            <select
                                value={selectedShowroom}
                                onChange={(e) => setSelectedShowroom(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-white cursor-pointer font-bold pr-2"
                            >
                                <option value="All Showrooms" className="bg-slate-900 text-white">All Showrooms</option>
                                <option value="MTRS" className="bg-slate-900 text-white">MTRS Showroom</option>
                                <option value="Porur" className="bg-slate-900 text-white">Porur Showroom</option>
                                <option value="OMR" className="bg-slate-900 text-white">OMR Showroom</option>
                            </select>
                        </div>

                        {/* Manual Refresh Button */}
                        <button
                            onClick={() => fetchRealData(true)}
                            disabled={isRefreshing}
                            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-slate-200 transition-all active:scale-95 shadow-sm"
                            title="Refresh real-time data"
                        >
                            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
                        </button>

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                        >
                            <Download size={14} />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* ── TOP KPI SUMMARY CARDS (Interactive Quick Filters) ──────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Attendance Rate */}
                <button
                    type="button"
                    onClick={() => { setStatusTab('All'); setSelectedLevel('All Levels'); setSelectedShowroom('All Showrooms'); }}
                    className="text-left bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer group"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Total Staff</span>
                            <p className="text-3xl font-black text-slate-900 tracking-tight mt-1 group-hover:text-blue-600 transition-colors">
                                {stats.presentTotal} <span className="text-sm font-bold text-slate-600 font-sans">/ {stats.total}</span>
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs group-hover:scale-105 transition-transform">
                            <Users size={20} />
                        </div>
                    </div>
                    {/* Attendance Progress Meter */}
                    <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                            <span>Attendance Rate</span>
                            <span className="text-blue-600 font-bold">{stats.attendanceRate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${stats.attendanceRate}%` }} />
                        </div>
                    </div>
                </button>

                {/* 2. Currently Working */}
                <button
                    type="button"
                    onClick={() => setStatusTab('Working')}
                    className={`text-left bg-white p-5 rounded-3xl border shadow-xs transition-all hover:shadow-md active:scale-[0.99] cursor-pointer group ${
                        statusTab === 'Working' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/90 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">At Work</span>
                            <p className="text-3xl font-black text-emerald-600 tracking-tight mt-1">
                                {stats.working}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs group-hover:scale-105 transition-transform">
                            <Activity size={20} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Active on projects / desk</span>
                    </div>
                </button>

                {/* 3. On Break */}
                <button
                    type="button"
                    onClick={() => setStatusTab('On Break')}
                    className={`text-left bg-white p-5 rounded-3xl border shadow-xs transition-all hover:shadow-md active:scale-[0.99] cursor-pointer group ${
                        statusTab === 'On Break' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200/90 hover:border-amber-300'
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">In Break Lounge</span>
                            <p className="text-3xl font-black text-amber-600 tracking-tight mt-1">
                                {stats.onBreak}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-xs group-hover:scale-105 transition-transform">
                            <Coffee size={20} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-extrabold">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">Tea: {stats.teaList.length}</span>
                        <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">Lunch: {stats.lunchList.length}</span>
                    </div>
                </button>

                {/* 4. In Meeting */}
                <button
                    type="button"
                    onClick={() => setStatusTab('In Meeting')}
                    className={`text-left bg-white p-5 rounded-3xl border shadow-xs transition-all hover:shadow-md active:scale-[0.99] cursor-pointer group ${
                        statusTab === 'In Meeting' ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' : 'border-slate-200/90 hover:border-indigo-300'
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Meetings</span>
                            <p className="text-3xl font-black text-indigo-600 tracking-tight mt-1">
                                {stats.meeting}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs group-hover:scale-105 transition-transform">
                            <Video size={20} />
                        </div>
                    </div>
                    <div className="mt-3 text-[11px] font-bold text-indigo-700">
                        Client visits & reviews
                    </div>
                </button>

                {/* 5. Total Break Time & Exceeded Warning */}
                <div className={`bg-white p-5 rounded-3xl border shadow-xs transition-all ${
                    stats.exceededCount > 0 ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200/90'
                }`}>
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">Total Break Time</span>
                            <p className="text-3xl font-black text-slate-900 tracking-tight mt-1">
                                {stats.totalBreakTimeStr}
                            </p>
                        </div>
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${
                            stats.exceededCount > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-600">Max Policy: 1h 15m</span>
                        {stats.exceededCount > 0 ? (
                            <span className="text-rose-600 font-extrabold flex items-center gap-1">
                                <AlertTriangle size={11} /> {stats.exceededCount} Over-limit
                            </span>
                        ) : (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={11} /> 100% Compliant
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 2-COLUMN BALANCED COMMAND CENTER (8 cols & 4 cols) ─────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* ── LEFT SECTION: WORKFORCE DIRECTORY (8 cols) ─────────────── */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
                        
                        {/* Header & View Switcher */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    Workforce Roster
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                        {filteredEmployees.length} of {employees.length}
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                                    Live presence status and individual break meters
                                </p>
                            </div>

                            {/* View Switcher (Grid vs Table) */}
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold border border-slate-200/60">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                                            viewMode === 'grid'
                                                ? 'bg-white text-slate-900 shadow-sm font-black'
                                                : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                    >
                                        <Grid size={14} /> Grid
                                    </button>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                                            viewMode === 'table'
                                                ? 'bg-white text-slate-900 shadow-sm font-black'
                                                : 'text-slate-500 hover:text-slate-900'
                                        }`}
                                    >
                                        <List size={14} /> Table
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search, Sort & Status Filters */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                {/* Search Bar */}
                                <div className="relative w-full sm:w-80">
                                    <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, ID or role..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-9 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Sort Dropdown */}
                                <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
                                    <span className="font-semibold text-slate-600">Sort:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                                    >
                                        <option value="Status">By Status Priority</option>
                                        <option value="Name">By Name (A-Z)</option>
                                        <option value="Break Time">By Break Time (Highest)</option>
                                        <option value="In Time">By Earliest Punch-In</option>
                                    </select>
                                </div>
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {[
                                    { id: 'All', label: 'All Staff', count: stats.total },
                                    { id: 'Working', label: 'Working', count: stats.working, color: 'text-emerald-700 bg-emerald-100' },
                                    { id: 'On Break', label: 'On Break', count: stats.onBreak, color: 'text-amber-800 bg-amber-100' },
                                    { id: 'In Meeting', label: 'In Meeting', count: stats.meeting, color: 'text-indigo-800 bg-indigo-100' },
                                    { id: 'Checked Out', label: 'Checked Out', count: stats.checkedOut, color: 'text-slate-700 bg-slate-200' },
                                    { id: 'Absent', label: 'Absent', count: stats.absent, color: 'text-slate-600 bg-slate-200' },
                                    ...(stats.exceededCount > 0 ? [{ id: 'Exceeded', label: '⚠️ Over Break Limit', count: stats.exceededCount, color: 'text-rose-700 bg-rose-100' }] : [])
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setStatusTab(tab.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                            statusTab === tab.id
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                            statusTab === tab.id ? 'bg-slate-700 text-white' : tab.color || 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoadingData ? (
                            <div className="py-20 text-center text-slate-400 space-y-3">
                                <Loader2 size={28} className="animate-spin mx-auto text-emerald-600" />
                                <p className="text-xs font-bold text-slate-600">Syncing live database statuses...</p>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="py-16 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                <p className="text-sm font-bold text-slate-700">No employees match this filter</p>
                                <p className="text-xs text-slate-500">Try changing your level, showroom, or search query.</p>
                                <button
                                    onClick={() => { setStatusTab('All'); setSelectedLevel('All Levels'); setSelectedShowroom('All Showrooms'); setSearchQuery(''); }}
                                    className="mt-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* ── GRID VIEW (Modern Cards) ──────────────────── */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 pt-1">
                                {filteredEmployees.slice(0, visibleCount).map((emp) => {
                                    const lvlMeta = getLevelMeta(emp.level);
                                    return (
                                        <div
                                            key={emp.id}
                                            className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                                                emp.isExceeded
                                                    ? 'border-rose-300 ring-2 ring-rose-500/10 shadow-xs'
                                                    : 'border-slate-200/90 hover:border-slate-300'
                                            }`}
                                        >
                                            <div>
                                                {/* Top Row: Avatar + Name + Tags */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {/* Sleek Initials Avatar */}
                                                        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${emp.gradient} text-white font-black text-sm flex items-center justify-center shadow-md shadow-slate-200 shrink-0 border border-white/20`}>
                                                            {emp.initials}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <h3 className="text-sm font-black text-slate-900 truncate leading-snug">
                                                                {emp.name}
                                                            </h3>
                                                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                                                                {emp.id} • {emp.role}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Showroom Tag */}
                                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                                        {emp.showroom}
                                                    </span>
                                                </div>

                                                {/* Status + Level Row */}
                                                <div className="mt-3.5 flex items-center justify-between gap-2 flex-wrap">
                                                    <StatusPill status={emp.status} />

                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${lvlMeta.badgeColor}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${lvlMeta.dot}`} />
                                                        {emp.level} ({lvlMeta.label})
                                                    </span>
                                                </div>

                                                {/* Active break reminder */}
                                                {emp.currentBreakElapsedMins > 0 && (
                                                    <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-800 flex items-center justify-between">
                                                        <span className="flex items-center gap-1.5">
                                                            <Coffee size={13} className="text-amber-600" />
                                                            Currently Away:
                                                        </span>
                                                        <span className="font-extrabold text-amber-900">
                                                            {emp.currentBreakElapsedMins}m elapsed
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bottom Section: In/Out Times + Break Meter */}
                                            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                                                        <span className="text-slate-600 block text-[10px] font-bold">Check-in</span>
                                                        <span className="font-black text-slate-800">{emp.inTime}</span>
                                                    </div>
                                                    <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                                                        <span className="text-slate-600 block text-[10px] font-bold">Check-out</span>
                                                        <span className="font-black text-slate-800">{emp.outTime}</span>
                                                    </div>
                                                </div>

                                                {/* Break Progress Meter */}
                                                <div>
                                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-600 mb-1">
                                                        <span className="flex items-center gap-1">
                                                            <span>Break Taken</span>
                                                            <span className="text-slate-400 font-normal">({emp.teaMinutes}m Tea / {emp.lunchMinutes}m Lunch)</span>
                                                        </span>
                                                        <span className={emp.isExceeded ? 'text-rose-600 font-black' : 'text-slate-800'}>
                                                            {emp.breakTime} / 1h 15m
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                                        {/* Tea Break Segment */}
                                                        <div
                                                            className="h-full bg-amber-500 transition-all duration-300"
                                                            style={{ width: `${Math.min(100, (emp.teaMinutes / 75) * 100)}%` }}
                                                            title={`Tea: ${emp.teaMinutes}m`}
                                                        />
                                                        {/* Lunch Break Segment */}
                                                        <div
                                                            className={`h-full transition-all duration-300 ${emp.isExceeded ? 'bg-rose-600' : 'bg-emerald-500'}`}
                                                            style={{ width: `${Math.min(100, (emp.lunchMinutes / 75) * 100)}%` }}
                                                            title={`Lunch: ${emp.lunchMinutes}m`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ── TABLE VIEW (Dense Enterprise Table) ────────── */
                            <div className="overflow-x-auto border border-slate-200/90 rounded-2xl">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-600">
                                        <tr>
                                            <th className="py-3 px-4">Employee</th>
                                            <th className="py-3 px-3">Showroom</th>
                                            <th className="py-3 px-3">Level</th>
                                            <th className="py-3 px-3">Live Status</th>
                                            <th className="py-3 px-3">Check-in</th>
                                            <th className="py-3 px-3">Check-out</th>
                                            <th className="py-3 px-4 text-right">Break Meter</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {filteredEmployees.slice(0, visibleCount).map((emp) => (
                                            <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${emp.gradient} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                                                            {emp.initials}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 leading-tight">{emp.name}</p>
                                                            <p className="text-[10px] text-slate-400">{emp.id} • {emp.role}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 font-semibold text-slate-700">{emp.showroom}</td>
                                                <td className="py-3 px-3">
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {emp.level}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <StatusPill status={emp.status} />
                                                </td>
                                                <td className="py-3 px-3 font-bold text-slate-800">{emp.inTime}</td>
                                                <td className="py-3 px-3 font-bold text-slate-800">{emp.outTime}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={`font-black ${emp.isExceeded ? 'text-rose-600' : 'text-slate-800'}`}>
                                                        {emp.breakTime}
                                                    </span>
                                                    <span className="text-slate-400 text-[10px] block">/ 1h 15m</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Load More Button */}
                        {visibleCount < filteredEmployees.length && (
                            <div className="text-center pt-3">
                                <button
                                    onClick={() => setVisibleCount((prev) => prev + 16)}
                                    className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-800 text-xs font-black rounded-2xl transition-all inline-flex items-center gap-2 active:scale-95 shadow-xs cursor-pointer"
                                >
                                    Load More Employees ({filteredEmployees.length - visibleCount} remaining) <ChevronDown size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT SECTION: LIVE BREAK LOUNGE & INTELLIGENCE (4 cols) ─ */}
                <div className="lg:col-span-4 space-y-4">
                    
                    {/* WIDGET 1: LIVE BREAK LOUNGE */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <Coffee size={16} className="text-amber-600" />
                                    Live Break Lounge
                                </h3>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Employees currently away on breaks
                                </p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                                {stats.onBreak} Active
                            </span>
                        </div>

                        {/* Break Tabs */}
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <button
                                onClick={() => setBreakTab('Tea Break')}
                                className={`pb-1.5 text-xs font-black transition-all relative cursor-pointer ${
                                    breakTab === 'Tea Break' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Tea Break ({stats.teaList.length})
                                {breakTab === 'Tea Break' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
                                )}
                            </button>
                            <button
                                onClick={() => setBreakTab('Lunch Break')}
                                className={`pb-1.5 text-xs font-black transition-all relative cursor-pointer ${
                                    breakTab === 'Lunch Break' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Lunch Break ({stats.lunchList.length})
                                {breakTab === 'Lunch Break' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                                )}
                            </button>
                        </div>

                        {/* Break List */}
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                            {(breakTab === 'Tea Break' ? stats.teaList : stats.lunchList).length === 0 ? (
                                <div className="py-8 text-center text-slate-400 space-y-1">
                                    <p className="text-xs font-bold text-slate-600">No active {breakTab.toLowerCase()} right now</p>
                                    <p className="text-[11px]">All staff assigned to this category are working on desk.</p>
                                </div>
                            ) : (
                                (breakTab === 'Tea Break' ? stats.teaList : stats.lunchList).map((emp) => (
                                    <div 
                                        key={emp.id} 
                                        className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${emp.gradient} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                                                {emp.initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 truncate leading-tight">{emp.name}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{emp.showroom} • {emp.role}</p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="font-black text-amber-700 block">
                                                {emp.currentBreakElapsedMins ? `${emp.currentBreakElapsedMins}m elapsed` : emp.breakTime}
                                            </span>
                                            <span className="text-[9.5px] font-semibold text-slate-400">
                                                Total: {emp.breakTime}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* WIDGET 2: LEVEL WISE OCCUPANCY & PROGRESS */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <Layers size={16} className="text-indigo-600" />
                                Level Distribution
                            </h3>
                            {selectedLevel !== 'All Levels' && (
                                <button
                                    onClick={() => setSelectedLevel('All Levels')}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>

                        <div className="space-y-3.5">
                            {['Level 1', 'Level 2', 'Level 3', 'Level 4'].map((lvl) => {
                                const lData = stats.levels[lvl];
                                const meta = getLevelMeta(lvl);
                                const workingPct = lData.total > 0 ? Math.round((lData.working / lData.total) * 100) : 0;
                                const isSelected = selectedLevel === lvl;

                                return (
                                    <div
                                        key={lvl}
                                        onClick={() => setSelectedLevel(isSelected ? 'All Levels' : lvl)}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                                            isSelected 
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                                : 'bg-slate-50/70 border-slate-200/70 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                                                <span className="font-black">{lvl}</span>
                                                <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>({meta.label})</span>
                                            </div>
                                            <span className="font-extrabold">
                                                {lData.working} <span className={isSelected ? 'text-slate-400' : 'text-slate-400'}>/ {lData.total}</span>
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className={`w-full h-1.5 rounded-full overflow-hidden mt-2 ${isSelected ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${isSelected ? 'bg-emerald-400' : 'bg-indigo-600'}`}
                                                style={{ width: `${workingPct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* WIDGET 3: BREAK RATIO DONUT & POLICY */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                            Break Ratio & Compliance
                        </h3>

                        {/* Interactive SVG Donut */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-slate-100"
                                        strokeWidth="3.8"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-amber-500 transition-all duration-500"
                                        strokeDasharray={`${stats.teaPct}, 100`}
                                        strokeWidth="3.8"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-emerald-500 transition-all duration-500"
                                        strokeDasharray={`${stats.lunchPct}, 100`}
                                        strokeDashoffset={`-${stats.teaPct}`}
                                        strokeWidth="3.8"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                                    <span className="text-xs font-black text-slate-900">{stats.totalBreakTimeStr}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Tea Break
                                    </span>
                                    <span className="font-black text-slate-900">{stats.teaMinutes}m ({stats.teaPct}%)</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Lunch Break
                                    </span>
                                    <span className="font-black text-slate-900">{stats.lunchMinutes}m ({stats.lunchPct}%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Policy Rules */}
                        <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span>Allowed Daily Break:</span>
                                <span className="font-bold text-slate-900">1h 15m (75m max)</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-600 font-medium">
                                <span>Over-limit Alert:</span>
                                <span className="font-bold text-rose-600">Highlighted in Red</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default OverviewDashboard;
