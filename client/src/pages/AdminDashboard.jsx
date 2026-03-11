import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAllEmployees, getPendingRequests, getDailyAttendance, getDailyWorkLogs, reset } from '../features/admin/adminSlice';
import StatCard from '../components/StatCard';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ClipboardList, BarChart2, Calendar, Building2, FileText, CheckCircle, UserX, Clock, Home, Phone, MapPin, IndianRupee } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';
import { formatDate } from '../utils/dateUtils';

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { employees, pendingRequests, dailyAttendance, isLoading } = useSelector((state) => state.admin);
    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        if (user && user.role === 'ANALYZER') {
            navigate('/admin/call-reports', { replace: true });
        }
    }, [user, navigate]);

    const [searchTerm, setSearchTerm] = useState('');
    const [siteVisits, setSiteVisits] = useState([]);
    const [showroomHistory, setShowroomHistory] = useState([]);
    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
    const [financeSummary, setFinanceSummary] = useState({ currentCash: 0, spent: 0, balance: 0, pending: 0 });
    const [activeSlice, setActiveSlice] = useState(null);

    const isCOO = (user) => {
        if (!user) return false;
        if (['ADMIN', 'ACCOUNTS_MANAGER'].includes(user.role)) return true;
        if (user.role === 'BUSINESS_HEAD' && (user.designation === 'COO' || user.designation === 'Chief Operational Officer')) return true;
        return false;
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.token) return;
            setIsReportsLoading(true);
            try {
                const today = new Date().toISOString().split('T')[0];
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/requests/history?date=${today}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setSiteVisits((response.data.siteVisits || []).filter(v => ['APPROVED', 'PENDING'].includes(v.status)));
                setShowroomHistory((response.data.showroomVisits || []).filter(v => ['APPROVED', 'PENDING'].includes(v.status)));
            } catch (error) {
                console.error("Dashboard list fetch failed:", error);
            } finally {
                setIsReportsLoading(false);
            }
        };

        const fetchFinanceData = async () => {
             if (!user?.token || !isCOO(user)) return;
             try {
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/finance/summary`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setFinanceSummary(response.data);
             } catch (error) {
                 console.error("Finance fetch failed:", error);
             }
        }
        
        fetchDashboardData();
        fetchFinanceData();
    }, [user?.token, user?.role, user?.designation]); // Add user?.designation to ensure re-fetch if it changes

    useEffect(() => {
        dispatch(getAllEmployees());
        dispatch(getDailyAttendance(selectedDate));
        dispatch(getDailyWorkLogs({ date: selectedDate }));
        dispatch(getPendingRequests(selectedDate));

        return () => { dispatch(reset()); };
    }, [dispatch, selectedDate]);

    // IDs of employees to include (exclude admin, business head, HR, AE manager)
    const includedEmployeeIds = employees
        .filter(emp => !['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'].includes(emp.role))
        .map(emp => emp.id);
    // Count present and absent only for included employees
    const todayPresentCount = dailyAttendance.filter(att => att.status === 'PRESENT' && includedEmployeeIds.includes(att.user.id)).length;
    const todayAbsentCount = dailyAttendance.filter(att => att.status === 'ABSENT' && includedEmployeeIds.includes(att.user.id)).length;

    const actualEmployeeCount = includedEmployeeIds.length;

    const pendingLeavesCount = pendingRequests.leaves?.length || 0;
    const pendingPermissionsCount = pendingRequests.permissions?.length || 0;
    const pendingWfhCount = pendingRequests.wfh?.length || 0;
    const totalPendingCount = pendingLeavesCount + pendingPermissionsCount;

    const onDownload = async (type) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/export/${type}`, config);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${type}_export_${formatDate(new Date()).replace(/\//g, '-')}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to download export. Please try again.");
        }
    };

    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
    const dayLabel = `${formatDate(now)} · ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]}`;

    const SkeletonCard = () => (
        <div className="bg-white/20 rounded-3xl h-36 animate-pulse" />
    );

    const quickLinks = [
        {
            to: '/admin/employees',
            icon: <Users size={24} />,
            label: user?.role === 'ADMIN' || user?.role === 'AE_MANAGER' ? 'Manage Employees' : 'View Employees',
            desc: user?.role === 'ADMIN' || user?.role === 'AE_MANAGER' ? 'Add, edit, or block team members.' : 'Browse team profiles and details.',
            color: 'from-blue-500 to-indigo-600',
            roles: ['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'],
        },
        {
            to: '/admin/attendance',
            icon: <Calendar size={24} />,
            label: 'Attendance Report',
            desc: "View today's presence, breaks & working hours.",
            color: 'from-teal-500 to-emerald-600',
            roles: ['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'],
        },
        {
            to: '/admin/approvals',
            icon: <ClipboardList size={24} />,
            label: 'Manage Approvals',
            desc: 'Review and action leave & permission requests.',
            color: 'from-orange-500 to-red-500',
            roles: ['BUSINESS_HEAD', 'HR', 'AE_MANAGER'],
        },
        {
            to: '/admin/visit-requests',
            icon: <Building2 size={24} />,
            label: 'Visit Requests',
            desc: 'Site inspections and showroom movements.',
            color: 'from-green-500 to-teal-600',
            roles: ['BUSINESS_HEAD', 'HR', 'AE_MANAGER', 'ADMIN'],
        },
        {
            to: '/admin/wfh',
            icon: <Home size={24} />,
            label: 'WFH Management',
            desc: 'Review and approve work-from-home requests.',
            color: 'from-violet-500 to-purple-600',
            roles: ['BUSINESS_HEAD', 'HR', 'AE_MANAGER', 'ADMIN'],
        },
        {
            to: '/admin/worklogs',
            icon: <FileText size={24} />,
            label: 'Work Reports',
            desc: 'Monitor daily work submissions from all employees.',
            color: 'from-slate-500 to-slate-700',
            roles: ['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'],
        },
        {
            to: '/admin/call-reports',
            icon: <Phone size={24} />,
            label: 'Call Analytics',
            desc: 'Monitor CRE call performance and metrics.',
            color: 'from-blue-600 to-cyan-500',
            roles: ['ADMIN', 'BUSINESS_HEAD', 'HR'],
        },
    ].filter(link => link.roles.includes(user?.role));

    return (
        <div className="space-y-8">
            {/* Hero Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 rounded-3xl p-8 shadow-2xl"
            >
                {/* Background blobs */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <p className="text-indigo-300 text-sm font-bold uppercase tracking-widest mb-1">{greeting} 👋</p>
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-1">{user?.name}</h2>
                        <p className="text-slate-400 text-sm">{dayLabel}</p>
                        <div className="mt-3 flex items-center gap-2">
                            <span className="bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs px-3 py-1 rounded-full font-bold">
                                {user?.role === 'BUSINESS_HEAD' ? user?.designation : user?.role?.replace('_', ' ')}
                            </span>
                            <span className="text-slate-500 text-xs">• People Desk Admin</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {['ADMIN', 'AE_MANAGER'].includes(user?.role) && (
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/admin/employees')}
                                className="bg-white text-slate-800 px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 text-sm"
                            >
                                <Users size={16} /> Add Employee
                            </motion.button>
                        )}
                        {user?.role === 'HR' && (
                            <>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => onDownload('worklogs')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
                                    📥 Export Logs
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => onDownload('attendance')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">
                                    📊 Export Attendance
                                </motion.button>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Today's Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
                    ) : (
                        <>
                            {['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'].includes(user?.role) && (
                                <>
                                    <StatCard
                                        title="Total Employees"
                                        value={actualEmployeeCount}
                                        icon="👥"
                                        color="blue"
                                        onClick={() => navigate('/admin/employees')}
                                    />
                                    <StatCard
                                        title="Today Present"
                                        value={todayPresentCount}
                                        icon="✅"
                                        color="teal"
                                        onClick={() => navigate('/admin/attendance', { state: { filter: 'PRESENT' } })}
                                    />
                                    <StatCard
                                        title="Today Absent"
                                        value={todayAbsentCount}
                                        icon="🚫"
                                        color="orange"
                                        onClick={() => navigate('/admin/attendance', { state: { filter: 'ABSENT' } })}
                                    />
                                </>
                            )}

                            {user?.role !== 'ADMIN' && (
                                <StatCard
                                    title="Pending Requests"
                                    value={totalPendingCount}
                                    icon="⏳"
                                    color="amber"
                                    onClick={() => navigate('/admin/approvals')}
                                />
                            )}

                            {user?.role === 'ADMIN' && (
                                <>
                                    <StatCard
                                        title="Active Users"
                                        value={employees.filter(e => e.status === 'ACTIVE').length}
                                        icon="🟢"
                                        color="green"
                                        onClick={() => navigate('/admin/employees')}
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Attendance Snapshot + Approval Inbox */}
            {['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'].includes(user?.role) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-5"
                >
                    {/* Left: Attendance Snapshot */}
                    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${!isCOO(user) ? 'lg:col-span-2' : ''}`}>
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <CheckCircle size={15} className="text-teal-500" /> Today's Attendance
                            </h3>
                            <Link to="/admin/attendance" className="text-xs font-bold text-blue-500 hover:underline">Full Report →</Link>
                        </div>
                        <div className="p-5 space-y-6">
                            {/* Attendance Progress Bar */}
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance Status</p>
                                        <p className="text-3xl font-black text-slate-800">
                                            {todayPresentCount}<span className="text-slate-300 text-lg font-bold mx-1">/</span>{actualEmployeeCount}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-black text-slate-400 uppercase tracking-tighter block mb-1">Success Rate</span>
                                        <span className="text-2xl font-black text-emerald-500">
                                            {actualEmployeeCount > 0 ? Math.round((todayPresentCount / actualEmployeeCount) * 100) : 0}%
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="h-4 bg-slate-200 rounded-full overflow-hidden p-[2px] flex gap-[2px]">
                                    {/* Present Segment */}
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${actualEmployeeCount > 0 ? (todayPresentCount / actualEmployeeCount) * 100 : 0}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-l-full relative overflow-hidden"
                                    >
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        />
                                    </motion.div>
                                    
                                    {/* Absent Segment */}
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${actualEmployeeCount > 0 ? (todayAbsentCount / actualEmployeeCount) * 100 : 0}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                                        className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-r-full relative overflow-hidden"
                                    >
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                            animate={{ x: ['-100%', '200%'] }}
                                            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                        />
                                    </motion.div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Present: {todayPresentCount}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Absent: {todayAbsentCount}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Absent list - This is the "absent showing as list" the user mentioned keeping as a reference style */}
                            {todayAbsentCount > 0 ? (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absent Today</p>
                                        <span className="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 uppercase">
                                            {todayAbsentCount} Total
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                        {dailyAttendance.filter(a => a.status === 'ABSENT').map(att => (
                                            <div key={att.user.id} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 hover:bg-white hover:shadow-sm transition-all duration-300">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 text-xs font-black flex-shrink-0">
                                                    {att.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate leading-none">{att.user.name}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{att.user.designation || 'Employee'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-10 text-center">
                                    <p className="text-[10px] text-teal-500 font-black uppercase tracking-[0.2em]">Full Attendance Reached</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Expense Hub Pie Chart */}
                    {isCOO(user) && (
                        <div className="bg-gradient-to-b from-white to-slate-50/50 rounded-3xl border border-slate-200/60 shadow-lg shadow-slate-200/20 overflow-hidden flex flex-col h-full relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                            
                            <div className="px-6 py-5 border-b border-slate-100/80 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10">
                                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2.5">
                                    <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                                        <IndianRupee size={16} strokeWidth={2.5} />
                                    </div>
                                    Financial Overview
                                </h3>
                                <Link to="/admin/vouchers" className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-full transition-all flex items-center gap-1">Manage →</Link>
                            </div>
                            <div className="p-6 flex-grow flex flex-col items-center justify-center relative z-10 w-full">
                                {financeSummary.currentCash === 0 && financeSummary.spent === 0 && financeSummary.pending === 0 ? (
                                    <div className="text-center text-slate-400">
                                        <IndianRupee size={40} className="mx-auto mb-3 opacity-20" />
                                        <p className="text-xs font-bold uppercase tracking-widest">No Financial Data</p>
                                    </div>
                                ) : (
                                    (() => {
                                        // Corrected math: since currentCash in DB is already subtracted from when COO approves (spent),
                                        // we only need to deduct "Pending" from "currentCash" to find the "Available" for NEW vouchers.
                                        const availableCash = Math.max(0, (financeSummary?.currentCash || 0) - (financeSummary?.pending || 0));
                                        const totalSpent = financeSummary?.spent || 0;
                                        const inPipeline = financeSummary?.pending || 0;
                                        
                                        const pieData = [
                                            { name: 'Available Balance', value: availableCash, fill: 'url(#gradientCash)' },
                                            { name: 'In Pipeline', value: inPipeline, fill: 'url(#gradientPending)' },
                                            { name: 'Total Spent', value: totalSpent, fill: 'url(#gradientSpent)' }
                                        ].filter(item => item.value > 0);

                                        const displayTitle = activeSlice !== null ? pieData[activeSlice].name : 'Available Balance';
                                        const displayValue = activeSlice !== null ? pieData[activeSlice].value : availableCash;

                                        return (
                                            <>
                                                <div className="h-[460px] min-h-[460px] w-full relative">
                                                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-2 flex flex-col items-center justify-center w-[190px] h-[190px] bg-white rounded-full shadow-[inset_0_4px_15px_rgba(0,0,0,0.06)] border border-slate-50 z-0 transition-all duration-300">
                                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none mb-3 transition-all">{displayTitle}</p>
                                                        <p className="text-4xl font-black text-slate-800 tracking-tighter transition-all">₹{displayValue.toLocaleString()}</p>
                                                    </div>
                                                    
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <defs>
                                                                <linearGradient id="gradientCash" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                                                                    <stop offset="100%" stopColor="#059669" stopOpacity={1}/>
                                                                </linearGradient>
                                                                <linearGradient id="gradientSpent" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#fb7185" stopOpacity={1}/>
                                                                    <stop offset="100%" stopColor="#e11d48" stopOpacity={1}/>
                                                                </linearGradient>
                                                                <linearGradient id="gradientPending" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#fcd34d" stopOpacity={1}/>
                                                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={1}/>
                                                                </linearGradient>
                                                                <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                                                                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
                                                                </filter>
                                                            </defs>
                                                            <Pie
                                                                data={pieData}
                                                                cx="50%"
                                                                cy="45%"
                                                                innerRadius={110}
                                                                outerRadius={145}
                                                                cornerRadius={12}
                                                                paddingAngle={6}
                                                                dataKey="value"
                                                                stroke="none"
                                                                style={{ filter: 'url(#dropShadow)' }}
                                                                animationBegin={200}
                                                                animationDuration={1200}
                                                                onMouseEnter={(_, index) => setActiveSlice(index)}
                                                                onMouseLeave={() => setActiveSlice(null)}
                                                            >
                                                                {pieData.map((entry, index) => (
                                                                    <Cell 
                                                                        key={`cell-${index}`} 
                                                                        fill={entry.fill} 
                                                                        className="transition-all duration-300 outline-none"
                                                                        style={{ 
                                                                            opacity: activeSlice !== null && activeSlice !== index ? 0.4 : 1,
                                                                            transform: activeSlice === index ? 'scale(1.05)' : 'scale(1)',
                                                                            transformOrigin: 'center center'
                                                                        }}
                                                                    />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip 
                                                                formatter={(value) => [`₹${value.toLocaleString()}`, '']}
                                                                contentStyle={{ borderRadius: '16px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 18px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                                                                itemStyle={{ color: '#0f172a', fontWeight: '900', fontSize: '14px', paddingTop: '4px' }}
                                                                labelStyle={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}
                                                            />
                                                            <Legend 
                                                                verticalAlign="bottom" 
                                                                height={36} 
                                                                iconType="circle" 
                                                                wrapperStyle={{ fontSize: '11px', fontWeight: '800', color: '#475569', paddingTop: '20px' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    )}

                    {/* Middle: Visit Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:col-span-2">
                        {/* Site Visits List */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <Building2 size={15} className="text-indigo-500" /> Today's Site Visits
                                </h3>
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 uppercase">
                                    {siteVisits.length} Active
                                </span>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                {siteVisits.length > 0 ? siteVisits.map((visit, idx) => (
                                    <div key={idx} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-xs font-bold text-slate-800">{visit.user?.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{visit.startTime} - {visit.endTime}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1">
                                            <MapPin size={10} /> {visit.projectName || visit.location}
                                        </p>
                                    </div>
                                )) : (
                                    <div className="p-10 text-center">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No Site Visits</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Showroom History List */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <Home size={15} className="text-emerald-500" /> Showroom History
                                </h3>
                                <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 uppercase">
                                    Today
                                </span>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                {showroomHistory.length > 0 ? showroomHistory.map((visit, idx) => (
                                    <div key={idx} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className="text-xs font-bold text-slate-800">{visit.user?.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {new Date(visit.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-semibold truncate flex items-center gap-1">
                                            <Building2 size={10} /> {visit.showroomName}
                                        </p>
                                    </div>
                                )) : (
                                    <div className="p-10 text-center">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No Showroom History</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </motion.div>
            )}

            {/* Quick Links */}
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Navigation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {quickLinks.map((link, i) => (
                        <motion.div
                            key={link.to}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                        >
                            <Link to={link.to} className="group flex flex-col gap-3 bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                    {link.icon}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{link.label}</h4>
                                    <p className="text-slate-400 text-xs mt-0.5 leading-snug">{link.desc}</p>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
