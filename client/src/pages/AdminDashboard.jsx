import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAllEmployees, getPendingRequests, getDailyAttendance, reset } from '../features/admin/adminSlice';
import StatCard from '../components/StatCard';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ClipboardList, BarChart2, Calendar, Building2, FileText, CheckCircle, UserX, Clock, Home } from 'lucide-react';
import axios from 'axios';
import { formatDate } from '../utils/dateUtils';

const AdminDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { employees, pendingRequests, dailyAttendance, isLoading } = useSelector((state) => state.admin);
    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(getAllEmployees());
        dispatch(getPendingRequests());
        dispatch(getDailyAttendance());

        return () => { dispatch(reset()); };
    }, [dispatch]);

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
            to: '/admin/analytics',
            icon: <BarChart2 size={24} />,
            label: 'Analytics',
            desc: 'Deep-dive into team performance metrics.',
            color: 'from-pink-500 to-rose-600',
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
                                {user?.role?.replace('_', ' ')}
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
                                    />
                                    <StatCard
                                        title="Today Absent"
                                        value={todayAbsentCount}
                                        icon="🚫"
                                        color="orange"
                                        onClick={() => navigate('/admin/attendance')}
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
                        <div className="p-5 space-y-4">
                            {/* Ratio bar */}
                            <div>
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                    <span className="text-teal-600">✅ Present — {todayPresentCount}</span>
                                    <span className="text-red-500">🚫 Absent — {todayAbsentCount}</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${actualEmployeeCount > 0 ? (todayPresentCount / actualEmployeeCount) * 100 : 0}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-l-full"
                                    />
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${actualEmployeeCount > 0 ? (todayAbsentCount / actualEmployeeCount) * 100 : 0}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                                        className="h-full bg-gradient-to-r from-red-400 to-rose-500"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1 text-right">{actualEmployeeCount} total employees</p>
                            </div>
                            {/* Absent list */}
                            {todayAbsentCount > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Absent Today</p>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {dailyAttendance.filter(a => a.status === 'ABSENT').map(att => (
                                            <div key={att.user.id} className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                                <div className="w-7 h-7 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-black flex-shrink-0">
                                                    {att.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate leading-none">{att.user.name}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{att.user.designation || '—'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {todayAbsentCount === 0 && !isLoading && (
                                <p className="text-sm text-teal-600 font-bold text-center py-2">🎉 Full attendance today!</p>
                            )}
                        </div>
                    </div>

                    {/* Right: Approval Inbox */}
                    {user?.role !== 'ADMIN' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <Clock size={15} className="text-amber-500" /> Approval Inbox
                                </h3>
                                <Link to="/admin/approvals" className="text-xs font-bold text-blue-500 hover:underline">Manage →</Link>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[
                                    { label: 'Leave Requests', count: pendingLeavesCount, icon: '🗓️', color: 'bg-orange-50 text-orange-700 border-orange-100', to: '/admin/approvals' },
                                    { label: 'Permissions', count: pendingPermissionsCount, icon: '🕑', color: 'bg-violet-50 text-violet-700 border-violet-100', to: '/admin/approvals' },
                                    { label: 'WFH Requests', count: pendingWfhCount, icon: '🏠', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', to: '/admin/wfh' },
                                ].map(item => (
                                    <Link key={item.label} to={item.to} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{item.icon}</span>
                                            <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                                        </div>
                                        <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${item.color} ${item.count === 0 ? 'opacity-40' : ''}`}>
                                            {item.count === 0 ? 'All clear' : `${item.count} pending`}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                            {totalPendingCount === 0 && pendingWfhCount === 0 && (
                                <p className="text-sm text-slate-400 italic text-center py-4">No pending requests 🎉</p>
                            )}
                        </div>
                    )}

                    {/* Right: Active Users breakdown for ADMIN role */}
                    {user?.role === 'ADMIN' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                    <Users size={15} className="text-blue-500" /> Employee Status Breakdown
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {[
                                    { label: 'Active Employees', count: employees.filter(e => e.status === 'ACTIVE').length, icon: '🟢', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', to: '/admin/employees' },
                                    { label: 'Blocked Employees', count: employees.filter(e => e.status === 'BLOCKED').length, icon: '🔴', color: 'bg-red-50 text-red-700 border-red-100', to: '/admin/employees' },
                                ].map(item => (
                                    <Link key={item.label} to={item.to} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{item.icon}</span>
                                            <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                                        </div>
                                        <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${item.color}`}>
                                            {item.count}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
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
