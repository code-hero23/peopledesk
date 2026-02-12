import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getTeamOverview, getEmployeeStats, reset } from '../../features/analytics/analyticsSlice';
import { TrendingUp, Users, Clock, AlertTriangle, Calendar, Search, ArrowRight, Award, BarChart3, LineChart as LineIcon, Download, Crown } from 'lucide-react';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Legend
} from 'recharts';

const KPICard = ({ title, value, subtext, icon: Icon, color, gradient }) => {
    const colorClasses = {
        blue: { bg: 'bg-blue-50/50', iconBg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
        emerald: { bg: 'bg-emerald-50/50', iconBg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
        orange: { bg: 'bg-orange-50/50', iconBg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500' },
        red: { bg: 'bg-red-50/50', iconBg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
    };

    const style = colorClasses[color] || colorClasses.blue;

    return (
        <div className="relative overflow-hidden bg-white p-7 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
            {/* Decorative Background Element */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 ${style.bg} rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700`}></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${style.iconBg} ${style.text} shadow-sm group-hover:rotate-12 transition-transform duration-500`}>
                        <Icon size={28} strokeWidth={2.5} />
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                    </div>
                </div>

                <div>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tight mb-2 group-hover:text-blue-600 transition-colors uppercase">{value}</h3>
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`}></span>
                        <p className="text-[11px] font-bold text-slate-500 tracking-tight leading-tight">
                            {subtext}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PerformanceAnalytics = () => {
    const dispatch = useDispatch();
    const { teamOverview, employeeStats, isLoading } = useSelector((state) => state.analytics);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        dispatch(getTeamOverview(dateRange));
        return () => dispatch(reset());
    }, [dispatch, dateRange]);

    const statsRef = useRef(null);

    useEffect(() => {
        if (selectedEmployee && employeeStats && statsRef.current) {
            statsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [employeeStats, selectedEmployee]);

    const handleEmployeeSelect = (id) => {
        setSelectedEmployee(id);
        dispatch(getEmployeeStats({ id, ...dateRange }));
    };

    const handleDownload = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.get(`http://localhost:5000/api/export/analytics`, {
                params: dateRange,
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Performance_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download report');
        }
    };

    // Prep data for charts
    const teamChartData = teamOverview.map(emp => ({
        name: emp.name.split(' ')[0],
        Efficiency: emp.efficiency,
        Consistency: emp.consistency
    }));

    return (
        <div className="space-y-10 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-8 bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-[100px] -mr-32 -mt-32"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 scale-110">
                            <TrendingUp size={24} strokeWidth={3} />
                        </div>
                        <h2 className="text-4xl xl:text-5xl font-black text-slate-800 tracking-tighter">Performance <span className="text-blue-600">Analytics</span></h2>
                    </div>
                    <p className="text-slate-500 font-bold text-sm max-w-xl leading-relaxed ml-1">
                        Monitor team productivity, consistency benchmarks, and performance trends with AI-driven insights.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[24px] border border-slate-200/60 shadow-inner">
                        <div className="flex items-center gap-3 pl-4">
                            <Calendar size={18} className="text-blue-600" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter -mb-1">Start Date</span>
                                <input
                                    type="date"
                                    className="text-xs font-black bg-transparent outline-none text-slate-700 w-24 cursor-pointer"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3 pr-4">
                            <div className="flex flex-col text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter -mb-1 text-right">End Date</span>
                                <input
                                    type="date"
                                    className="text-xs font-black bg-transparent outline-none text-slate-700 w-24 text-right cursor-pointer"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="group flex items-center justify-center gap-3 bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-[24px] shadow-2xl shadow-slate-300 hover:shadow-blue-200 transition-all duration-500 font-black text-sm active:scale-95"
                    >
                        <Download size={20} className="group-hover:animate-bounce" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Individual Insight (if selected) */}
            {employeeStats && (
                <div ref={statsRef} className="space-y-8 animate-slide-up">
                    <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>

                        <div className="relative">
                            <div className="w-28 h-28 rounded-[40px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-5xl shadow-2xl shadow-blue-200 ring-[12px] ring-blue-50">
                                {teamOverview.find(e => e.id === selectedEmployee)?.name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-lg border-4 border-white">
                                <Award size={20} strokeWidth={3} />
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                                <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{teamOverview.find(e => e.id === selectedEmployee)?.name}</h3>
                                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-200 mx-auto md:mx-0">Active Member</span>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                    <Clock size={16} className="text-slate-400" />
                                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{teamOverview.find(e => e.id === selectedEmployee)?.designation}</span>
                                </div>
                                <button
                                    onClick={() => { setSelectedEmployee(null); dispatch(reset()); }}
                                    className="group flex items-center gap-2 text-slate-400 hover:text-red-500 text-xs font-black uppercase tracking-widest transition-all duration-300 bg-white hover:bg-red-50 px-4 py-2 rounded-2xl border border-slate-100 hover:border-red-100"
                                >
                                    <AlertTriangle size={14} className="group-hover:animate-pulse" />
                                    Reset View
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard title="Consistency" value={`${employeeStats.consistencyScore}%`} subtext={`${employeeStats.daysWithLogs}/${employeeStats.totalDaysPresent} logs verified`} icon={Award} color="blue" />
                        <KPICard title="Net Efficiency" value={`${employeeStats.efficiencyScore}%`} subtext={`${typeof employeeStats.totalNetTime === 'string' ? employeeStats.totalNetTime.replace('h', ' hrs') : employeeStats.totalNetTime}`} icon={TrendingUp} color="emerald" />
                        <KPICard
                            title="Avg Arrival Time"
                            value={(() => {
                                const date = new Date();
                                date.setHours(10, 0, 0, 0);
                                date.setMinutes(date.getMinutes() + employeeStats.avgLateness);
                                return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            })()}
                            subtext={`Avg ${Math.abs(employeeStats.avgLateness)}m ${employeeStats.avgLateness >= 0 ? 'late' : 'early'}`}
                            icon={Clock}
                            color="orange"
                        />
                        <KPICard title="Request Limit" value={employeeStats.limitExceededFlags} subtext="Exceptions flagged (4+)" icon={AlertTriangle} color="red" />
                    </div>

                    {/* Employee Specific Chart */}
                    <div className="bg-white p-10 rounded-[48px] shadow-2xl shadow-slate-200 border border-slate-100 relative overflow-hidden group hover:shadow-3xl transition-all duration-500">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[20px] shadow-inner group-hover:scale-110 transition-transform duration-500">
                                    <LineIcon size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-2xl tracking-tighter">Efficiency Trend</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 ml-0.5">Performance timeline</p>
                                </div>
                            </div>
                            <div className="px-5 py-2 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600"></div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase">Efficiency %</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={employeeStats.dailyTrends} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '800', fill: '#94a3b8' }} dy={15} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '800', fill: '#94a3b8' }} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '24px', color: '#fff', padding: '16px 20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                                        itemStyle={{ fontWeight: '900', fontSize: '15px', color: '#818cf8', textTransform: 'uppercase' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontSize: '11px', fontWeight: '900', letterSpacing: '0.1em' }}
                                        cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="efficiency"
                                        stroke="#6366f1"
                                        strokeWidth={6}
                                        dot={{ r: 6, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }}
                                        activeDot={{ r: 10, strokeWidth: 0, fill: '#818cf8', shadow: '0 0 20px rgba(99, 102, 241, 0.5)' }}
                                        animationDuration={2000}
                                        fill="url(#colorEfficiency)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Leaderboard/Overview */}
            <div className="bg-white rounded-[48px] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative group">
                <div className="px-10 py-10 bg-white border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-blue-50 text-blue-600 rounded-[24px] shadow-inner transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <Users size={32} strokeWidth={3} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3">
                                Team Leaderboard
                            </h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mt-1">Live performance metrics matrix</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-full border border-slate-100 shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Updates Enabled</span>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="pl-12 pr-6 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Employee Profile</th>
                                <th className="px-6 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center border-b border-slate-100">
                                    Efficiency <span className="text-emerald-500 ml-1">Score</span>
                                </th>
                                <th className="px-6 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center border-b border-slate-100">
                                    Consistency <span className="text-violet-500 ml-1">Index</span>
                                </th>
                                <th className="px-6 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center border-b border-slate-100">Total Presence</th>
                                <th className="px-6 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right pr-12 border-b border-slate-100">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {teamOverview.map((emp) => {
                                const isHighAchiever = emp.efficiency >= 97 && emp.consistency >= 95;
                                const isLowPerformer = emp.efficiency < 50;

                                return (
                                    <tr key={emp.id} className={`transition-all duration-500 group relative
                                        ${selectedEmployee === emp.id ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}
                                    `}>
                                        <td className="pl-12 pr-6 py-8">
                                            <div className="flex items-center gap-6">
                                                <div className="relative group/avatar">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all shadow-xl duration-500
                                                        ${isHighAchiever
                                                            ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-orange-200'
                                                            : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:shadow-blue-200 group-hover:scale-110 group-hover:-rotate-3'
                                                        }
                                                    `}>
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    {isHighAchiever && (
                                                        <div className="absolute -top-3 -right-3 bg-white p-1.5 rounded-full shadow-lg border border-amber-100 animate-bounce">
                                                            <Crown size={14} className="text-amber-500 fill-amber-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <p className={`font-black text-lg transition-colors tracking-tight
                                                            ${isHighAchiever ? 'text-slate-800' : 'text-slate-700 group-hover:text-blue-700'}`}>
                                                            {emp.name}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] font-black text-white bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg uppercase tracking-[0.15em] opacity-80 group-hover:opacity-100 group-hover:bg-blue-700 transition-all">{emp.designation}</span>
                                                        {isHighAchiever && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest">Star Performance</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-end gap-1 mb-2">
                                                    <span className={`text-2xl font-black leading-none ${emp.efficiency >= 85 ? 'text-emerald-500' : emp.efficiency >= 65 ? 'text-blue-500' : 'text-orange-500'}`}>{emp.efficiency}%</span>
                                                </div>
                                                <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner mb-3">
                                                    <div className={`h-full rounded-full transition-all duration-[1500ms] ${emp.efficiency >= 85 ? 'bg-emerald-500' : emp.efficiency >= 65 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, emp.efficiency)}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-sm uppercase tracking-widest whitespace-nowrap">
                                                    {emp.totalHours || 0} / {emp.expectedHours || 0} Hrs
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-end gap-1 mb-2">
                                                    <span className={`text-2xl font-black leading-none ${emp.consistency >= 85 ? 'text-violet-500' : emp.consistency >= 65 ? 'text-blue-500' : 'text-orange-500'}`}>{emp.consistency}%</span>
                                                </div>
                                                <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner mb-3">
                                                    <div className={`h-full rounded-full transition-all duration-[1500ms] ${emp.consistency >= 85 ? 'bg-violet-500' : emp.consistency >= 65 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${emp.consistency}%` }}></div>
                                                </div>
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-sm uppercase tracking-widest leading-none">
                                                        {emp.logsSubmitted || 0}/{emp.daysPresent || 0} Logs
                                                    </span>
                                                    {emp.avgLateness > 0 && <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 uppercase tracking-tighter">Avg {emp.avgLateness}m Late</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-center">
                                            <div className="inline-flex flex-col items-center p-3 rounded-3xl bg-slate-50 border border-slate-100 shadow-inner group-hover:bg-white transition-all duration-300">
                                                <span className="text-xl font-black text-slate-800 leading-none">{emp.daysPresent}</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Days Present</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-right pr-12">
                                            <button
                                                onClick={() => handleEmployeeSelect(emp.id)}
                                                className="group/btn relative inline-flex items-center justify-center w-14 h-14 bg-white border-2 border-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-2xl transition-all shadow-xl hover:shadow-blue-200 transform active:scale-95 group-hover:translate-x-1 duration-300"
                                            >
                                                <ArrowRight size={24} strokeWidth={3} />
                                                <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-all translate-y-2 group-hover/btn:translate-y-0 uppercase tracking-widest shadow-2xl pointer-events-none whitespace-nowrap">View Full Stats</div>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Team Overview Charts - Moved to Bottom */}
                <div className="p-10 bg-slate-50/50 border-t border-slate-100">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mt-4">
                        <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100 transition-all hover:shadow-3xl hover:-translate-y-1 duration-500 group">
                            <div className="flex items-center gap-5 mb-10">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[20px] shadow-inner group-hover:rotate-6 transition-transform">
                                    <BarChart3 size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-2xl tracking-tighter">Efficiency Benchmarks</h4>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Team comparative metrics</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar-thin pb-4">
                                <div style={{ width: Math.max(800, teamChartData.length * 70) + 'px' }} className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={teamChartData} barSize={40} margin={{ bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '800', fill: '#94a3b8' }} dy={15} />
                                            <YAxis hide />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc', radius: 16 }}
                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)', padding: '16px', backgroundColor: '#fff' }}
                                                itemStyle={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}
                                            />
                                            <Bar dataKey="Efficiency" radius={[12, 12, 12, 12]} animationDuration={2000}>
                                                {teamChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.Efficiency >= 85 ? '#10b981' : entry.Efficiency >= 65 ? '#3b82f6' : '#f59e0b'} fillOpacity={0.9} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200 border border-slate-100 transition-all hover:shadow-3xl hover:-translate-y-1 duration-500 group">
                            <div className="flex items-center gap-5 mb-10">
                                <div className="p-4 bg-violet-50 text-violet-600 rounded-[20px] shadow-inner group-hover:rotate-[-6deg] transition-transform">
                                    <Users size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-2xl tracking-tighter">Consistency Score</h4>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Submission adherence tracking</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar-thin pb-4">
                                <div style={{ width: Math.max(800, teamChartData.length * 70) + 'px' }} className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={teamChartData} barSize={40} margin={{ bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '800', fill: '#94a3b8' }} dy={15} />
                                            <YAxis hide />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc', radius: 16 }}
                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)', padding: '16px', backgroundColor: '#fff' }}
                                                itemStyle={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase' }}
                                            />
                                            <Bar dataKey="Consistency" radius={[12, 12, 12, 12]} fill="#8b5cf6" fillOpacity={0.9} animationDuration={2000} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
