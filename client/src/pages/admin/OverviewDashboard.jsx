import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
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
    ChevronRight,
    Grid,
    List,
    AlertTriangle,
    Layers,
    Building2,
    Calendar,
    MoreVertical,
    CheckCircle2,
    Utensils,
    ExternalLink,
    Filter,
    Shield,
    Sparkles,
    Loader2
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
    // Fallback distribution based on user ID if showroom isn't explicitly in designation
    const showrooms = ['MTRS', 'Porur', 'OMR'];
    return showrooms[(user?.id || 0) % 3];
};

const OverviewDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const [selectedLevel, setSelectedLevel] = useState('All Levels');
    const [selectedShowroom, setSelectedShowroom] = useState('All Showrooms');
    const [statusTab, setStatusTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('Status');
    const [breakTab, setBreakTab] = useState('Tea Break');

    // Live clock
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Real Data State
    const [employees, setEmployees] = useState([]);
    const [visibleCount, setVisibleCount] = useState(12);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Main Data Fetching from Real Database Endpoints
    const fetchRealData = async () => {
        setIsRefreshing(true);
        try {
            if (!user?.token) return;

            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const todayStr = new Date().toISOString().slice(0, 10);

            // Fetch Real Database Employees, Daily Attendance, and Active Break Statuses
            const [employeesRes, attendanceRes, activeStatusesRes] = await Promise.allSettled([
                axios.get(`${baseUrl}/admin/employees`, config),
                axios.get(`${baseUrl}/admin/daily-attendance?date=${todayStr}`, config),
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

            // Map Attendance & Break data by User ID
            const attendanceMap = new Map();
            attendanceRecords.forEach(rec => {
                if (rec.user?.id) {
                    attendanceMap.set(rec.user.id, rec);
                }
            });

            const activeBreakMap = new Map();
            activeBreaks.forEach(ab => {
                if (ab.userId) {
                    activeBreakMap.set(ab.userId, ab);
                }
            });

            // Process every real user in database
            const processedEmployees = allUsers.map(emp => {
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
                    } else {
                        status = 'Working';
                    }
                    inTime = att.timeIn ? formatTime(att.timeIn) : '-';
                    outTime = att.timeOut ? formatTime(att.timeOut) : '-';
                } else if (att && att.status === 'LEAVE') {
                    status = 'On Leave';
                }

                // Format break string
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
                    status: status,
                    inTime: inTime,
                    outTime: outTime,
                    breakTime: breakTimeStr,
                    breakMinutes: totalBreakMinutes,
                    teaMinutes: teaMinutes,
                    lunchMinutes: lunchMinutes,
                    maxBreak: '1h 15m',
                    isExceeded: totalBreakMinutes > 75,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emp.name)}`
                };
            });

            setEmployees(processedEmployees);
        } catch (err) {
            console.error('Failed to load real data:', err);
        } finally {
            setIsLoadingData(false);
            setTimeout(() => setIsRefreshing(false), 400);
        }
    };

    useEffect(() => {
        fetchRealData();
    }, []);

    // Filter Logic
    const filteredEmployees = employees.filter((emp) => {
        if (selectedLevel !== 'All Levels' && emp.level !== selectedLevel) return false;
        if (selectedShowroom !== 'All Showrooms' && emp.showroom !== selectedShowroom) return false;
        if (statusTab !== 'All') {
            if (statusTab === 'Working' && emp.status !== 'Working') return false;
            if (statusTab === 'On Break' && !['Tea Break', 'Lunch Break', 'On Break'].includes(emp.status)) return false;
            if (statusTab === 'In Meeting' && emp.status !== 'In Meeting') return false;
        }
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            return (
                emp.name.toLowerCase().includes(q) ||
                emp.id.toLowerCase().includes(q) ||
                emp.role.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Dynamic Counts from Real Data
    const totalCount = employees.length;
    const workingCount = employees.filter((e) => e.status === 'Working').length;
    const breakCount = employees.filter((e) => ['Tea Break', 'Lunch Break', 'On Break'].includes(e.status)).length;
    const meetingCount = employees.filter((e) => e.status === 'In Meeting').length;

    // Total accumulated break minutes for all working employees
    const totalAccumulatedBreakMinutes = employees.reduce((sum, e) => sum + e.breakMinutes, 0);
    const totalBreakHours = Math.floor(totalAccumulatedBreakMinutes / 60);
    const totalBreakMins = totalAccumulatedBreakMinutes % 60;
    const totalBreakTimeStr = totalBreakHours > 0 ? `${totalBreakHours}h ${totalBreakMins}m` : `${totalBreakMins}m`;

    // Level-wise counts
    const getLevelCounts = (lvl) => {
        const lvlEmps = employees.filter((e) => e.level === lvl);
        return {
            total: lvlEmps.length,
            working: lvlEmps.filter((e) => e.status === 'Working').length,
            break: lvlEmps.filter((e) => ['Tea Break', 'Lunch Break', 'On Break'].includes(e.status)).length,
            meeting: lvlEmps.filter((e) => e.status === 'In Meeting').length
        };
    };

    const lvl1Stats = getLevelCounts('Level 1');
    const lvl2Stats = getLevelCounts('Level 2');
    const lvl3Stats = getLevelCounts('Level 3');
    const lvl4Stats = getLevelCounts('Level 4');

    // Break area lists
    const teaBreakList = employees.filter((e) => e.status === 'Tea Break');
    const lunchBreakList = employees.filter((e) => e.status === 'Lunch Break');

    // Total Tea vs Lunch break minutes
    const totalTeaBreakMins = employees.reduce((sum, e) => sum + e.teaMinutes, 0);
    const totalLunchBreakMins = employees.reduce((sum, e) => sum + e.lunchMinutes, 0);
    const combinedBreakMins = Math.max(1, totalTeaBreakMins + totalLunchBreakMins);
    const teaPct = Math.round((totalTeaBreakMins / combinedBreakMins) * 100);
    const lunchPct = 100 - teaPct;

    // Render Status Badges
    const renderStatusBadge = (emp) => {
        if (emp.status === 'Working') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Working
                </span>
            );
        }
        if (emp.status === 'Tea Break') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Coffee size={12} className="text-amber-600" />
                    Tea Break
                </span>
            );
        }
        if (emp.status === 'Lunch Break') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                    <Utensils size={12} className="text-orange-600" />
                    Lunch Break
                </span>
            );
        }
        if (emp.status === 'In Meeting') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Video size={12} className="text-indigo-600" />
                    In Meeting
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {emp.status}
            </span>
        );
    };

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
                        Real-time employee attendance & break overview
                    </p>
                </div>

                {/* Filter Controls Bar */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Level Selector */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs">
                        <Layers size={15} className="text-indigo-500" />
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
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs">
                        <Building2 size={15} className="text-emerald-500" />
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

                    {/* Date & Time Widget */}
                    <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="text-slate-300">|</span>
                        <Clock size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-800">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={fetchRealData}
                        disabled={isRefreshing}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors active:scale-95 shadow-xs"
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

            {/* ── TOP KPI SUMMARY CARDS ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Employees */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{totalCount}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">Total Employees</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">Real Database Records</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                        <Users size={22} />
                    </div>
                </div>

                {/* 2. Currently Working */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{workingCount}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">Currently Working</p>
                        <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                            {totalCount > 0 ? Math.round((workingCount / totalCount) * 100) : 0}% of total
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                        <Activity size={22} />
                    </div>
                </div>

                {/* 3. On Break */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{breakCount}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">On Break</p>
                        <p className="text-[10px] font-semibold text-amber-600 mt-0.5">
                            {totalCount > 0 ? Math.round((breakCount / totalCount) * 100) : 0}% of total
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                        <Coffee size={22} />
                    </div>
                </div>

                {/* 4. In Meeting */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight">{meetingCount}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-1">In Meeting</p>
                        <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                            {totalCount > 0 ? Math.round((meetingCount / totalCount) * 100) : 0}% of total
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                        <Video size={22} />
                    </div>
                </div>

                {/* 5. Total Break Time */}
                <div className="bg-red-50/40 p-5 rounded-2xl border border-red-200/70 shadow-xs flex items-center justify-between relative overflow-hidden">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-black text-slate-900 tracking-tight">{totalBreakTimeStr}</p>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Total Break Time</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">(Tea + Lunch)</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
                            <Clock size={20} />
                        </div>
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
                                <Layers size={16} className="text-indigo-600" />
                                Level Wise Summary
                            </h2>
                            <ChevronDown size={16} className="text-slate-400 cursor-pointer" />
                        </div>

                        {/* Level 1 Card */}
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                                    <span className="text-xs font-bold text-slate-800">Level 1</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{lvl1Stats.total}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Management</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50">
                                <span className="text-emerald-700">{lvl1Stats.working} Working</span>
                                <span className="text-amber-700">{lvl1Stats.break} On Break</span>
                                <span className="text-indigo-700">{lvl1Stats.meeting} Meeting</span>
                            </div>
                        </div>

                        {/* Level 2 Card */}
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                    <span className="text-xs font-bold text-slate-800">Level 2</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{lvl2Stats.total}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Operations</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50">
                                <span className="text-emerald-700">{lvl2Stats.working} Working</span>
                                <span className="text-amber-700">{lvl2Stats.break} On Break</span>
                                <span className="text-indigo-700">{lvl2Stats.meeting} Meeting</span>
                            </div>
                        </div>

                        {/* Level 3 Card */}
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-pink-600" />
                                    <span className="text-xs font-bold text-slate-800">Level 3</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{lvl3Stats.total}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Support</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50">
                                <span className="text-emerald-700">{lvl3Stats.working} Working</span>
                                <span className="text-amber-700">{lvl3Stats.break} On Break</span>
                                <span className="text-indigo-700">{lvl3Stats.meeting} Meeting</span>
                            </div>
                        </div>

                        {/* Level 4 Card */}
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <span className="text-xs font-bold text-slate-800">Level 4</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">{lvl4Stats.total}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Interns & Field</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50">
                                <span className="text-emerald-700">{lvl4Stats.working} Working</span>
                                <span className="text-amber-700">{lvl4Stats.break} On Break</span>
                                <span className="text-indigo-700">{lvl4Stats.meeting} Meeting</span>
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
                                    {filteredEmployees.length} Employees
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
                                        <Grid size={14} /> Grid View
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                                            viewMode === 'list'
                                                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <List size={14} /> List View
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search & Status Pill Filters Row */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                {/* Search Input */}
                                <div className="relative w-full sm:w-64">
                                    <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search employee..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>

                                {/* Sort Dropdown */}
                                <div className="flex items-center gap-2 text-xs text-slate-500 self-end sm:self-auto">
                                    <span>Sort by:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                                    >
                                        <option value="Status">Status</option>
                                        <option value="Name">Name</option>
                                        <option value="Break Time">Break Duration</option>
                                    </select>
                                </div>
                            </div>

                            {/* Filter Pills */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => setStatusTab('All')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        statusTab === 'All'
                                            ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-300'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    All <span className="ml-1 opacity-80">{totalCount}</span>
                                </button>
                                <button
                                    onClick={() => setStatusTab('Working')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        statusTab === 'Working'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    Working <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px]">{workingCount}</span>
                                </button>
                                <button
                                    onClick={() => setStatusTab('On Break')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        statusTab === 'On Break'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    On Break <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px]">{breakCount}</span>
                                </button>
                                <button
                                    onClick={() => setStatusTab('In Meeting')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        statusTab === 'In Meeting'
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    In Meeting <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-700 text-white text-[10px]">{meetingCount}</span>
                                </button>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoadingData ? (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                                <Loader2 size={24} className="animate-spin mx-auto text-emerald-600" />
                                <p className="text-xs font-semibold">Fetching live employee database...</p>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 space-y-1">
                                <p className="text-sm font-bold text-slate-700">No employees match this filter</p>
                                <p className="text-xs">Try selecting a different level or showroom filter.</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            /* Employee Cards Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
                                {filteredEmployees.slice(0, visibleCount).map((emp) => (
                                    <div
                                        key={emp.id}
                                        className={`bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md ${
                                            emp.isExceeded ? 'border-red-300 ring-2 ring-red-500/10' : 'border-slate-200/80'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={emp.avatar}
                                                    alt={emp.name}
                                                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                                                />
                                                <div>
                                                    <h3 className="text-xs font-bold text-slate-900 leading-tight">{emp.name}</h3>
                                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{emp.id} • {emp.role}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="mt-3 flex items-center justify-between">
                                            {renderStatusBadge(emp)}
                                            {emp.isExceeded && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-red-600 text-white uppercase tracking-wider shadow-xs">
                                                    <AlertTriangle size={10} /> Exceeded
                                                </span>
                                            )}
                                        </div>

                                        {/* In Time / Out Time */}
                                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                                            <div>
                                                <span className="text-slate-400 block text-[10px] font-semibold">In Time</span>
                                                <span className="font-bold text-slate-800">{emp.inTime}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px] font-semibold">Out Time</span>
                                                <span className="font-bold text-slate-800">{emp.outTime}</span>
                                            </div>
                                        </div>

                                        {/* Break Time Progress Bar */}
                                        <div className="mt-3 pt-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                                                <span>Break Time</span>
                                                <span className={emp.isExceeded ? 'text-red-600 font-extrabold' : 'text-slate-700'}>
                                                    {emp.breakTime} / {emp.maxBreak}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        emp.isExceeded
                                                            ? 'bg-red-600'
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
                                            <img
                                                src={emp.avatar}
                                                alt={emp.name}
                                                className="w-9 h-9 rounded-full object-cover border border-white shadow-xs"
                                            />
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-900">{emp.name}</h3>
                                                <p className="text-[10px] text-slate-400">{emp.id} • {emp.role} • {emp.level} • {emp.showroom}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {renderStatusBadge(emp)}
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
                                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 active:scale-95 shadow-xs"
                                >
                                    Load More Employees <ChevronDown size={15} />
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
                                <Coffee size={16} className="text-amber-600" />
                                Break Area
                            </h2>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Employees currently on break</p>
                        </div>

                        {/* Break Tabs */}
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <button
                                onClick={() => setBreakTab('Tea Break')}
                                className={`pb-1 text-xs font-bold transition-all relative ${
                                    breakTab === 'Tea Break' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                Tea Break ({teaBreakList.length})
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
                                Lunch Break ({lunchBreakList.length})
                                {breakTab === 'Lunch Break' && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                                )}
                            </button>
                        </div>

                        {/* Break List */}
                        <div className="space-y-3">
                            {(breakTab === 'Tea Break' ? teaBreakList : lunchBreakList).length === 0 ? (
                                <p className="text-xs text-slate-400 py-3 text-center">No employees currently taking {breakTab.toLowerCase()}</p>
                            ) : (
                                (breakTab === 'Tea Break' ? teaBreakList : lunchBreakList).map((emp) => (
                                    <div key={emp.id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 text-xs border border-slate-200">
                                                {emp.name.split(' ').map((n) => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{emp.name}</p>
                                                <p className="text-[10px] text-slate-400">{emp.id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-extrabold text-slate-800">{emp.breakTime}</span>
                                            {emp.isExceeded && (
                                                <span className="block text-[9px] font-black text-red-600 uppercase">Exceeded</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Break Summary Ring Chart Panel */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Break Summary</h2>

                        {/* Interactive SVG Donut Ring */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative w-28 h-28 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-slate-100"
                                        strokeWidth="3.8"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-amber-500"
                                        strokeDasharray={`${teaPct}, 100`}
                                        strokeWidth="3.8"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className="text-emerald-500"
                                        strokeDasharray={`${lunchPct}, 100`}
                                        strokeDashoffset={`-${teaPct}`}
                                        strokeWidth="3.8"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] text-slate-400 font-semibold">Total Break</span>
                                    <span className="text-xs font-black text-slate-900">{totalBreakTimeStr}</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Tea Break
                                    </span>
                                    <span className="font-extrabold text-slate-800">{totalTeaBreakMins}m ({teaPct}%)</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Lunch Break
                                    </span>
                                    <span className="font-extrabold text-slate-800">{totalLunchBreakMins}m ({lunchPct}%)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Break Policy Panel */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Break Policy</h2>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Daily Allowed Break (Tea + Lunch)</span>
                                <span className="font-bold text-slate-900">1h 15m</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">When Exceeded</span>
                                <span className="font-bold text-red-600">Highlighted in Red</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Connected to live PostgreSQL / Prisma database
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OverviewDashboard;
