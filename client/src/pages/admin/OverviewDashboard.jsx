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
    SlidersHorizontal,
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
    CheckCircle2
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

// Helper to determine Showroom
const getShowroomFromUser = (user, attendanceRecord) => {
    const text = `${user?.siteName || ''} ${attendanceRecord?.siteName || ''} ${user?.designation || ''} ${user?.name || ''}`.toUpperCase();
    if (text.includes('PORUR')) return 'Porur';
    if (text.includes('OMR')) return 'OMR';
    if (text.includes('MTRS')) return 'MTRS';
    const showrooms = ['MTRS', 'Porur', 'OMR'];
    return showrooms[(user?.id || 0) % 3];
};

// Deterministic gradient avatar generator (zero network latency, never fails)
const AVATAR_GRADIENTS = [
    'from-blue-600 to-indigo-600',
    'from-emerald-600 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-purple-600 to-pink-600',
    'from-cyan-600 to-blue-600',
    'from-rose-600 to-pink-600',
    'from-violet-600 to-purple-600',
    'from-teal-600 to-emerald-600'
];

const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'EM';
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

// Isolated Live Clock Component (prevents the entire 1,000-line dashboard from re-rendering every second)
const LiveClock = memo(() => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 shadow-xs">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <span>{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="text-slate-300">|</span>
            <Clock size={13} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800 tabular-nums">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
        </div>
    );
});

LiveClock.displayName = 'LiveClock';

// Render Status Badge Component
const StatusBadge = memo(({ status }) => {
    switch (status) {
        case 'Working':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Working
                </span>
            );
        case 'Tea Break':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Coffee size={12} className="text-amber-600 shrink-0" />
                    Tea Break
                </span>
            );
        case 'Lunch Break':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                    <Utensils size={12} className="text-orange-600 shrink-0" />
                    Lunch Break
                </span>
            );
        case 'In Meeting':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Video size={12} className="text-indigo-600 shrink-0" />
                    In Meeting
                </span>
            );
        case 'Checked Out':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Checked Out
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                    Absent
                </span>
            );
    }
});

