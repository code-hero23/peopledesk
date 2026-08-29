import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getDailyWorkLogs, reset } from '../../features/admin/adminSlice';
import { 
    Calendar, Download, Eye, Search, BarChart3, Briefcase, PlusCircle, 
    FileText, CheckCircle2, Clock, AlertCircle, Sparkles, Users, RefreshCw, 
    Filter, ArrowUpRight, ShieldCheck, FileSpreadsheet
} from 'lucide-react';
import axios from 'axios';
import WorkLogDetailModal from '../../components/admin/WorkLogDetailModal';
import CreateProjectModal from '../../components/admin/CreateProjectModal';

const WorkLogs = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { dailyWorkLogs, isLoading, isError, message } = useSelector((state) => state.admin);

    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const startDate = selectedDate;
    const endDate = selectedDate;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDesignation, setSelectedDesignation] = useState('');
    const [statusFilterTab, setStatusFilterTab] = useState('ALL'); // ALL, SUBMITTED, IN_PROGRESS, NOT_SUBMITTED

    const isAeUser = (userItem) => {
        if (!userItem) return false;
        const designation = (userItem.designation || '').trim().toUpperCase();
        const role = (userItem.role || '').trim().toUpperCase();
        return designation === 'AE' || designation === 'AE MANAGER' || role === 'AE_MANAGER';
    };

    // Filtering Logic
    const filteredLogs = dailyWorkLogs.filter((record) => {
        // Exclude AE / AE Manager users from WorkLogs unless user is AE_MANAGER
        if (user?.role !== 'AE_MANAGER' && isAeUser(record.user)) {
            return false;
        }

        // Match Designation
        if (selectedDesignation && record.user.designation !== selectedDesignation) {
            return false;
        }

        // Match Status Tab Filter
        const log = record.workLog;
        if (statusFilterTab === 'SUBMITTED' && (!log || log.logStatus !== 'CLOSED')) return false;
        if (statusFilterTab === 'IN_PROGRESS' && (!log || log.logStatus === 'CLOSED')) return false;
        if (statusFilterTab === 'NOT_SUBMITTED' && log) return false;

        if (!searchTerm) return true;
        const lowerTerm = searchTerm.toLowerCase();

        // Match User
        const userMatch = (record.user.name || '').toLowerCase().includes(lowerTerm) ||
            (record.user.email || '').toLowerCase().includes(lowerTerm);

        // Match Log Content
        let logMatch = false;
        if (log) {
            logMatch = (log.clientName?.toLowerCase().includes(lowerTerm)) ||
                (log.projectName?.toLowerCase().includes(lowerTerm)) ||
                (log.site?.toLowerCase().includes(lowerTerm)) ||
                (log.process?.toLowerCase().includes(lowerTerm)) ||
                (log.tasks?.toLowerCase().includes(lowerTerm)) ||
                (log.ae_siteLocation?.toLowerCase().includes(lowerTerm));
        }

        return userMatch || logMatch;
    });

    // KPI Metrics Calculation
    const totalVisibleEmployees = dailyWorkLogs.filter(r => user?.role === 'AE_MANAGER' || !isAeUser(r.user)).length;
    const submittedCount = dailyWorkLogs.filter(r => (user?.role === 'AE_MANAGER' || !isAeUser(r.user)) && r.workLog?.logStatus === 'CLOSED').length;
    const inProgressCount = dailyWorkLogs.filter(r => (user?.role === 'AE_MANAGER' || !isAeUser(r.user)) && r.workLog && r.workLog.logStatus !== 'CLOSED').length;
    const notSubmittedCount = totalVisibleEmployees - submittedCount - inProgressCount;
    const completionRate = totalVisibleEmployees > 0 ? Math.round((submittedCount / totalVisibleEmployees) * 100) : 0;

    // Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Create Project Modal State
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [projectInitialData, setProjectInitialData] = useState({});

    const fetchLogs = () => {
        if (user && user.token) {
            if (startDate === endDate) {
                dispatch(getDailyWorkLogs({ date: startDate }));
            } else {
                dispatch(getDailyWorkLogs({ startDate, endDate }));
            }
        }
    };

    useEffect(() => {
        if (isError) {
            console.error(message);
        }
        fetchLogs();
        return () => {
            dispatch(reset());
        };
    }, [user, isError, message, dispatch, startDate, endDate]);

    const onExportDaily = async () => {
        try {
            const userObj = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: { Authorization: `Bearer ${userObj.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            let apiUrl = `${baseUrl}/export/worklogs?`;

            if (startDate === endDate) {
                apiUrl += `date=${startDate}`;
            } else {
                apiUrl += `startDate=${startDate}&endDate=${endDate}`;
            }

            if (selectedDesignation) {
                apiUrl += `&designation=${selectedDesignation}`;
            }
            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            const fileName = startDate === endDate ? `worklog_${startDate}.xlsx` : `worklog_${startDate}_to_${endDate}.xlsx`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export daily worklogs.");
        }
    };

    const onExportMonth = async () => {
        try {
            const dateObj = new Date(startDate);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            let apiUrl = `${baseUrl}/export/worklogs?month=${month}&year=${year}`;
            if (selectedDesignation) {
                apiUrl += `&designation=${selectedDesignation}`;
            }
            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `worklogs_${year}_${month}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to download export. Please try again.");
        }
    };

    const onExportIndividual = async (userId, userName) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/worklogs?startDate=${startDate}&endDate=${endDate}&userId=${userId}`;

            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `worklog_${userName}_${startDate}_to_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Individual export failed:", error);
            alert("Failed to export individual worklogs.");
        }
    };

    const onExportTaskSummary = async (userId, userName) => {
        try {
            const dateObj = new Date(startDate);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/task-summary?userId=${userId}&month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Task_Summary_${userName.replace(/\s+/g, '_')}_${month}_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Task summary export failed:", error);
            alert("Failed to export task summary.");
        }
    };

    const onExportAllTaskSummary = async () => {
        try {
            const dateObj = new Date(startDate);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/all-task-summary?month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `All_Employees_Task_Summary_${month}_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Global task summary export failed:", error);
            alert("Failed to export all employees task summary.");
        }
    };

    const onExportProjectWise = async (userId, userName) => {
        try {
            const dateObj = new Date(startDate);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/project-wise?userId=${userId}&month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Project_Reports_${userName.replace(/\s+/g, '_')}_${month}_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Project reports export failed:", error);
            alert("Failed to export project-wise reports.");
        }
    };

    // Register globally for modal use
    useEffect(() => {
        window.onQuickExportIndividual = onExportIndividual;
        return () => {
            delete window.onQuickExportIndividual;
        };
    }, [startDate, endDate]);

    const renderWorkDescription = (log) => {
        // CRE
        if (log.cre_totalCalls !== null || log.cre_showroomVisits !== null) {
            return (
                <div className="text-xs space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                        {log.cre_totalCalls > 0 && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-200/60 dark:border-blue-800 font-bold">
                                📞 {log.cre_totalCalls} Calls
                            </span>
                        )}
                        {log.cre_showroomVisits > 0 && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-200/60 dark:border-amber-800 font-bold">
                                🏢 {log.cre_showroomVisits} Visits
                            </span>
                        )}
                    </div>
                    {log.cre_callBreakdown && (
                        <p className="text-slate-600 dark:text-slate-400 truncate max-w-xs font-medium" title={log.cre_callBreakdown}>
                            {log.cre_callBreakdown}
                        </p>
                    )}
                </div>
            );
        }
        // FA
        if (log.fa_calls !== null || log.fa_showroomVisits !== null || log.fa_siteVisits !== null) {
            return (
                <div className="text-xs space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                        {log.fa_calls > 0 && (
                            <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800 font-bold">
                                📞 {log.fa_calls} Calls
                            </span>
                        )}
                        {log.fa_designPendingClients && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg font-bold" title={`Design Pending: ${log.fa_designPendingClients}`}>
                                🎨 Pending
                            </span>
                        )}
                    </div>
                </div>
            );
        }
        // AE
        if (log.ae_visitType) {
            return (
                <div className="text-xs space-y-1">
                    <div className="flex flex-wrap gap-1">
                        {(Array.isArray(log.ae_visitType) ? log.ae_visitType : [log.ae_visitType]).map((t, i) => (
                            <span key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-bold">
                                {t}
                            </span>
                        ))}
                    </div>
                    {log.ae_workStage && (
                        <div className="text-slate-500 dark:text-slate-400 font-medium">Stage: {log.ae_workStage}</div>
                    )}
                </div>
            );
        }

        // Default LA / General
        return (
            <p className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs" title={log.process || log.tasks || log.remarks}>
                {log.process || log.tasks || log.remarks || '-'}
            </p>
        );
    };

    const handleViewDetails = (record) => {
        setSelectedLog(record);
        setIsModalOpen(true);
    };

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
                                <FileText className="text-white" size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">Daily Work Reports</h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                                        <Sparkles size={10} className="animate-pulse" /> AUDIT MATRIX
                                    </span>
                                </div>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em] mt-0.5">
                                    Employee Daily Task Submissions & Activity Logs
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
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                    className="bg-transparent text-xs font-black text-white outline-none cursor-pointer dark-picker tracking-wide"
                                />
                            </div>
                        </div>

                        <button
                            onClick={fetchLogs}
                            disabled={isLoading}
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10 active:scale-95 disabled:opacity-50"
                            title="Refresh Work Logs"
                        >
                            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
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
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Active Staff</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{totalVisibleEmployees}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Logs Submitted</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{submittedCount}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">In Progress</p>
                        <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{inProgressCount}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Submission Rate</p>
                        <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{completionRate}%</h3>
                    </div>
                </div>
            </div>

            {/* Filter Tabs, Search & Action Export Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search & Category Filter */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="relative group flex-1 sm:w-64">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search employee, project, site..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 ring-blue-500/30 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all"
                            />
                        </div>

                        <select
                            value={selectedDesignation}
                            onChange={(e) => setSelectedDesignation(e.target.value)}
                            className="py-2.5 px-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-blue-500/30 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 transition-all"
                        >
                            <option value="">All Categories</option>
                            <option value="LA">Loading Architect (LA)</option>
                            <option value="CRE">Customer Relationship Executive (CRE)</option>
                            <option value="FA">Feasibility Architect (FA)</option>
                            <option value="OFFICE-ADMINISTRATION">Office Administration</option>
                            <option value="ACCOUNT">Account</option>
                            <option value="LEAD-OPERATION">Lead Operation</option>
                            <option value="LEAD-CONVERSION">Lead Conversion</option>
                            <option value="DIGITAL-MARKETING">Digital Marketing</option>
                            <option value="VENDOR-MANAGEMENT">Vendor Management</option>
                            <option value="CUSTOMER-RELATIONSHIP">Customer Relationship</option>
                            <option value="CLIENT-CARE">Client Care</option>
                            <option value="ESCALATION">Escalation</option>
                            <option value="CLIENT-FACILITATOR">Client Facilitator</option>
                        </select>
                    </div>

                    {/* Export Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={onExportDaily}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 text-xs font-bold"
                            title="Export Selected Date Worklogs to Excel"
                        >
                            <Download size={14} />
                            <span>Export Today</span>
                        </button>

                        <button
                            onClick={onExportMonth}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 text-xs font-bold"
                            title="Export Selected Month Worklogs to Excel"
                        >
                            <Calendar size={14} />
                            <span>Export Monthly</span>
                        </button>

                        <button
                            onClick={onExportAllTaskSummary}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 text-xs font-bold"
                            title="Export Monthly Task Summary Report for All Staff"
                        >
                            <BarChart3 size={14} />
                            <span>Summary Report</span>
                        </button>
                    </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {[
                        { id: 'ALL', label: `All Staff (${totalVisibleEmployees})` },
                        { id: 'SUBMITTED', label: `Submitted (${submittedCount})` },
                        { id: 'IN_PROGRESS', label: `In Progress (${inProgressCount})` },
                        { id: 'NOT_SUBMITTED', label: `Not Submitted (${notSubmittedCount})` }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilterTab(tab.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                statusFilterTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Work Logs Data Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/60 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-slate-800/60">
                            <tr>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Project / Site</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Activity Details</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-16 text-slate-400 font-bold uppercase tracking-widest">
                                        <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500 opacity-60" />
                                        Loading Daily Work Reports...
                                    </td>
                                </tr>
                            ) : dailyWorkLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-16 text-slate-400 font-bold text-xs italic">
                                        No employee work log records found for this date.
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-16 text-slate-400 font-bold text-xs italic">
                                        No work logs match your current search and filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((record) => {
                                    const log = record.workLog;

                                    return (
                                        <tr key={record.user.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                            {/* Employee Column */}
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shrink-0">
                                                        {(record.user.name || "E").charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 dark:text-slate-100 text-xs">{record.user.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium">{record.user.email}</span>
                                                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">
                                                            {record.user.designation || 'STAFF'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Project / Site Column */}
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col space-y-0.5">
                                                    <span className="font-black text-slate-800 dark:text-slate-200 text-xs">
                                                        {log?.projectName || log?.project?.name || log?.clientName || '-'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 italic">
                                                        {log?.site || log?.la_projectLocation || log?.ae_siteLocation || '-'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Activity Details Column */}
                                            <td className="px-6 py-4 align-top">
                                                {log ? renderWorkDescription(log) : (
                                                    <span className="text-slate-400 dark:text-slate-600 italic text-[11px] font-bold">
                                                        Waiting for submission...
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Badge Column */}
                                            <td className="px-6 py-4 align-top text-center">
                                                {log?.logStatus === 'CLOSED' ? (
                                                    <span 
                                                        className="inline-flex px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider shadow-md text-white ring-2 ring-white/20"
                                                        style={{ backgroundColor: '#059669' }}
                                                    >
                                                        Submitted
                                                    </span>
                                                ) : log ? (
                                                    <span 
                                                        className="inline-flex px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider shadow-md text-white ring-2 ring-white/20"
                                                        style={{ backgroundColor: '#d97706' }}
                                                    >
                                                        In Progress
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                        Not Submitted
                                                    </span>
                                                )}
                                            </td>

                                            {/* Action Buttons Column */}
                                            <td className="px-6 py-4 align-top text-center">
                                                {log ? (
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleViewDetails(record);
                                                            }}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl transition-all font-black text-xs border border-blue-200/60 dark:border-blue-800/80 group shadow-sm"
                                                            title="View Detailed Report"
                                                        >
                                                            <Eye size={14} className="group-hover:scale-110 transition-transform" />
                                                            <span>View Report</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onExportIndividual(record.user.id, record.user.name);
                                                            }}
                                                            className="p-2 bg-slate-50 dark:bg-slate-950 hover:bg-rose-600 text-slate-600 dark:text-slate-400 hover:text-white rounded-xl transition-all border border-slate-200/60 dark:border-slate-800 shadow-sm"
                                                            title="Download Monthly Report"
                                                        >
                                                            <Download size={14} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onExportTaskSummary(record.user.id, record.user.name);
                                                            }}
                                                            className="p-2 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-600 text-slate-600 dark:text-slate-400 hover:text-white rounded-xl transition-all border border-slate-200/60 dark:border-slate-800 shadow-sm"
                                                            title="Download Task Summary (Full Month)"
                                                        >
                                                            <BarChart3 size={14} />
                                                        </button>

                                                        {['LA', 'FA', 'LOADING ARCHITECT', 'FEASIBILITY ARCHITECT'].some(role => (record.user.designation || '').toUpperCase().includes(role)) && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onExportProjectWise(record.user.id, record.user.name);
                                                                    }}
                                                                    className="p-2 bg-slate-50 dark:bg-slate-950 hover:bg-emerald-600 text-slate-600 dark:text-slate-400 hover:text-white rounded-xl transition-all border border-slate-200/60 dark:border-slate-800 shadow-sm"
                                                                    title="Download Project Wise Reports (LA/FA Only)"
                                                                >
                                                                    <Briefcase size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setProjectInitialData({
                                                                            name: log?.clientName || log?.projectName || '',
                                                                            location: log?.site || log?.la_projectLocation || '',
                                                                            email: record.user.email
                                                                        });
                                                                        setIsProjectModalOpen(true);
                                                                    }}
                                                                    className="p-2 bg-slate-50 dark:bg-slate-950 hover:bg-blue-600 text-slate-600 dark:text-slate-400 hover:text-white rounded-xl transition-all border border-slate-200/60 dark:border-slate-800 shadow-sm"
                                                                    title="Create Project"
                                                                >
                                                                    <PlusCircle size={14} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 dark:text-slate-600 font-bold">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <WorkLogDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                log={selectedLog ? { ...selectedLog.workLog, user: selectedLog.user } : null}
            />

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                initialData={projectInitialData}
            />
        </div>
    );
};

export default WorkLogs;

