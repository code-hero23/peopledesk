import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCallStats } from '../../features/admin/adminSlice';
import {
    Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
    Calendar, Clock, User, Hash, Search, Filter,
    RefreshCw, ChevronRight, Activity, Smartphone,
    PieChart as PieChartIcon, BarChart3, TrendingUp, Users,
    ArrowLeft, Download
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
    const { callStats, isLoading } = useSelector((state) => state.admin);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        dispatch(getCallStats(dateRange));
    }, [dispatch, dateRange]);

    const handleRefresh = () => {
        dispatch(getCallStats(dateRange));
    };

    // Data Processing
    const employeeMetrics = callStats.reduce((acc, log) => {
        const key = log.empId;
        if (!acc[key]) {
            acc[key] = {
                name: log.user,
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

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const getPieData = (metrics) => [
        { name: 'Incoming', value: metrics.incoming },
        { name: 'Outgoing', value: metrics.outgoing },
        { name: 'Missed', value: metrics.missed }
    ].filter(d => d.value > 0);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
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
                        <Calendar size={16} className="text-slate-400 ml-2" />
                        <input
                            type="date" value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="bg-transparent text-xs font-bold text-white outline-none"
                        />
                        <span className="text-slate-600 font-black text-xs">TO</span>
                        <input
                            type="date" value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="bg-transparent text-xs font-bold text-white outline-none"
                        />
                    </div>
                    <button onClick={handleRefresh} className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all shadow-xl active:scale-90">
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {!selectedEmployee ? (
                <>
                    {/* High Level Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Summary Stats */}
                        <div className="lg:col-span-1 grid grid-cols-1 gap-4">
                            <MetricBox label="Global Call Volume" value={metricsArray.reduce((acc, m) => acc + m.totalCalls, 0)} color="blue" icon={Activity} />
                            <MetricBox label="Active Personnel" value={metricsArray.length} color="purple" icon={Users} />
                            <MetricBox label="Avg engagement" value={metricsArray.length ? Math.round(metricsArray.reduce((acc, m) => acc + m.totalCalls, 0) / metricsArray.length) : 0} color="emerald" icon={TrendingUp} />
                        </div>

                        {/* Chart Grid */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-slate-800 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                                    <BarChart3 className="text-blue-500" size={16} /> Top Performers (Calls)
                                </h3>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="Calls" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
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
                            <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white text-3xl font-black mb-4 shadow-xl shadow-blue-200">
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedEmployee.name}</h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-8">Performance DNA</p>

                            <div className="h-[250px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={getPieData(selectedEmployee)}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {getPieData(selectedEmployee).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                        />
                                        <Legend verticalAlign="bottom" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Activity Log */}
                        <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
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
                                        {selectedEmployee.logs.sort((a, b) => b.date - a.date).map((call, idx) => (
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
                </motion.div>
            )}
        </div>
    );
};

const MetricBox = ({ label, value, color, icon: Icon }) => (
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center justify-between group hover:border-blue-100 transition-all">
        <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
        </div>
        <div className={`p-4 bg-${color}-50 text-${color}-600 rounded-3xl transition-all group-hover:scale-110`}>
            <Icon size={24} />
        </div>
    </div>
);

export default AdminCallReports;