StatusBadge.displayName = 'StatusBadge';

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
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('Status');
    const [breakTab, setBreakTab] = useState('Tea Break');

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [employees, setEmployees] = useState([]);
    const [visibleCount, setVisibleCount] = useState(12);

    const isFetchingRef = useRef(false);

    // Fetch Real Data with Cache and In-Flight Request Deduplication
    const fetchRealData = async (isManual = false) => {
        if (isFetchingRef.current) return;
        if (!user?.token) return;

        isFetchingRef.current = true;
        if (isManual) setIsRefreshing(true);

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            // Local Date String YYYY-MM-DD
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            // Fetch Real Database Employees, Daily Attendance, and Active Break Statuses in parallel
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

            // Map Attendance data by User ID
            const attendanceMap = new Map();
            attendanceRecords.forEach(rec => {
                const uid = rec.user?.id || rec.userId;
                if (uid) attendanceMap.set(uid, rec);
            });

            // Map Active Break data by User ID
            const activeBreakMap = new Map();
            activeBreaks.forEach(ab => {
                if (ab.userId) activeBreakMap.set(ab.userId, ab);
            });

            // Exclude Admin, Business Head (BH), and HR users
            const staffUsers = allUsers.filter(emp => {
                const role = (emp.role || '').toUpperCase();
                const des = (emp.designation || '').toUpperCase();
                return !['ADMIN', 'BUSINESS_HEAD', 'HR'].includes(role) && des !== 'ADMIN' && des !== 'HR' && des !== 'BH';
            });

            // Process every real staff employee in database
            const processedEmployees = staffUsers.map(emp => {
                const att = attendanceMap.get(emp.id);
                const activeBreak = activeBreakMap.get(emp.id);

                let status = 'Absent';
                let inTime = '-';
                let outTime = '-';
                let teaMinutes = att?.breakData?.tea || 0;
                let lunchMinutes = att?.breakData?.lunch || 0;
                let totalBreakMinutes = teaMinutes + lunchMinutes;

                if (att && att.status === 'PRESENT') {
                    if (activeBreak) {
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

                // Calculate duration if currently on active break
                if (activeBreak && activeBreak.startTime) {
                    const elapsedMins = Math.max(1, Math.round((new Date() - new Date(activeBreak.startTime)) / 60000));
                    totalBreakMinutes += elapsedMins;
                    if (activeBreak.breakType === 'TEA') teaMinutes += elapsedMins;
                    if (activeBreak.breakType === 'LUNCH') lunchMinutes += elapsedMins;
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

    // Smart Background-Aware Polling (Pauses when tab is hidden, refreshes immediately on return)
    useEffect(() => {
        let isMounted = true;
        let intervalId = null;

        const doFetch = (isManual = false) => {
            if (document.hidden) return; // Skip background polling to save network and CPU
            fetchRealData(isManual);
        };

        doFetch(false);
        intervalId = setInterval(() => doFetch(false), 15000);

        const handleVisibilityChange = () => {
            if (!document.hidden && isMounted) {
                doFetch(false); // Instantly fetch fresh state when user focuses back on the tab
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

    // Single-Pass High-Performance Aggregations (Replaces 24 separate filter/reduce loops)
    const stats = useMemo(() => {
        let total = employees.length;
        let working = 0;
        let onBreak = 0;
        let meeting = 0;
        let absent = 0;
        let checkedOut = 0;
        let totalBreakMinutes = 0;
        let teaMinutes = 0;
        let lunchMinutes = 0;

        const levels = {
            'Level 1': { total: 0, working: 0, break: 0, meeting: 0 },
            'Level 2': { total: 0, working: 0, break: 0, meeting: 0 },
            'Level 3': { total: 0, working: 0, break: 0, meeting: 0 },
            'Level 4': { total: 0, working: 0, break: 0, meeting: 0 }
        };

        const teaList = [];
        const lunchList = [];

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const s = emp.status;
            totalBreakMinutes += emp.breakMinutes;
            teaMinutes += emp.teaMinutes;
            lunchMinutes += emp.lunchMinutes;

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
            } else {
                absent++;
            }
        }

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
            working,
            onBreak,
            meeting,
            absent,
            checkedOut,
            totalBreakTimeStr,
            teaMinutes,
            lunchMinutes,
            teaPct,
            lunchPct,
            levels,
            teaList,
            lunchList
        };
    }, [employees]);

    // High-Performance Memoized Filter & Real Sorting
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
        }

        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((emp) =>
                emp.name.toLowerCase().includes(q) ||
                emp.id.toLowerCase().includes(q) ||
                emp.role.toLowerCase().includes(q)
            );
        }

        // Apply Real Sorting
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
            // Default: Status priority
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
        const headers = ['Employee ID,Name,Role,Level,Showroom,Status,In Time,Out Time,Break Duration\n'];
        const rows = filteredEmployees.map(
            (e) => `${e.id},"${e.name}",${e.role},${e.level},${e.showroom},${e.status},${e.inTime},${e.outTime},${e.breakTime}`
        );
        const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Realtime_Overview_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="space-y-6 pb-12">
            {/* ── TOP HEADER SECTION ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        Overview <span className="animate-bounce inline-block">👋</span>
                    </h1>
                    <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                        Real-time employee attendance & break monitoring
                    </p>
                </div>

                {/* Filter Controls Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Level Selector */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs">
                        <Layers size={14} className="text-indigo-500 shrink-0" />
                        <select
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-slate-800 cursor-pointer font-bold"
                        >
                            <option value="All Levels">All Levels</option>
                            <option value="Level 1">Level 1 (Management)</option>
                            <option value="Level 2">Level 2 (Operations)</option>
                            <option value="Level 3">Level 3 (Support)</option>
                            <option value="Level 4">Level 4 (Interns & Field)</option>
                        </select>
                    </div>

                    {/* Showroom Selector */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs">
                        <Building2 size={14} className="text-emerald-500 shrink-0" />
                        <select
                            value={selectedShowroom}
                            onChange={(e) => setSelectedShowroom(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-slate-800 cursor-pointer font-bold"
                        >
                            <option value="All Showrooms">All Showrooms</option>
                            <option value="MTRS">MTRS Showroom</option>
                            <option value="Porur">Porur Showroom</option>
                            <option value="OMR">OMR Showroom</option>
                        </select>
                    </div>

                    {/* Isolated Date & Time Widget (Zero re-renders on parent) */}
                    <LiveClock />

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchRealData(true)}
                        disabled={isRefreshing}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-slate-600 transition-colors active:scale-95 shadow-xs"
                        title="Refresh live statuses"
                    >
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm active:scale-95"
                    >
                        <Download size={14} />
                        Export
                    </button>
                </div>
            </div>

            {/* ── TOP KPI SUMMARY CARDS (Interactive Quick Filters) ──────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Employees */}
                <button
                    type="button"
                    onClick={() => { setStatusTab('All'); setSelectedLevel('All Levels'); setSelectedShowroom('All Showrooms'); }}
                    className="text-left bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all active:scale-[0.99] cursor-pointer group"
                >
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
                            {stats.total}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">Total Employees</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">Click to view all</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shadow-xs group-hover:bg-slate-200 transition-colors">
                        <Users size={22} />
                    </div>
                </button>

                {/* 2. Currently Working */}
                <button
                    type="button"
                    onClick={() => setStatusTab('Working')}
                    className={`text-left bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer group ${
                        statusTab === 'Working' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200/80 hover:border-emerald-300'
                    }`}
                >
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">
                            {stats.working}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">Currently Working</p>
                        <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            {stats.total > 0 ? Math.round((stats.working / stats.total) * 100) : 0}% of total
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Activity size={22} />
                    </div>
                </button>

                {/* 3. On Break */}
                <button
                    type="button"
                    onClick={() => setStatusTab('On Break')}
                    className={`text-left bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer group ${
                        statusTab === 'On Break' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200/80 hover:border-amber-300'
                    }`}
                >
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                            {stats.onBreak}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">On Break</p>
                        <p className="text-[10px] font-semibold text-amber-600 mt-0.5">
                            {stats.total > 0 ? Math.round((stats.onBreak / stats.total) * 100) : 0}% of total
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Coffee size={22} />
                    </div>
                </button>

                {/* 4. In Meeting */}
                <button
                    type="button"
                    onClick={() => setStatusTab('In Meeting')}
                    className={`text-left bg-white p-5 rounded-2xl border shadow-xs flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer group ${
                        statusTab === 'In Meeting' ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' : 'border-slate-200/80 hover:border-indigo-300'
                    }`}
                >
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                            {stats.meeting}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">In Meeting</p>
                        <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                            {stats.total > 0 ? Math.round((stats.meeting / stats.total) * 100) : 0}% of total
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Video size={22} />
                    </div>
                </button>

                {/* 5. Total Break Time */}
                <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-200/70 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalBreakTimeStr}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Total Break Time</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">(Tea + Lunch)</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
                        <Clock size={22} />
                    </div>
                </div>
            </div>

            {/* ── MAIN DASHBOARD GRID LAYOUT ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* ── LEFT COLUMN: LEVEL WISE SUMMARY (3 cols) ───────────────── */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Layers size={15} className="text-indigo-600" />
                                Level Wise Summary
                            </h2>
                            {selectedLevel !== 'All Levels' && (
                                <button
                                    onClick={() => setSelectedLevel('All Levels')}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                                >
                                    Reset
                                </button>
                            )}
                        </div>

                        {/* Level 1 Card */}
                        <div 
                            onClick={() => setSelectedLevel(selectedLevel === 'Level 1' ? 'All Levels' : 'Level 1')}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                selectedLevel === 'Level 1' ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/20' : 'bg-slate-50/80 border-slate-200/60 hover:border-purple-200'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                                    <span className="text-xs font-bold text-slate-800">Level 1</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{stats.levels['Level 1'].total}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Management</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50 mt-1">
                                <span className="text-emerald-700">{stats.levels['Level 1'].working} Working</span>
                                <span className="text-amber-700">{stats.levels['Level 1'].break} Break</span>
                                <span className="text-indigo-700">{stats.levels['Level 1'].meeting} Meeting</span>
                            </div>
                        </div>

                        {/* Level 2 Card */}
                        <div 
                            onClick={() => setSelectedLevel(selectedLevel === 'Level 2' ? 'All Levels' : 'Level 2')}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                selectedLevel === 'Level 2' ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50/80 border-slate-200/60 hover:border-blue-200'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                    <span className="text-xs font-bold text-slate-800">Level 2</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{stats.levels['Level 2'].total}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Operations</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50 mt-1">
                                <span className="text-emerald-700">{stats.levels['Level 2'].working} Working</span>
                                <span className="text-amber-700">{stats.levels['Level 2'].break} Break</span>
                                <span className="text-indigo-700">{stats.levels['Level 2'].meeting} Meeting</span>
                            </div>
                        </div>

                        {/* Level 3 Card */}
                        <div 
                            onClick={() => setSelectedLevel(selectedLevel === 'Level 3' ? 'All Levels' : 'Level 3')}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                selectedLevel === 'Level 3' ? 'bg-pink-50/70 border-pink-300 ring-2 ring-pink-500/20' : 'bg-slate-50/80 border-slate-200/60 hover:border-pink-200'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-pink-600" />
                                    <span className="text-xs font-bold text-slate-800">Level 3</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{stats.levels['Level 3'].total}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Support</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50 mt-1">
                                <span className="text-emerald-700">{stats.levels['Level 3'].working} Working</span>
                                <span className="text-amber-700">{stats.levels['Level 3'].break} Break</span>
                                <span className="text-indigo-700">{stats.levels['Level 3'].meeting} Meeting</span>
                            </div>
                        </div>

                        {/* Level 4 Card */}
                        <div 
                            onClick={() => setSelectedLevel(selectedLevel === 'Level 4' ? 'All Levels' : 'Level 4')}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                selectedLevel === 'Level 4' ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20' : 'bg-slate-50/80 border-slate-200/60 hover:border-amber-200'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <span className="text-xs font-bold text-slate-800">Level 4</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{stats.levels['Level 4'].total}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Interns & Field</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50 mt-1">
                                <span className="text-emerald-700">{stats.levels['Level 4'].working} Working</span>
                                <span className="text-amber-700">{stats.levels['Level 4'].break} Break</span>
                                <span className="text-indigo-700">{stats.levels['Level 4'].meeting} Meeting</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── CENTER COLUMN: EMPLOYEES AT A GLANCE (6 cols) ──────────── */}
                <div className="lg:col-span-6 space-y-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                        {/* Section Title & View Switcher */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                                <h2 className="text-base font-bold text-slate-900">Employees at a Glance</h2>
                                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                                    {filteredEmployees.length} of {employees.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                            viewMode === 'grid'
                                                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Grid size={14} /> Grid
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                            viewMode === 'list'
                                                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <List size={14} /> List
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search & Sort Row */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                {/* Search Input */}
                                <div className="relative w-full sm:w-64">
                                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search employee..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Sort Dropdown (Real sorting implemented) */}
                                <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
                                    <span>Sort:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                                    >
                                        <option value="Status">By Status</option>
                                        <option value="Name">By Name (A-Z)</option>
                                        <option value="Break Time">By Break Duration</option>
                                        <option value="In Time">By Check-in Time</option>
                                    </select>
                                </div>
                            </div>

                            {/* Filter Pills */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => setStatusTab('All')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        statusTab === 'All'
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200/90 hover:bg-slate-100'
                                    }`}
                                >
                                    All <span className="ml-1 opacity-80">{stats.total}</span>
                                </button>
                                <button
                                    onClick={() => setStatusTab('Working')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        statusTab === 'Working'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200/90 hover:bg-slate-100'
                                    }`}
                                >
                                    Working <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px]">{stats.working}</span>
                                </button>
                                <button
                                    onClick={() => setStatusTab('On Break')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        statusTab === 'On Break'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200/90 hover:bg-slate-100'
                                    }`}
                                >
                                    On Break <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px]">{stats.onBreak}</span>
                                </button>
                                <button
                                    onClick={() => setStatusTab('In Meeting')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        statusTab === 'In Meeting'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200/90 hover:bg-slate-100'
                                    }`}
                                >
                                    In Meeting <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-700 text-white text-[10px]">{stats.meeting}</span>
                                </button>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoadingData ? (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                                <Loader2 size={24} className="animate-spin mx-auto text-emerald-600" />
                                <p className="text-xs font-semibold">Loading real-time employee data...</p>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 space-y-1">
                                <p className="text-sm font-bold text-slate-700">No employees match this filter</p>
                                <p className="text-xs">Try selecting a different level, showroom, or search term.</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* Employee Cards Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
                                {filteredEmployees.slice(0, visibleCount).map((emp) => (
                                    <div
                                        key={emp.id}
                                        className={`bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
                                            emp.isExceeded ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200/80'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Local Initials Avatar (0 HTTP requests) */}
                                                <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${emp.gradient} text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-xs shrink-0`}>
                                                    {emp.initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-xs font-bold text-slate-900 leading-tight truncate">{emp.name}</h3>
                                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">{emp.id} • {emp.role}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="mt-3 flex items-center justify-between">
                                            <StatusBadge status={emp.status} />
                                            {emp.isExceeded && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white uppercase tracking-wider shadow-xs">
                                                    <AlertTriangle size={10} /> Exceeded
                                                </span>
                                            )}
                                        </div>

                                        {/* In Time / Out Time */}
                                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                                            <div>
                                                <span className="text-slate-400 block text-[10px] font-semibold">Check In</span>
                                                <span className="font-bold text-slate-800">{emp.inTime}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] font-semibold">Check Out</span>
                                                <span className="font-bold text-slate-800">{emp.outTime}</span>
                                            </div>
                                        </div>

                                        {/* Break Time Progress Bar */}
                                        <div className="mt-3 pt-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                                                <span>Break Taken</span>
                                                <span className={emp.isExceeded ? 'text-rose-600 font-extrabold' : 'text-slate-700'}>
                                                    {emp.breakTime} / {emp.maxBreak}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        emp.isExceeded
                                                            ? 'bg-rose-600'
                                                            : emp.breakMinutes > 45
                                                            ? 'bg-amber-500'
                                                            : 'bg-emerald-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, (emp.breakMinutes / 75) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* List View */
                            <div className="space-y-2 pt-2">
                                {filteredEmployees.slice(0, visibleCount).map((emp) => (
                                    <div
                                        key={emp.id}
                                        className="bg-white p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${emp.gradient} text-white font-black text-xs flex items-center justify-center border border-white shadow-xs shrink-0`}>
                                                {emp.initials}
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-900">{emp.name}</h3>
                                                <p className="text-[10px] text-slate-400">{emp.id} • {emp.role} • {emp.level} • {emp.showroom}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <StatusBadge status={emp.status} />
                                            <div className="text-right text-xs">
                                                <p className="font-bold text-slate-800">{emp.inTime}</p>
                                                <p className="text-[10px] text-slate-400">Break: {emp.breakTime}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Load More Button */}
                        {visibleCount < filteredEmployees.length && (
                            <div className="text-center pt-3">
                                <button
                                    onClick={() => setVisibleCount((prev) => prev + 12)}
                                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 active:scale-95 shadow-xs"
                                >
                                    Load More Employees ({filteredEmployees.length - visibleCount} remaining) <ChevronDown size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT COLUMN: BREAK AREA & SUMMARY (3 cols) ─────────────── */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Break Area Panel */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Coffee size={15} className="text-amber-600" />
                                Break Area
                            </h2>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Employees currently taking breaks</p>
                        </div>

                        {/* Break Tabs */}
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <button
                                onClick={() => setBreakTab('Tea Break')}
                                className={`pb-1 text-xs font-bold transition-all relative ${
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
                                className={`pb-1 text-xs font-bold transition-all relative ${
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
                        <div className="space-y-3">
                            {(breakTab === 'Tea Break' ? stats.teaList : stats.lunchList).length === 0 ? (
                                <p className="text-xs text-slate-400 py-3 text-center">No employees currently taking {breakTab.toLowerCase()}</p>
                            ) : (
                                (breakTab === 'Tea Break' ? stats.teaList : stats.lunchList).map((emp) => (
                                    <div key={emp.id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${emp.gradient} flex items-center justify-center font-black text-white text-xs shrink-0 shadow-xs`}>
                                                {emp.initials}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 truncate">{emp.name}</p>
                                                <p className="text-[10px] text-slate-400">{emp.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-extrabold text-slate-800">{emp.breakTime}</span>
                                            {emp.isExceeded && (
                                                <span className="block text-[9px] font-black text-rose-600 uppercase">Exceeded</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Break Summary Donut Ring Chart Panel */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Break Ratio</h2>

                        {/* Interactive SVG Donut Ring */}
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
                                    <span className="text-[10px] text-slate-400 font-semibold">Total Break</span>
                                    <span className="text-xs font-black text-slate-900">{stats.totalBreakTimeStr}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Tea Break
                                    </span>
                                    <span className="font-extrabold text-slate-800">{stats.teaMinutes}m ({stats.teaPct}%)</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Lunch Break
                                    </span>
                                    <span className="font-extrabold text-slate-800">{stats.lunchMinutes}m ({stats.lunchPct}%)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Break Policy Panel */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Break Policy</h2>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Daily Allowed (Tea + Lunch)</span>
                                <span className="font-bold text-slate-900">1h 15m</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">When Exceeded</span>
                                <span className="font-bold text-rose-600">Highlighted in Red</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live connected to attendance & breaks
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OverviewDashboard;
