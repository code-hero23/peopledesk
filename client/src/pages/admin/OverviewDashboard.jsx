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
    Sparkles
} from 'lucide-react';
import axios from 'axios';

// Sample Mock Employees Data (used if live API returns fewer or during initial load)
const MOCK_EMPLOYEES = [
    {
        id: 'EMP-1001',
        name: 'Aravind Kumar',
        role: 'Senior Manager',
        level: 'Level 1',
        showroom: 'MTRS',
        status: 'Working',
        inTime: '09:02 AM',
        outTime: '-',
        breakTime: '15m',
        breakMinutes: 15,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1002',
        name: 'Sangeetha R',
        role: 'Sales Executive',
        level: 'Level 2',
        showroom: 'Porur',
        status: 'Tea Break',
        inTime: '09:05 AM',
        outTime: '-',
        breakTime: '10m',
        breakMinutes: 10,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1003',
        name: 'Karthik J',
        role: 'Technical Lead',
        level: 'Level 2',
        showroom: 'OMR',
        status: 'Client Meeting',
        inTime: '09:01 AM',
        outTime: '-',
        breakTime: '0m',
        breakMinutes: 0,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1004',
        name: 'Deeksha P',
        role: 'Support Specialist',
        level: 'Level 3',
        showroom: 'MTRS',
        status: 'Lunch Break',
        inTime: '09:03 AM',
        outTime: '-',
        breakTime: '45m',
        breakMinutes: 45,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1005',
        name: 'Mukesh G',
        role: 'Operations Lead',
        level: 'Level 2',
        showroom: 'OMR',
        status: 'Tea Break',
        inTime: '09:00 AM',
        outTime: '-',
        breakTime: '1h 25m',
        breakMinutes: 85,
        maxBreak: '1h 15m',
        isExceeded: true,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1006',
        name: 'Abinaya B',
        role: 'Customer Success',
        level: 'Level 3',
        showroom: 'Porur',
        status: 'Working',
        inTime: '09:04 AM',
        outTime: '-',
        breakTime: '10m',
        breakMinutes: 10,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1007',
        name: 'Vignesh R',
        role: 'Business Analyst',
        level: 'Level 1',
        showroom: 'MTRS',
        status: 'BH Meeting',
        inTime: '09:02 AM',
        outTime: '-',
        breakTime: '0m',
        breakMinutes: 0,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1008',
        name: 'Nithya T',
        role: 'HR Specialist',
        level: 'Level 2',
        showroom: 'Porur',
        status: 'Working',
        inTime: '09:06 AM',
        outTime: '-',
        breakTime: '45m',
        breakMinutes: 45,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1009',
        name: 'Pradeep R',
        role: 'Field Executive',
        level: 'Level 4',
        showroom: 'OMR',
        status: 'Client Meeting',
        inTime: '09:03 AM',
        outTime: '-',
        breakTime: '0m',
        breakMinutes: 0,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1010',
        name: 'Ramesh K',
        role: 'Showroom Assistant',
        level: 'Level 4',
        showroom: 'MTRS',
        status: 'Tea Break',
        inTime: '09:10 AM',
        outTime: '-',
        breakTime: '12m',
        breakMinutes: 12,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1011',
        name: 'Divya R',
        role: 'Sales Representative',
        level: 'Level 3',
        showroom: 'Porur',
        status: 'Tea Break',
        inTime: '09:12 AM',
        outTime: '-',
        breakTime: '8m',
        breakMinutes: 8,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
        id: 'EMP-1012',
        name: 'Praveen M',
        role: 'Intern',
        level: 'Level 4',
        showroom: 'OMR',
        status: 'Lunch Break',
        inTime: '09:15 AM',
        outTime: '-',
        breakTime: '15m',
        breakMinutes: 15,
        maxBreak: '1h 15m',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    }
];

const OverviewDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const [selectedLevel, setSelectedLevel] = useState('All Levels');
    const [selectedShowroom, setSelectedShowroom] = useState('All Showrooms');
    const [statusTab, setStatusTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [sortBy, setSortBy] = useState('Status');
    const [breakTab, setBreakTab] = useState('Tea Break'); // 'Tea Break' | 'Lunch Break'

    // Live clock
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
    const [visibleCount, setVisibleCount] = useState(9);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Try fetching live active status from backend
    const fetchLiveData = async () => {
        setIsRefreshing(true);
        try {
            if (user?.token) {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                const response = await axios.get(`${baseUrl}/admin/active-statuses`, config);
                
                if (Array.isArray(response.data) && response.data.length > 0) {
                    const fetchedMap = new Map(response.data.map(item => [item.userId || item._id, item]));
                    
                    const updated = MOCK_EMPLOYEES.map(emp => {
                        const match = fetchedMap.get(emp.id);
                        if (match) {
                            return {
                                ...emp,
                                status: match.status || emp.status,
                                inTime: match.checkInTime || emp.inTime,
                                breakMinutes: match.breakMinutes || emp.breakMinutes,
                                isExceeded: (match.breakMinutes || emp.breakMinutes) > 75
                            };
                        }
                        return emp;
                    });
                    setEmployees(updated);
                }
            }
        } catch (err) {
            console.log('Using baseline mockup data for overview demo');
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

    useEffect(() => {
        fetchLiveData();
    }, []);

    // Filter Logic
    const filteredEmployees = employees.filter((emp) => {
        // Level filter
        if (selectedLevel !== 'All Levels' && emp.level !== selectedLevel) return false;
        // Showroom filter
        if (selectedShowroom !== 'All Showrooms' && emp.showroom !== selectedShowroom) return false;
        // Status tab filter
        if (statusTab !== 'All') {
            if (statusTab === 'Working' && emp.status !== 'Working') return false;
            if (statusTab === 'On Break' && !emp.status.includes('Break')) return false;
            if (statusTab === 'In Meeting' && !emp.status.includes('Meeting')) return false;
        }
        // Search query
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

    // Stats calculations
    const totalCount = 100; // Match mockup UI numbers
    const workingCount = employees.filter((e) => e.status === 'Working').length + 75;
    const breakCount = employees.filter((e) => e.status.includes('Break')).length + 4;
    const meetingCount = employees.filter((e) => e.status.includes('Meeting')).length + 3;

    // Break area filtered lists
    const teaBreakList = employees.filter((e) => e.status === 'Tea Break');
    const lunchBreakList = employees.filter((e) => e.status === 'Lunch Break');

    // Helper function for status pill badges
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
        if (emp.status.includes('Meeting')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    {emp.status}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {emp.status}
            </span>
        );
    };

    // CSV Export
    const handleExport = () => {
        const headers = ['Employee ID,Name,Role,Level,Showroom,Status,In Time,Break Duration\n'];
        const rows = filteredEmployees.map(
            (e) => `${e.id},"${e.name}",${e.role},${e.level},${e.showroom},${e.status},${e.inTime},${e.breakTime}`
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
                        onClick={fetchLiveData}
                        disabled={isRefreshing}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors active:scale-95 shadow-xs"
                        title="Refresh live statuses"
                    >
                        <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
                    </button>

                    {/* Filter Button */}
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors shadow-xs">
                        <Filter size={14} />
                        Filter
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
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">All selected</p>
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
                        <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">83% of total</p>
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
                        <p className="text-[10px] font-semibold text-amber-600 mt-0.5">9% of total</p>
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
                        <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">6% of total</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                        <Video size={22} />
                    </div>
                </div>

                {/* 5. Total Break Time */}
                <div className="bg-red-50/40 p-5 rounded-2xl border border-red-200/70 shadow-xs flex items-center justify-between relative overflow-hidden">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-black text-slate-900 tracking-tight">1h 15m</p>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Total Break Time</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">(Tea + Lunch)</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-red-100 border border-red-200 text-red-600 flex items-center justify-center shadow-xs">
                            <Clock size={20} />
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase tracking-wider shadow-xs animate-pulse">
                            <AlertTriangle size={10} />
                            Exceeded
                        </span>
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
                                <span className="text-lg font-black text-slate-900">8</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Management</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50">
                                <span className="text-emerald-700">6 Working</span>
                                <span className="text-amber-700">1 On Break</span>
                                <span className="text-indigo-700">1 In Meeting</span>
                            </div>
                        </div>

                        {/* Level 2 Card */}
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                    <span className="text-xs font-bold text-slate-800">Level 2</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">32</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Operations</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50">
                                <span className="text-emerald-700">26 Working</span>
                                <span className="text-amber-700">3 On Break</span>
                                <span className="text-indigo-700">3 In Meeting</span>
                            </div>
                        </div>

                        {/* Level 3 Card */}
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-pink-600" />
                                    <span className="text-xs font-bold text-slate-800">Level 3</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">40</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Support</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50">
                                <span className="text-emerald-700">32 Working</span>
                                <span className="text-amber-700">5 On Break</span>
                                <span className="text-indigo-700">3 In Meeting</span>
                            </div>
                        </div>

                        {/* Level 4 Card */}
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <span className="text-xs font-bold text-slate-800">Level 4</span>
                                </div>
                                <span className="text-lg font-black text-slate-900">20</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">Interns & Field</p>
                            <div className="flex items-center justify-between text-[11px] font-semibold pt-1 border-t border-slate-200/50">
                                <span className="text-emerald-700">19 Working</span>
                                <span className="text-amber-700">0 On Break</span>
                                <span className="text-indigo-700">1 In Meeting</span>
                            </div>
                        </div>

                        <button className="w-full text-center py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center justify-center gap-1 border border-indigo-100 rounded-xl bg-indigo-50/50 hover:bg-indigo-50">
                            View all levels <ChevronRight size={14} />
                        </button>
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
                                    100 Employees
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

                        {/* Employee Cards Grid */}
                        {viewMode === 'grid' ? (
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
                                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{emp.id}</p>
                                                </div>
                                            </div>
                                            <button className="text-slate-400 hover:text-slate-600 p-1">
                                                <MoreVertical size={16} />
                                            </button>
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
                                                <p className="text-[10px] text-slate-400">{emp.id} • {emp.level} • {emp.showroom}</p>
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
                                    onClick={() => setVisibleCount((prev) => prev + 6)}
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
                            {(breakTab === 'Tea Break' ? teaBreakList : lunchBreakList).map((emp) => (
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
                            ))}
                        </div>

                        <button className="w-full text-center py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center gap-1 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100">
                            View all on break <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Break Summary Ring Chart Panel */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Break Summary</h2>

                        {/* Interactive SVG Donut Ring */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative w-28 h-28 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    {/* Background Track */}
                                    <path
                                        className="text-slate-100"
                                        strokeWidth="3.8"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    {/* Tea Break Segment (40%) */}
                                    <path
                                        className="text-amber-500"
                                        strokeDasharray="40, 100"
                                        strokeWidth="3.8"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    {/* Lunch Break Segment (60%) */}
                                    <path
                                        className="text-emerald-500"
                                        strokeDasharray="60, 100"
                                        strokeDashoffset="-40"
                                        strokeWidth="3.8"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] text-slate-400 font-semibold">Total Break</span>
                                    <span className="text-sm font-black text-slate-900">1h 15m</span>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Tea Break
                                    </span>
                                    <span className="font-extrabold text-slate-800">30m (40%)</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Lunch Break
                                    </span>
                                    <span className="font-extrabold text-slate-800">45m (60%)</span>
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
                        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-1">
                            View Policy Details <ChevronRight size={14} />
                        </button>
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            All break updates in real-time
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OverviewDashboard;
