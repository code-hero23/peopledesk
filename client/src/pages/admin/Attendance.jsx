import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getDailyAttendance, reset } from '../../features/admin/adminSlice';
import { 
    Calendar, Smartphone, Monitor, Coffee, Users, Clock, Zap, Utensils, 
    Upload, Mail, Search, Sparkles, CheckCircle2, XCircle, FileSpreadsheet, 
    Download, RefreshCw, UserCheck, UserX, Activity, CalendarClock, ShieldCheck
} from 'lucide-react';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { formatTime } from '../../utils/dateUtils';

const Attendance = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { dailyAttendance, isLoading, isError, message } = useSelector((state) => state.admin);
    const location = useLocation();
    
    // Status Filter from Dashboard
    const [statusFilter, setStatusFilter] = useState(location.state?.filter || null);

    // Live Status State
    const [activeStatuses, setActiveStatuses] = useState([]);
    const [liveTime, setLiveTime] = useState(new Date());
    const [isSendingReport, setIsSendingReport] = useState(false);

    // Helper to format minutes into readable string
    const formatDuration = (totalMinutes) => {
        if (!totalMinutes || totalMinutes <= 0) return '-';
        const h = Math.floor(totalMinutes / 60);
        const m = Math.round(totalMinutes % 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const fetchActiveStatuses = async () => {
        if (!user || !user.token) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/admin/active-statuses`, config);
            console.log('Active Statuses:', response.data);
            if (Array.isArray(response.data)) {
                setActiveStatuses(response.data);
                console.log('ID Comparison:', {
                    activeUserIds: response.data.map(s => s.userId),
                    recordUserIds: dailyAttendance?.map(r => r.user.id)
                });
            }
        } catch (error) {
            console.error('Failed to fetch active statuses:', error);
        }
    };

    // Default to today's date in LOCAL time
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [cycleRange, setCycleRange] = useState({ startDate: '', endDate: '' });

    const handleCycleChange = (range) => {
        setCycleRange(range);
    };

    // Filter attendance records based on search and high-level status filter
    const filteredAttendance = dailyAttendance.filter((record) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
            record.user.name.toLowerCase().includes(term) ||
            record.user.email.toLowerCase().includes(term)
        );
        
        const matchesStatus = statusFilter ? record.status === statusFilter : true;
        
        return matchesSearch && matchesStatus;
    });

    useEffect(() => {
        if (isError) {
            console.error(message);
        }
    }, [isError, message]);

    useEffect(() => {
        if (user && user.token) {
            dispatch(getDailyAttendance(startDate));
            fetchActiveStatuses();

            const pollInterval = setInterval(fetchActiveStatuses, 30000);
            const timeInterval = setInterval(() => setLiveTime(new Date()), 1000);

            return () => {
                dispatch(reset());
                clearInterval(pollInterval);
                clearInterval(timeInterval);
            };
        }
    }, [user, dispatch, startDate]);

    const getDuration = (startTime) => {
        const start = new Date(startTime);
        const diff = Math.floor((liveTime - start) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        return `${mins}m ${secs}s`;
    };

    const getStatusStyles = (type) => {
        switch (type) {
            case 'TEA': return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-500', icon: Coffee, label: 'Tea Break' };
            case 'LUNCH': return { bg: 'bg-orange-500/10 border-orange-500/30 text-orange-500', icon: Utensils, label: 'Lunch Break' };
            case 'CLIENT_MEETING': return { bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: Users, label: 'Client Meeting' };
            case 'BH_MEETING': return { bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400', icon: Zap, label: 'BH Meeting' };
            default: return { bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400', icon: Clock, label: 'On Break' };
        }
    };

    const onDownload = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            let apiUrl = `${baseUrl}/export/attendance?startDate=${startDate}&endDate=${endDate}`;

            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
            }
            if (statusFilter) {
                apiUrl += `&status=${statusFilter}`;
            }
            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_report_${startDate}_to_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to download export. Please try again.");
        }
    };

    const onDownloadMonthly = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob',
            };

            const dateObj = new Date(cycleRange.endDate);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            let apiUrl = `${baseUrl}/export/attendance?month=${month}&year=${year}`;

            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
            }
            if (statusFilter) {
                apiUrl += `&status=${statusFilter}`;
            }
            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            const monthName = dateObj.toLocaleString('default', { month: 'short' });

            const prevMonthDate = new Date(year, month - 2, 1);
            const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'short' });

            link.setAttribute('download', `payroll_${prevMonthName}26_to_${monthName}25_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Monthly export failed:", error);
            alert("Failed to download monthly report. Please try again.");
        }
    };

    const onGeneratePayrollReport = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob',
            };

            const dateObj = new Date(cycleRange.endDate);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            let apiUrl = `${baseUrl}/payroll/report?month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            const monthName = dateObj.toLocaleString('default', { month: 'short' });

            const prevMonthDate = new Date(year, month - 2, 1);
            const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'short' });

            link.setAttribute('download', `PAYROLL_SALARY_${prevMonthName}26_to_${monthName}25_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Payroll report failed:", error);
            alert("Failed to generate payroll report. Please try again.");
        }
    };

    const handleBiometricUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                    'Content-Type': 'multipart/form-data',
                },
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.post(`${baseUrl}/admin/attendance/biometric/import`, formData, config);
            const { importedCount, unmatchedEmployees, unmatchedNames } = response.data;
            let alertMsg = `Success! Imported ${importedCount} records.`;
            if (unmatchedEmployees && unmatchedEmployees.length > 0) {
                alertMsg += `\n\nMissing Employees in Database:\n` + unmatchedEmployees.map(emp => `- ${emp}`).join('\n');
            } else if (unmatchedNames && unmatchedNames.length > 0) {
                alertMsg += `\n\nUnmatched Details:\n` + unmatchedNames.slice(0, 10).join('\n');
                if (unmatchedNames.length > 10) {
                    alertMsg += `\n...and ${unmatchedNames.length - 10} more rows.`;
                }
            }
            alert(alertMsg);
            dispatch(getDailyAttendance(startDate));
        } catch (error) {
            console.error("Biometric import failed:", error);
            alert(error.response?.data?.message || "Failed to import biometric data.");
        }
        e.target.value = '';
    };
    
    const onSendHRSummary = async () => {
        try {
            setIsSendingReport(true);
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.post(`${baseUrl}/admin/trigger-hr-report`, { date: startDate }, config);
            
            alert(response.data.message || "Summary report sent to HR successfully!");
        } catch (error) {
            console.error("Failed to send HR summary:", error);
            alert(error.response?.data?.message || "Failed to send summary report to HR.");
        } finally {
            setIsSendingReport(false);
        }
    };

    // Calculate Summary Counts
    const presentCount = dailyAttendance.filter(r => r.status === 'PRESENT').length;
    const absentCount = dailyAttendance.filter(r => r.status === 'ABSENT').length;
    const leaveCount = dailyAttendance.filter(r => r.status === 'LEAVE').length;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
            {/* Executive Header Banner */}
            <header className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] text-white shadow-2xl border border-slate-800/80 overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25 ring-4 ring-white/10">
                                <CalendarClock className="text-white" size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">Daily Attendance</h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                                        <Sparkles size={10} className="animate-pulse" /> LIVE MONITOR
                                    </span>
                                </div>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em] mt-0.5">
                                    Employee Check-ins, Break Logs & Absence Matrix
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-auto">
                        <MonthCycleSelector onCycleChange={handleCycleChange} />
                    </div>
                </div>
            </header>

            {/* Quick Actions & Search Control Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5">
                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={onDownload}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 text-xs font-bold"
                        title="Export Daily Attendance to Excel"
                    >
                        <Download size={15} />
                        <span>Export Today</span>
                    </button>

                    <button
                        onClick={onDownloadMonthly}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all border border-slate-700 shadow-md active:scale-95 flex items-center gap-2 text-xs font-bold"
                        title="Export Selected Month Attendance to Excel"
                    >
                        <Calendar size={15} className="text-blue-400" />
                        <span>Export Monthly</span>
                    </button>

                    <label className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <Upload size={15} />
                        <span>Import Biometric</span>
                        <input
                            type="file"
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleBiometricUpload}
                        />
                    </label>

                    <button
                        onClick={onGeneratePayrollReport}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 text-xs font-bold"
                        title="Generate Monthly Payroll Salary Excel Report"
                    >
                        <Zap size={15} />
                        <span>Payroll Report</span>
                    </button>

                    <button
                        onClick={onSendHRSummary}
                        disabled={isSendingReport}
                        className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-black text-white rounded-2xl transition-all border border-slate-700 shadow-md active:scale-95 flex items-center gap-2 text-xs font-bold disabled:opacity-50"
                        title="Email Attendance Summary Report to HR"
                    >
                        <Mail size={15} className="text-indigo-400" />
                        <span>{isSendingReport ? 'Transmitting...' : 'Send HR Summary'}</span>
                    </button>
                </div>

                {/* Filter Controls Bar */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Search Input */}
                        <div className="relative group w-full sm:w-64">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search employee name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 ring-blue-500/30 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all"
                            />
                        </div>

                        {/* Date Range Picker Pill */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 px-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner text-xs font-bold">
                            <Calendar size={15} className="text-blue-500 shrink-0" />
                            <span className="text-[10px] font-black text-slate-400 uppercase">From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                            />
                            <span className="text-slate-400 font-black text-[9px] uppercase px-1">TO</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                            />
                        </div>

                        {/* Status Filter Buttons */}
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">Status:</span>
                            {[
                                { value: null, label: `All (${dailyAttendance.length})` },
                                { value: 'PRESENT', label: `Present (${presentCount})`, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                                { value: 'ABSENT', label: `Absent (${absentCount})`, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
                                { value: 'LEAVE', label: `Leave (${leaveCount})`, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
                            ].map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => setStatusFilter(opt.value)}
                                    className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase transition-all ${
                                        statusFilter === opt.value
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {statusFilter && (
                        <button
                            onClick={() => setStatusFilter(null)}
                            className="text-[10px] font-black text-blue-500 hover:text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/80 transition-all shrink-0"
                        >
                            <Zap size={12} /> Clear Filter
                        </button>
                    )}
                </div>
            </div>

            {/* Live Break Status Panel */}
            {activeStatuses.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                            </span>
                            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">
                                Active Live Status Panel ({activeStatuses.length} On Break / Meeting)
                            </h3>
                        </div>
                        <button 
                            onClick={fetchActiveStatuses}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
                            title="Refresh Active Statuses"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    <div className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <AnimatePresence mode='popLayout'>
                                {activeStatuses.map((status) => {
                                    const styles = getStatusStyles(status.breakType);
                                    const Icon = styles.icon;
                                    return (
                                        <motion.div
                                            key={`live-${status.id}`}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className={`${styles.bg} border p-4 rounded-2xl flex items-start gap-3 transition-all hover:scale-[1.02] shadow-sm`}
                                        >
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 shadow-sm shrink-0">
                                                <Icon size={18} className={styles.text} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-xs font-black text-slate-800 dark:text-white truncate">{status.userName}</p>
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-white dark:bg-slate-950 ${styles.text} border border-current/20`}>
                                                        {styles.label}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between text-[10px] font-black">
                                                    <span className="text-slate-400 font-bold uppercase">{status.designation}</span>
                                                    <span className={`${styles.text} font-mono font-bold`}>{getDuration(status.startTime)}</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Matrix Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/60 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-slate-800/60">
                            <tr>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">In Device</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Out Device</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Time In</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Time Out</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Tea Break</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Lunch Break</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Meetings</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Net Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest">
                                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500 opacity-60" />
                                        Loading Daily Attendance Matrix...
                                    </td>
                                </tr>
                            ) : filteredAttendance.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-12 text-slate-400 font-bold text-xs italic">
                                        No attendance records matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredAttendance.map((record) => (
                                    <tr key={`row-${record.user.id}`} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                        {/* Employee Info */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shrink-0">
                                                    {(record.user.name || "E").charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-800 dark:text-slate-100 text-xs">{record.user.name}</span>
                                                        {activeStatuses.some(s => s.userId === record.user.id) && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded border border-rose-200 dark:border-rose-800 text-[8px] font-black uppercase">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                                                                ON BREAK
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-medium">{record.user.email}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status Badge */}
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider shadow-md ${
                                                    record.status === 'PRESENT'
                                                        ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                                                        : record.status === 'LEAVE'
                                                        ? 'bg-amber-500 text-white shadow-amber-500/30 ring-2 ring-amber-500/30'
                                                        : 'bg-rose-600 text-white shadow-rose-600/30 ring-2 ring-rose-500/30'
                                                }`}>
                                                    {record.status}
                                                </span>
                                                {activeStatuses.find(s => s.userId === record.user.id) && (
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-white">
                                                        {getStatusStyles(activeStatuses.find(s => s.userId === record.user.id).breakType).label}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* In Device */}
                                        <td className="px-6 py-4 text-center">
                                            {record.deviceInfo ? (
                                                <div className="flex justify-center" title={record.deviceInfo}>
                                                    {(() => {
                                                        const info = record.deviceInfo.toLowerCase();
                                                        const isMobile = info.startsWith('mobile') ||
                                                            info.includes('android') ||
                                                            info.includes('iphone') ||
                                                            info.includes('ipad');

                                                        return isMobile ? (
                                                            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500">
                                                                <Smartphone size={14} />
                                                            </div>
                                                        ) : (
                                                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
                                                                <Monitor size={14} />
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700">-</span>
                                            )}
                                        </td>

                                        {/* Out Device */}
                                        <td className="px-6 py-4 text-center">
                                            {record.checkoutDeviceInfo ? (
                                                <div className="flex justify-center" title={record.checkoutDeviceInfo}>
                                                    {(() => {
                                                        const info = record.checkoutDeviceInfo.toLowerCase();
                                                        const isMobile = info.startsWith('mobile') ||
                                                            info.includes('android') ||
                                                            info.includes('iphone') ||
                                                            info.includes('ipad');

                                                        return isMobile ? (
                                                            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500">
                                                                <Smartphone size={14} />
                                                            </div>
                                                        ) : (
                                                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
                                                                <Monitor size={14} />
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700">-</span>
                                            )}
                                        </td>

                                        {/* Time In */}
                                        <td className="px-6 py-4 text-center font-mono text-slate-700 dark:text-slate-300 font-bold">
                                            {record.timeIn ? formatTime(record.timeIn) : '--:--'}
                                        </td>

                                        {/* Time Out */}
                                        <td className="px-6 py-4 text-center font-mono text-slate-700 dark:text-slate-300 font-bold">
                                            {record.timeOut ? formatTime(record.timeOut) : '--:--'}
                                        </td>

                                        {/* Tea Break */}
                                        <td className="px-6 py-4 text-center">
                                            {record.breakData?.tea > 0 ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-bold font-mono px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 rounded-md">
                                                    {formatDuration(record.breakData.tea)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700">-</span>
                                            )}
                                        </td>

                                        {/* Lunch Break */}
                                        <td className="px-6 py-4 text-center">
                                            {record.breakData?.lunch > 0 ? (
                                                <span className="text-orange-600 dark:text-orange-400 font-bold font-mono px-2 py-0.5 bg-orange-50 dark:bg-orange-950/40 rounded-md">
                                                    {formatDuration(record.breakData.lunch)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700">-</span>
                                            )}
                                        </td>

                                        {/* Meetings */}
                                        <td className="px-6 py-4 text-center">
                                            {record.breakData?.meetings > 0 ? (
                                                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded-md">
                                                    {formatDuration(record.breakData.meetings)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700">-</span>
                                            )}
                                        </td>

                                        {/* Net Hours */}
                                        <td className="px-6 py-4 text-center font-black text-slate-800 dark:text-white font-mono">
                                            {record.effectiveMinutes !== undefined ? formatDuration(record.effectiveMinutes) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Attendance;

