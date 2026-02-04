import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getTeamOverview, getEmployeeStats, reset } from '../../features/analytics/analyticsSlice';
import { TrendingUp, Users, Clock, AlertTriangle, Calendar, Search, ArrowRight, Award, BarChart3, LineChart as LineIcon, Download } from 'lucide-react';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, Legend
} from 'recharts';

const KPICard = ({ title, value, subtext, icon: Icon, color, gradient }) => (
    <div className={`relative overflow-hidden bg-white p-6 rounded-3xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110 opacity-50`}></div>
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
                <p className="text-[11px] font-bold text-slate-500 mt-2 bg-slate-50 inline-block px-2 py-1 rounded-lg border border-slate-100">
                    {subtext}
                </p>
            </div>
            <div className={`p-3.5 rounded-2xl bg-${color}-100/50 text-${color}-600 shadow-sm group-hover:rotate-6 transition-transform`}>
                <Icon size={26} strokeWidth={2.5} />
            </div>
        </div>
    </div>
);

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
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Performance Analytics</h2>
                    <p className="text-slate-500 font-medium mt-2 text-sm max-w-lg">
                        Deep dive into team efficiency metrics, consistency scores, and individual performance trends.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="flex items-center gap-3 bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 pl-3">
                            <Calendar size={16} className="text-blue-500" />
                            <input
                                type="date"
                                className="text-xs font-bold bg-transparent outline-none text-slate-700 w-24"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            />
                        </div>
                        <span className="text-slate-300 font-bold">→</span>
                        <div className="flex items-center gap-2 pr-3">
                            <input
                                type="date"
                                className="text-xs font-bold bg-transparent outline-none text-slate-700 w-24 text-right"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl shadow-slate-200 transition-all font-bold text-sm transform hover:-translate-y-0.5"
                    >
                        <Download size={18} />
                        <span className="hidden lg:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Individual Insight (if selected) */}
            {employeeStats && (
                <div ref={statsRef} className="space-y-8 animate-slide-up">
                    <div className="flex items-center gap-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm p-8 rounded-[32px] border border-blue-100/50 shadow-sm">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-blue-200 ring-4 ring-white">
                            {teamOverview.find(e => e.id === selectedEmployee)?.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{teamOverview.find(e => e.id === selectedEmployee)?.name}</h3>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="bg-white/80 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-blue-100">Selected Profile</span>
                                <button onClick={() => setSelectedEmployee(null)} className="text-slate-400 hover:text-red-500 text-xs font-bold underline decoration-dotted transition-colors hover:bg-red-50 px-2 py-1 rounded-lg">Clear Selection</button>
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
                    <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                                    <LineIcon size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-xl tracking-tight">Daily Efficiency Trend</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Last 30 Days Performance</p>
                                </div>
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={employeeStats.dailyTrends}>
                                    <defs>
                                        <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#94a3b8' }} dy={10} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#94a3b8' }} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#fff', padding: '12px 16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                                        itemStyle={{ fontWeight: 'bold', fontSize: '13px', color: '#818cf8' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '11px', fontWeight: 'bold' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="efficiency"
                                        stroke="#6366f1"
                                        strokeWidth={4}
                                        dot={{ r: 0 }}
                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#818cf8' }}
                                        animationDuration={1500}
                                        fill="url(#colorEfficiency)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee Specific Chart */}

            {/* Team Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/60 border border-slate-100 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <BarChart3 size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 text-xl tracking-tight">Efficiency Comparison</h4>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Team-wide Efficiency Metrics</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <div style={{ width: Math.max(800, teamChartData.length * 60) + 'px' }} className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={teamChartData} barSize={48}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#94a3b8' }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip cursor={{ fill: '#f8fafc', radius: 16 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '12px' }} itemStyle={{ fontSize: '13px', fontWeight: 'bold' }} />
                                    <Bar dataKey="Efficiency" radius={[12, 12, 12, 12]} animationDuration={1500}>
                                        {teamChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.Efficiency > 85 ? '#10b981' : entry.Efficiency > 65 ? '#3b82f6' : '#f59e0b'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/60 border border-slate-100 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
                            <Users size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 text-xl tracking-tight">Consistency Score</h4>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Log Submission Consistency</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <div style={{ width: Math.max(800, teamChartData.length * 60) + 'px' }} className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={teamChartData} barSize={48}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#94a3b8' }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip cursor={{ fill: '#f8fafc', radius: 16 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '12px' }} itemStyle={{ fontSize: '13px', fontWeight: 'bold' }} />
                                    <Bar dataKey="Consistency" radius={[12, 12, 12, 12]} fill="#8b5cf6" animationDuration={1500} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Leaderboard/Overview */}
            <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
                <div className="px-10 py-8 bg-white border-b border-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} strokeWidth={2.5} /></span>
                            Team Leaderboard
                        </h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 ml-14">Performance Metrics Matrix</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="pl-10 pr-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Efficiency Score</th>
                                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Consistency</th>
                                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Presence</th>
                                <th className="px-6 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right pr-10">Detailed View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {teamOverview.map((emp) => (
                                <tr key={emp.id} className={`hover:bg-blue-50/40 transition-all duration-300 group ${selectedEmployee === emp.id ? 'bg-blue-50/60' : ''}`}>
                                    <td className="pl-10 pr-6 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-blue-200 group-hover:scale-110 duration-300`}>
                                                {emp.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{emp.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{emp.designation}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-sm font-black mb-2 ${emp.efficiency >= 85 ? 'text-emerald-500' : emp.efficiency >= 65 ? 'text-blue-500' : 'text-orange-500'}`}>{emp.efficiency}%</span>
                                            <div className="w-28 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${emp.efficiency >= 85 ? 'bg-emerald-500' : emp.efficiency >= 65 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${emp.efficiency}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col items-center">
                                            <span className={`text-sm font-black mb-2 ${emp.consistency >= 85 ? 'text-violet-500' : emp.consistency >= 65 ? 'text-blue-500' : 'text-orange-500'}`}>{emp.consistency}%</span>
                                            <div className="w-28 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${emp.consistency >= 85 ? 'bg-violet-500' : emp.consistency >= 65 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${emp.consistency}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-600 transition-all">{emp.daysPresent} Days</span>
                                    </td>
                                    <td className="px-6 py-6 text-right pr-10">
                                        <button
                                            onClick={() => handleEmployeeSelect(emp.id)}
                                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-blue-200 transform group-hover:translate-x-1"
                                        >
                                            <ArrowRight size={18} strokeWidth={3} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
