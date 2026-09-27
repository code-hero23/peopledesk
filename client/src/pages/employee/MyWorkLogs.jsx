import { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMyWorkLogs, reset } from '../../features/employee/employeeSlice';
import { Eye, Calendar, BarChart3, Download, Briefcase, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import WorkLogDetailModal from '../../components/admin/WorkLogDetailModal';

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const cleanStr = timeStr.trim();
    const match24 = cleanStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match24) {
        return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
    }
    const match12 = cleanStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (match12) {
        let h = parseInt(match12[1], 10);
        const m = parseInt(match12[2], 10);
        const isPM = match12[4].toUpperCase() === 'PM';
        if (h === 12) h = isPM ? 12 : 0;
        else if (isPM) h += 12;
        return h * 60 + m;
    }
    return null;
};

const getLogHours = (log) => {
    if (log.hours && parseFloat(log.hours) > 0) {
        return parseFloat(log.hours);
    }
    if (log.startTime && log.endTime) {
        const start = parseTimeToMinutes(log.startTime);
        const end = parseTimeToMinutes(log.endTime);
        if (start !== null && end !== null && end >= start) {
            return parseFloat(((end - start) / 60).toFixed(2));
        }
    }
    const reports = log.la_project_reports || log.fa_project_reports || log.ae_project_reports;
    if (reports) {
        try {
            const parsed = typeof reports === 'string' ? JSON.parse(reports) : reports;
            if (Array.isArray(parsed) && parsed.length > 0) {
                const sum = parsed.reduce((acc, r) => acc + (parseFloat(r.totalHours) || 0), 0);
                if (sum > 0) return parseFloat(sum.toFixed(2));
            }
        } catch (e) {}
    }
    return 0;
};

