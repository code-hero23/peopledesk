import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAllEmployees, getPendingRequests, getDailyAttendance, getDailyWorkLogs, reset } from '../features/admin/adminSlice';
import StatCard from '../components/StatCard';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ClipboardList, BarChart2, Calendar, Building2, FileText, CheckCircle, UserX, Clock, Home, Phone, MapPin } from 'lucide-react';
import axios from 'axios';
import { formatDate } from '../utils/dateUtils';

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { employees, pendingRequests, dailyAttendance, isLoading } = useSelector((state) => state.admin);
    const { user } = useSelector((state) => state.auth);

    const [searchTerm, setSearchTerm] = useState('');
    const [siteVisits, setSiteVisits] = useState([]);
    const [showroomHistory, setShowroomHistory] = useState([]);
    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Added selectedDate state

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user?.token) return;
            setIsReportsLoading(true);
            try {
                const today = new Date().toISOString().split('T')[0];
                const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/requests/history?date=${today}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setSiteVisits((response.data.siteVisits || []).filter(v => v.status === 'APPROVED'));
                setShowroomHistory((response.data.showroomVisits || []).filter(v => v.status === 'APPROVED'));
            } catch (error) {
                console.error("Dashboard list fetch failed:", error);
            } finally {
                setIsReportsLoading(false);
            }
        };
        fetchDashboardData();
    }, [user?.token]); // Removed dispatch from dependencies as it's not used here

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
                                        onClick={() => navigate('/admin/attendance')}
                                        progress={actualEmployeeCount > 0 ? (todayPresentCount / actualEmployeeCount) * 100 : 0}
                                    />
                                    <StatCard
                                        title="Today Absent"
                                        value={todayAbsentCount}
                                        icon="🚫"
                                        color="orange"
                                        onClick={() => navigate('/admin/attendance')}
                                        progress={actualEmployeeCount > 0 ? (todayAbsentCount / actualEmployeeCount) * 100 : 0}
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
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <CheckCircle size={15} className="text-teal-500" /> Today's Attendance
                            </h3>
                            <Link to="/admin/attendance" className="text-xs font-bold text-blue-500 hover:underline">Full Report →</Link>
                        </div>
                        <div className="p-5 space-y-6">
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
