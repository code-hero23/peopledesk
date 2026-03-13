import { useState, useEffect } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { getCallStats } from '../../features/admin/adminSlice';
import {
    Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
    Calendar, Clock, User, Hash, Search, Filter,
    RefreshCw, ChevronRight, Activity, Smartphone,
    PieChart as PieChartIcon, BarChart3, TrendingUp, Users,
    ArrowLeft, Download, Settings, Save, Info, X as CloseIcon, Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    CartesianGrid
} from 'recharts';
import { toast } from 'react-toastify';

const AdminCallReports = () => {
    const dispatch = useDispatch();
    const { callStats, excludedNumbers, isLoading } = useSelector((state) => state.admin);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toLocaleDateString('en-CA'),
        endDate: new Date().toLocaleDateString('en-CA')
    });
    const [showExcludedSettings, setShowExcludedSettings] = useState(false);
    const [tempExcludedNumbers, setTempExcludedNumbers] = useState('');
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [isEmailing, setIsEmailing] = useState(false);

    useEffect(() => {
        dispatch(getCallStats({ ...dateRange }));
    }, [dispatch, dateRange]);

    const handleRefresh = () => {
        dispatch(getCallStats({ ...dateRange }));
    };

    // Auto-sync drill-down data when stats update
    useEffect(() => {
        if (selectedEmployee) {
            const updated = metricsArray.find(m => m.empId === selectedEmployee.empId);
            if (updated) {
                setSelectedEmployee(updated);
            } else {
                setSelectedEmployee(null);
            }
        }
    }, [callStats]);

    useEffect(() => {
        if (excludedNumbers) {
            setTempExcludedNumbers(excludedNumbers.join(', '));
        }
    }, [excludedNumbers]);

    const handleSaveSettings = async () => {
        try {
            setIsSavingSettings(true);
            const token = JSON.parse(localStorage.getItem('user')).token;
            const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');
            
            await axios.post(`${baseUrl}/settings`, {
                key: 'EXCLUDED_EMPLOYEE_NUMBERS',
                value: tempExcludedNumbers
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Exclusion list updated successfully');
            setShowExcludedSettings(false);
            handleRefresh();
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to update exclusion list');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const token = JSON.parse(localStorage.getItem('user')).token;
            const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');
            
            const response = await fetch(`${baseUrl}/export/call-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Call_Analytics_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            toast.success('Analytics exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export analytics');
        } finally {
            setIsExporting(false);
        }
    };

    const handleEmailReport = async () => {
        if (!emailAddress) {
            toast.error('Please enter an email address');
            return;
        }

        try {
            setIsEmailing(true);
            const token = JSON.parse(localStorage.getItem('user')).token;
            const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');
            
            const response = await axios.post(`${baseUrl}/export/call-stats/email`, {
                ...dateRange,
                email: emailAddress
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(response.data.message || 'Report sent successfully');
            setShowEmailModal(false);
            setEmailAddress('');
        } catch (error) {
            console.error('Email failed:', error);
            toast.error(error.response?.data?.message || 'Failed to send report');
        } finally {
            setIsEmailing(false);
        }
    };

    // Data Processing
    const employeeMetrics = callStats.reduce((acc, log) => {
        const key = log.empId;
        if (!acc[key]) {
            acc[key] = {
                name: log.name,
                empId: log.empId,
                totalCalls: 0,
                incoming: 0,
                outgoing: 0,
                missed: 0,
                duration: 0,
                logs: []
            };
        }

        const calls = log.calls || [];
        acc[key].totalCalls += calls.length;
        acc[key].logs.push(...calls.map(c => ({ ...c, dateFormatted: log.date })));

        calls.forEach(c => {
            if (c.type === 'INCOMING') acc[key].incoming++;
            if (c.type === 'OUTGOING') acc[key].outgoing++;
            if (c.type === 'MISSED' || c.type === 'REJECTED') acc[key].missed++;
            acc[key].duration += (c.duration || 0);
        });

        return acc;
    }, {});

    const metricsArray = Object.values(employeeMetrics).sort((a, b) => b.totalCalls - a.totalCalls);

    // Chart Data
    const barData = metricsArray.slice(0, 10).map(m => ({
        name: m.name.split(' ')[0],
        Calls: m.totalCalls,
        TalkTime: Math.round(m.duration / 60)
    }));

    // Global Stats Aggregation
    const globalStats = {
        total: 0,
        incoming: 0,
        outgoing: 0,
        missed: 0,
        rejected: 0,
        duration: 0,
        uniqueNumbers: new Set()
    };

    callStats.forEach(log => {
        const calls = log.calls || [];
        globalStats.total += calls.length;
        calls.forEach(c => {
            if (c.type === 'INCOMING') globalStats.incoming++;
            if (c.type === 'OUTGOING') globalStats.outgoing++;
            if (c.type === 'MISSED') globalStats.missed++;
            if (c.type === 'REJECTED') globalStats.rejected++;
            globalStats.duration += (c.duration || 0);
            if (c.number && !excludedNumbers.includes(c.number)) {
                globalStats.uniqueNumbers.add(c.number);
            }
        });
    });

    const globalPieData = [
        { name: 'Incoming', value: globalStats.incoming, color: '#10b981' }, // emerald-500
        { name: 'Outgoing', value: globalStats.outgoing, color: '#3b82f6' }, // blue-500
        { name: 'Missed', value: globalStats.missed, color: '#f43f5e' }, // rose-500
        { name: 'Rejected', value: globalStats.rejected, color: '#f59e0b' } // amber-500
    ].filter(d => d.value > 0);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const getPieData = (metrics) => [
        { name: 'Incoming', value: metrics.incoming, color: '#10b981' },
        { name: 'Outgoing', value: metrics.outgoing, color: '#3b82f6' },
        { name: 'Missed', value: metrics.missed, color: '#f43f5e' },
        { name: 'Rejected', value: metrics.rejected, color: '#f59e0b' }
    ].filter(d => d.value > 0);

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    if (isLoading && callStats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Aggregating Global Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 rounded-2xl shadow-lg ring-4 ring-blue-500/20">
                            <BarChart3 className="text-white" size={24} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter">Command Analytics</h1>
                    </div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] ml-1">CRE Performance & Engagement Ledger</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 relative z-10">
                    <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-2xl border border-slate-700">
                        <Calendar size={16} className="text-blue-400 ml-2" />
                        <input
                            type="date" value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="bg-transparent text-xs font-bold text-white outline-none [color-scheme:dark]"
                        />
                        <span className="text-slate-500 font-black text-[10px]">TO</span>
                        <input
                            type="date" value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="bg-transparent text-xs font-bold text-white outline-none [color-scheme:dark]"
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-slate-800 p-2 px-4 rounded-2xl border border-slate-700">
                        <Activity size={16} className="text-blue-400" />
                        <span className="text-xs font-black text-white uppercase tracking-widest">Uploaded Logs</span>
                    </div>
                    <button onClick={handleRefresh} className="p-4 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700 active:scale-90">
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    
                    <button 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all shadow-xl active:scale-90 flex items-center gap-2 disabled:opacity-50"
                        title="Export Analytics"
                    >
                        <Download size={18} className={isExporting ? 'animate-bounce' : ''} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{isExporting ? 'Exporting...' : 'Export Analytics'}</span>
                    </button>

                    <button 
                        onClick={() => setShowEmailModal(true)}
                        className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-xl active:scale-90 flex items-center gap-2"
                        title="Email Report"
                    >
                        <Mail size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Send to Email</span>
                    </button>

                    <button 
                        onClick={() => setShowExcludedSettings(true)}
                        className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-xl active:scale-90 flex items-center gap-2"
                        title="Manage Excluded Numbers"
                    >
                        <Settings size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Exclusion List</span>
                    </button>
                </div>
            </header>

            {/* Settings Modal */}
            <AnimatePresence>
                {showExcludedSettings && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                                        <Settings size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Exclusion Ledger</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Contact Filtering</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowExcludedSettings(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <CloseIcon size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
                                    <div className="mt-0.5 text-amber-600"><Info size={18} /></div>
                                    <p className="text-xs font-bold text-amber-800 leading-relaxed">
                                        Enter phone numbers separated by commas. These numbers will be <strong>excluded</strong> from "Unique Leads" calculations across all reports.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Employee Numbers</label>
                                    <textarea
                                        value={tempExcludedNumbers}
                                        onChange={(e) => setTempExcludedNumbers(e.target.value)}
                                        placeholder="+919876543210, +919988776655..."
                                        className="w-full h-40 bg-slate-50 border border-slate-100 rounded-2xl p-6 outline-none focus:ring-4 ring-blue-50 transition-all font-bold text-sm text-slate-700 resize-none shadow-inner"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSavingSettings}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSavingSettings ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                    {isSavingSettings ? "COMMITTING CHANGES..." : "SYNC EXCLUSION LIST"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!selectedEmployee ? (
                <>
                    {/* Premium Analytics Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
                        {/* Summary Stats */}
                        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                            <MetricBox label="Global Volume" value={globalStats.total} color="blue" icon={Activity} />
                            <MetricBox label="Active Personnel" value={metricsArray.length} color="purple" icon={Users} />
                            <MetricBox label="Incoming" value={globalStats.incoming} color="emerald" icon={PhoneIncoming} />
                            <MetricBox label="Outgoing" value={globalStats.outgoing} color="sky" icon={PhoneOutgoing} />
                            <MetricBox label="Missed" value={globalStats.missed} color="rose" icon={PhoneMissed} />
                            <MetricBox label="Rejected" value={globalStats.rejected} color="amber" icon={PhoneMissed} />
                            <div className="col-span-2">
                                <MetricBox label="Global Talk Time" value={formatDuration(globalStats.duration)} color="fuchsia" icon={Clock} />
                            </div>
                        </div>

                        {/* Visual Chart Card */}
                        <div className="lg:col-span-3 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden flex flex-col min-h-[350px]">
                            <h3 className="text-slate-800 font-black uppercase text-[10px] tracking-widest self-start mb-4">Global Distribution</h3>
                            <div className="flex-1 w-full min-h-[220px]">
                                {globalPieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                                    <PieChart>
                                        <Pie
                                            data={globalPieData}
                                            cx="50%" cy="50%"
                                            innerRadius={50} outerRadius={80}
                                            paddingAngle={5} dataKey="value"
                                            stroke="none"
                                        >
                                            {globalPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                            itemStyle={{ fontWeight: 'black' }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center opacity-50 space-y-4 h-full py-10">
                                    <PieChartIcon className="text-slate-300" size={48} />
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">No Signals Detected</p>
                                </div>
                            )}
                            </div>
                        </div>

                        {/* Top Performers Chart */}
                        <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col min-h-[350px]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-slate-800 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                    <BarChart3 className="text-blue-500" size={14} /> Top Performers
                                </h3>
                            </div>
                            <div className="flex-1 w-full pb-4 min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} width={30} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="Calls" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Employee Grid */}
                    <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Users size={18} /></div>
                                Personnel Engagement Matrix
                            </h2>
                            <div className="relative group w-full md:w-80">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Isolate by name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 pl-12 pr-4 py-3 rounded-2xl border border-slate-100 outline-none focus:ring-4 ring-blue-50 transition-all font-bold text-xs"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribution (I/O/M)</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Engagement</th>
                                        <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {metricsArray
                                        .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((metrics) => (
                                            <tr key={metrics.empId} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                            {metrics.name.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-800">{metrics.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{metrics.empId}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className="text-lg font-black text-slate-800 tracking-tight">{metrics.totalCalls}</span>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="flex gap-1.5 h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="bg-emerald-500 h-full" style={{ width: `${(metrics.incoming / metrics.totalCalls) * 100}%` }}></div>
                                                        <div className="bg-blue-500 h-full" style={{ width: `${(metrics.outgoing / metrics.totalCalls) * 100}%` }}></div>
                                                        <div className="bg-rose-500 h-full" style={{ width: `${(metrics.missed / metrics.totalCalls) * 100}%` }}></div>
                                                    </div>
                                                    <div className="flex gap-3 mt-2 text-[8px] font-black uppercase text-slate-400">
                                                        <span>{metrics.incoming} In</span>
                                                        <span>{metrics.outgoing} Out</span>
                                                        <span>{metrics.missed} Misc</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <span className="text-xs font-black text-slate-600 flex items-center gap-1.5">
                                                        <Clock size={12} className="text-blue-400" />
                                                        {formatDuration(metrics.duration)}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <button
                                                        onClick={() => setSelectedEmployee(metrics)}
                                                        className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all shadow-sm active:scale-90"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Email Modal */}
                    <AnimatePresence>
                        {showEmailModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border border-slate-100 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                    <button 
                                        onClick={() => setShowEmailModal(false)}
                                        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800 transition-colors"
                                    >
                                        <CloseIcon size={24} />
                                    </button>

                                    <div className="flex flex-col items-center text-center space-y-6">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-inner">
                                            <Mail size={40} />
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Transmission Station</h2>
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Email Call Performance Report</p>
                                        </div>

                                        <div className="w-full space-y-4">
                                            <div className="relative">
                                                <input 
                                                    type="email"
                                                    value={emailAddress}
                                                    onChange={(e) => setEmailAddress(e.target.value)}
                                                    placeholder="Enter destination email..."
                                                    className="w-full pl-6 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleEmailReport}
                                                disabled={isEmailing}
                                                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {isEmailing ? (
                                                    <><RefreshCw className="animate-spin" size={16} /> Transmitting...</>
                                                ) : (
                                                    <><Activity size={16} /> Broadcast Report</>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Encrypted Data Stream • Secure Protocol</p>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                >
                    {/* Drill-down Header */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setSelectedEmployee(null)}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm"
                        >
                            <ArrowLeft size={14} /> Back to Command
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Profile & Pie Chart */}
                        <div className="lg:col-span-4 bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-2xl flex flex-col items-center">
                            <div className="w-32 h-32 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black mb-4 shadow-xl shadow-blue-200">
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">{selectedEmployee.name}</h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-8">Performance DNA</p>

                            <div className="w-full space-y-4">
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                                        <PieChart>
                                            <Pie
                                                data={getPieData(selectedEmployee)}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {getPieData(selectedEmployee).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                            />
                                            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Metrics Grid */}
                        <div className="lg:col-span-8 space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <MetricBox label="Identified" value={selectedEmployee.totalCalls} color="blue" icon={Hash} />
                                <MetricBox label="Incoming" value={selectedEmployee.incoming} color="emerald" icon={PhoneIncoming} />
                                <MetricBox label="Outgoing" value={selectedEmployee.outgoing} color="sky" icon={PhoneOutgoing} />
                                <MetricBox label="Missed" value={selectedEmployee.missed} color="rose" icon={PhoneMissed} />
                                <MetricBox label="Unique Leads" value={new Set(selectedEmployee.logs.map(l => l.number).filter(n => !excludedNumbers.includes(n))).size} color="indigo" icon={User} />
                                <MetricBox label="Session Time" value={formatDuration(selectedEmployee.duration)} color="fuchsia" icon={Clock} />
                            </div>

                            {/* Recent Activity Log */}
                            <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-3">
                                        <Activity className="text-blue-500" size={16} /> Raw Log Transmission
                                    </h3>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Total Records: {selectedEmployee.logs.length}
                                    </div>
                                </div>
                                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descriptor</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Identifier</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Timeline</th>
                                                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Impact</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedEmployee.logs
                                                .sort((a, b) => b.date - a.date)
                                                .map((call, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-8 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-1.5 rounded-lg ${call.type === 'OUTGOING' ? 'bg-blue-50 text-blue-600' : call.type === 'INCOMING' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                    {call.type === 'OUTGOING' ? <PhoneOutgoing size={12} /> : call.type === 'INCOMING' ? <PhoneIncoming size={12} /> : <PhoneMissed size={12} />}
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase text-slate-600">{call.type}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4 px-8 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-slate-800">{call.number}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{call.name || "UNKNOWN"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-700">{new Date(call.date).toLocaleDateString('en-GB')}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4 text-right">
                                                            <span className={`text-[10px] font-black transition-all ${call.duration > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                                {call.duration}s
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const MetricBox = ({ label, value, color, icon: Icon }) => {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        sky: 'bg-sky-50 text-sky-600 border-sky-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        fuchsia: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100',
    };

    return (
        <div className={`p-5 rounded-[2rem] border shadow-xl flex items-center justify-between group hover:-translate-y-1 transition-all duration-300 ${colorMap[color]}`}>
            <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{label}</span>
                <p className="text-2xl font-black tracking-tighter">{value}</p>
            </div>
            <div className="w-10 h-10 bg-white/50 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110">
                <Icon size={20} className="opacity-90" />
            </div>
        </div>
    );
};

export default AdminCallReports;