const MyWorkLogs = () => {
    const dispatch = useDispatch();
    const { workLogs, isLoading } = useSelector((state) => state.employee);
    const { user } = useSelector((state) => state.auth);

    // Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Helper to get the correct cycle month (26th shifts to next month)
    const getCycleMonth = () => {
        const today = new Date();
        const day = today.getDate();
        today.setDate(1); // Set to 1st of month first to prevent month overflow
        if (day >= 26) {
            today.setMonth(today.getMonth() + 1);
        }
        return today.toLocaleDateString('en-CA').slice(0, 7);
    };

    // Month Selection State (Defaults to current cycle month)
    const [selectedMonth, setSelectedMonth] = useState(getCycleMonth()); // "YYYY-MM"

    const [year, month] = selectedMonth.split('-').map(Number);
    const endDate = new Date(year, month - 1, 25).toLocaleDateString('en-CA');
    const startDate = new Date(year, month - 2, 26).toLocaleDateString('en-CA');

    useEffect(() => {
        dispatch(getMyWorkLogs({ 
            startDate, 
            endDate 
        }));
        
        return () => { dispatch(reset()); };
    }, [dispatch, startDate, endDate]);

    // Monthly Summary KPIs
    const monthlySummary = useMemo(() => {
        if (!workLogs || !Array.isArray(workLogs)) {
            return { totalDays: 0, closedDays: 0, inProgressDays: 0, totalHours: 0, avgHours: 0 };
        }

        let totalHours = 0;
        let closedDays = 0;
        let inProgressDays = 0;

        workLogs.forEach(log => {
            if (log.logStatus === 'CLOSED') closedDays++;
            else inProgressDays++;

            const h = getLogHours(log);
            totalHours += h;
        });

        const avgHours = closedDays > 0 ? (totalHours / closedDays).toFixed(1) : '0.0';

        return {
            totalDays: workLogs.length,
            closedDays,
            inProgressDays,
            totalHours: totalHours.toFixed(1),
            avgHours
        };
    }, [workLogs]);

    const onExportSummary = async () => {
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/task-summary?userId=${user.id}&month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `My_Task_Summary_${selectedMonth}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export summary.");
        }
    };

    const onExportProjectWise = async () => {
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/project-wise?userId=${user.id}&month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `My_Project_Reports_${selectedMonth}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Project report export failed:", error);
            alert("Failed to export project reports.");
        }
    };

    const onExportDetailedReport = async () => {
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/worklogs?userId=${user.id}&month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `My_Detailed_Logs_${selectedMonth}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Detailed export failed:", error);
            alert("Failed to export detailed logs.");
        }
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    const renderLogSummary = (log) => {
        if (log.ae_siteLocation) return `📍 ${log.ae_siteLocation}`;
        if (log.clientName) return `👤 ${log.clientName}`;
        if (log.projectName) return `🏢 ${log.projectName}`;
        if (log.process) return `⚡ ${log.process}`;
        return 'Daily Work Log';
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-7xl mx-auto">
            {/* Header with Cycle Selector & Export Buttons */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider px-3 py-0.5 rounded-full">
                            Employee Work History
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Monthly Work Reports</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Track your daily submitted hours and performance metrics.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                            <Calendar size={18} className="text-slate-400 group-focus-within:text-blue-500" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none border-none p-0 focus:ring-0"
                            />
                            {selectedMonth !== getCycleMonth() && (
                                <button 
                                    onClick={() => setSelectedMonth(getCycleMonth())}
                                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline ml-2"
                                >
                                    Current
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 ml-1 font-medium">
                            Cycle: <span className="text-slate-600 dark:text-slate-300 font-bold">{startDate}</span> → <span className="text-slate-600 dark:text-slate-300 font-bold">{endDate}</span>
                        </p>
                    </div>
                    
                    <button
                        onClick={onExportSummary}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/20 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                    >
                        <BarChart3 size={16} />
                        Summary
                    </button>

                    <button
                        onClick={onExportDetailedReport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                    >
                        <Download size={16} />
                        Detailed Logs
                    </button>

                    {['LA', 'FA'].some(role => user?.designation?.toUpperCase().includes(role)) && (
                        <button
                            onClick={onExportProjectWise}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-500/20 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
                        >
                            <Briefcase size={16} />
                            Project Reports
                        </button>
                    )}
                </div>
            </div>

            {/* Monthly KPI Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-500/10 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-100 flex items-center gap-1.5">
                        <Clock size={12} /> Total Hours Worked
                    </p>
                    <p className="text-2xl sm:text-3xl font-black">{monthlySummary.totalHours} <span className="text-sm font-bold text-blue-100">hrs</span></p>
                    <p className="text-[10px] text-blue-100 font-medium">Recorded in selected cycle</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Logged Days
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">{monthlySummary.closedDays} <span className="text-sm font-bold text-slate-400">days</span></p>
                    <p className="text-[10px] text-slate-400 font-medium">{monthlySummary.inProgressDays > 0 ? `${monthlySummary.inProgressDays} log in progress` : 'All reports submitted'}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500" /> Avg Daily Hours
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">{monthlySummary.avgHours} <span className="text-sm font-bold text-slate-400">hrs/day</span></p>
                    <p className="text-[10px] text-slate-400 font-medium">Per completed work day</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <Calendar size={12} className="text-purple-500" /> Total Entries
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">{monthlySummary.totalDays}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Total log sheets</p>
                </div>
            </div>

            {/* Work Logs List Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-black text-slate-800 dark:text-white text-lg">Daily Log Timeline</h3>
                        <span className="text-xs font-bold text-slate-400">Showing {workLogs.length} records</span>
                    </div>

                    <div className="space-y-3 mt-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-slate-400 animate-pulse font-bold text-sm">
                                Loading work history...
                            </div>
                        ) : workLogs.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 space-y-2">
                                <p className="text-4xl">📭</p>
                                <p className="font-bold text-base text-slate-600 dark:text-slate-300">No activity logs found for this cycle.</p>
                                <p className="text-xs text-slate-400">Select another month or submit a new work report.</p>
                            </div>
                        ) : (
                            workLogs.map((log) => {
                                const hoursWorked = getLogHours(log);
                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-slate-600 transition-all"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Date Badge */}
                                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex flex-col items-center justify-center font-black flex-shrink-0 shadow-sm">
                                                <span className="text-base leading-none">{new Date(log.date).getDate()}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase leading-tight mt-0.5">
                                                    {new Date(log.date).toLocaleDateString('en-GB', { month: 'short' })}
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                <h4 className="font-black text-slate-800 dark:text-white text-sm sm:text-base truncate">
                                                    {renderLogSummary(log)}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                                                        log.logStatus === 'CLOSED'
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                    }`}>
                                                        {log.logStatus === 'CLOSED' ? 'SUBMITTED' : 'IN PROGRESS'}
                                                    </span>

                                                    {hoursWorked > 0 && (
                                                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                                                            <Clock size={10} /> {hoursWorked} hrs
                                                        </span>
                                                    )}

                                                    {log.startTime && log.endTime && (
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {log.startTime} - {log.endTime}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleViewDetails(log)}
                                            className="p-2.5 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm flex-shrink-0"
                                            title="View Detailed Report"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed View Modal */}
            <WorkLogDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                log={selectedLog ? { ...selectedLog, user: user } : null}
            />
        </div>
    );
};

export default MyWorkLogs;
