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
        <div className="relative overflow-hidden bg-white p-5 rounded-[24px] shadow-xl shadow-slate-200/50 border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
            {/* Decorative Background Element */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${style.bg} rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700`}></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${style.iconBg} ${style.text} shadow-sm group-hover:rotate-12 transition-transform duration-500`}>
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                    </div>
                </div>

                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-1 group-hover:text-blue-600 transition-colors uppercase">{value}</h3>
                    <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`}></span>
                        <p className="text-[10px] font-bold text-slate-500 tracking-tight leading-tight">
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
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDate = today.getDate();

        let start, end;
        if (currentDate >= 26) {
            start = new Date(currentYear, currentMonth, 26);
            end = new Date(currentYear, currentMonth + 1, 25);
        } else {
            start = new Date(currentYear, currentMonth - 1, 26);
            end = new Date(currentYear, currentMonth, 25);
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
        };
    });

    const [activeTab, setActiveTab] = useState('leaderboard');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTeam = teamOverview.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        dispatch(getTeamOverview(dateRange));
        return () => dispatch(reset());
    }, [dispatch, dateRange]);

    const statsRef = useRef(null);

    useEffect(() => {
        if (selectedEmployee && employeeStats && statsRef.current && activeTab === 'analysis') {
            statsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [employeeStats, selectedEmployee, activeTab]);

    const handleEmployeeSelect = (id) => {
        setSelectedEmployee(id);
        setActiveTab('analysis');
        dispatch(getEmployeeStats({ id, ...dateRange }));
    };

    const handleDownload = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.get(`http://localhost:5000/api/export/analytics`, {
                params: { ...dateRange, userId: selectedEmployee },
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Performance_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
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
        <div className="space-y-8 animate-fade-in pb-12 h-screen flex flex-col overflow-hidden">
            {/* Header - Always Fixed */}
            <div className="flex-shrink-0 flex flex-col xl:flex-row justify-between xl:items-center gap-4 bg-white p-5 rounded-[24px] shadow-lg shadow-slate-200/50 border border-slate-100 relative overflow-hidden group mb-1">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-[100px] -mr-32 -mt-32"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                            <TrendingUp size={20} strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl xl:text-3xl font-black text-slate-800 tracking-tighter">Performance <span className="text-blue-600">Analytics</span></h2>
                    </div>
                    <p className="text-slate-500 font-bold text-[10px] max-w-xl leading-relaxed ml-1">
                        Monitor team productivity, consistency benchmarks, and performance trends.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-[16px] border border-slate-200/60 shadow-inner">
                        <div className="flex items-center gap-2 pl-2">
                            <Calendar size={14} className="text-blue-600" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Start Date</span>
                                <input
                                    type="date"
                                    className="text-[10px] font-black bg-transparent outline-none text-slate-700 w-20 cursor-pointer"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-2 pr-2">
                            <div className="flex flex-col text-right">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter text-right">End Date</span>
                                <input
                                    type="date"
                                    className="text-[10px] font-black bg-transparent outline-none text-slate-700 w-20 text-right cursor-pointer"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="group flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-[16px] shadow-lg hover:shadow-blue-200 transition-all duration-300 font-black text-[10px] active:scale-95"
                    >
                        <Download size={14} className="group-hover:animate-bounce" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex-shrink-0 flex gap-3 px-2">
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs tracking-wide transition-all duration-300 shadow-sm flex items-center gap-2
                        ${activeTab === 'leaderboard'
                            ? 'bg-blue-600 text-white shadow-blue-200 scale-105'
                            : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                    <Users size={16} strokeWidth={2.5} />
                    Team Leaderboard
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs tracking-wide transition-all duration-300 shadow-sm flex items-center gap-2
                        ${activeTab === 'analysis'
                            ? 'bg-blue-600 text-white shadow-blue-200 scale-105'
                            : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                    <BarChart3 size={16} strokeWidth={2.5} />
                    Performance Analysis
                </button>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-hidden relative">

                {/* Team Leaderboard Tab */}
                {activeTab === 'leaderboard' && (
                    <div className="h-full bg-white rounded-[32px] shadow-lg border border-slate-100 flex flex-col overflow-hidden animate-slide-up">
                        <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-slate-50 flex justify-between items-center z-20 relative">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-[14px]">
                                    <Users size={20} strokeWidth={3} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tighter">Ranking Matrix</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live</span>
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-300">
                                    <Search size={14} className="text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search team..."
                                        className="bg-transparent border-none outline-none text-[10px] font-black text-slate-700 placeholder:text-slate-400 w-28 lg:w-40 uppercase tracking-wide"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 z-30">
                                    <tr className="bg-slate-900 shadow-xl">
                                        <th className="pl-6 pr-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] first:rounded-tl-none">
                                            <div className="flex flex-col">
                                                <span className="text-white mb-0.5 text-xs">Employee Profile</span>
                                                <span className="text-[9px] text-slate-500 font-bold lowercase tracking-wider">Details & Role</span>
                                            </div>
                                        </th>
                                        <th className="px-4 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-white uppercase tracking-[0.15em] mb-1">Efficiency</span>
                                                <div className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20 uppercase tracking-wider shadow-sm">
                                                    (Working Hours)
                                                </div>
                                            </div>
                                        </th>
                                        <th className="px-4 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-white uppercase tracking-[0.15em] mb-1">Consistency</span>
                                                <div className="text-[9px] font-black text-violet-400 bg-violet-400/10 px-2 py-1 rounded-lg border border-violet-400/20 uppercase tracking-wider shadow-sm">
                                                    (Logs & Punctuality)
                                                </div>
                                            </div>
                                        </th>
                                        <th className="px-4 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-white uppercase tracking-[0.15em] mb-1">Presence</span>
                                                <span className="text-[9px] text-slate-500 font-black mt-0.5 uppercase tracking-widest">Total Days</span>
                                            </div>
                                        </th>
                                        <th className="px-4 py-4 text-right pr-6 last:rounded-tr-none">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Action</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredTeam.map((emp) => {
                                        const isHighAchiever = emp.efficiency >= 97 && emp.consistency >= 95;

                                        return (
                                            <tr key={emp.id} className={`transition-all duration-300 group relative
                                                ${selectedEmployee === emp.id ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'}
                                            `}>
                                                <td className="pl-6 pr-4 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative group/avatar">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-md duration-300
                                                                ${isHighAchiever
                                                                    ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-orange-200'
                                                                    : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:shadow-blue-200'
                                                                }
                                                            `}>
                                                                {emp.name.charAt(0)}
                                                            </div>
                                                            {isHighAchiever && (
                                                                <div className="absolute -top-2 -right-2 bg-white p-1 rounded-full shadow-lg border border-amber-100 animate-bounce">
                                                                    <Crown size={10} className="text-amber-500 fill-amber-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className={`font-black text-sm leading-tight transition-colors tracking-tight
                                                                    ${isHighAchiever ? 'text-slate-800' : 'text-slate-700 group-hover:text-blue-700'}`}>
                                                                    {emp.name}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[9px] font-black text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md uppercase tracking-[0.15em] opacity-80 group-hover:opacity-100 group-hover:bg-blue-700 transition-all">{emp.designation}</span>
                                                                {isHighAchiever && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 uppercase tracking-widest">Star</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-end gap-1 mb-1">
                                                            <span className={`text-xl font-black leading-none ${emp.efficiency >= 85 ? 'text-emerald-500' : emp.efficiency >= 65 ? 'text-blue-500' : 'text-orange-500'}`}>{emp.efficiency}%</span>
                                                        </div>
                                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner mb-2">
                                                            <div className={`h-full rounded-full transition-all duration-[1000ms] ${emp.efficiency >= 85 ? 'bg-emerald-500' : emp.efficiency >= 65 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, emp.efficiency)}%` }}></div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shadow-sm uppercase tracking-widest whitespace-nowrap">
                                                            {emp.totalHours || 0} / {emp.expectedHours || 0} Hrs
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-end gap-1 mb-1">
                                                            <span className={`text-xl font-black leading-none ${emp.consistency >= 85 ? 'text-violet-500' : emp.consistency >= 65 ? 'text-blue-500' : 'text-orange-500'}`}>{emp.consistency}%</span>
                                                        </div>
                                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner mb-2">
                                                            <div className={`h-full rounded-full transition-all duration-[1000ms] ${emp.consistency >= 85 ? 'bg-violet-500' : emp.consistency >= 65 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${emp.consistency}%` }}></div>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 items-center">
                                                            <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shadow-sm uppercase tracking-widest leading-none">
                                                                {emp.logsSubmitted || 0}/{emp.daysPresent || 0} Logs
                                                            </span>
                                                            {emp.avgLateness > 0 && <span className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 uppercase tracking-tighter mt-1">Avg {emp.avgLateness}m Late</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="inline-flex flex-col items-center p-2 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner group-hover:bg-white transition-all duration-300">
                                                        <span className="text-lg font-black text-slate-800 leading-none">{emp.daysPresent}</span>
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Days</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right pr-6">
                                                    <button
                                                        onClick={() => handleEmployeeSelect(emp.id)}
                                                        className="group/btn relative inline-flex items-center justify-center w-10 h-10 bg-white border-2 border-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-xl transition-all shadow-lg hover:shadow-blue-200 transform active:scale-95 group-hover:translate-x-1 duration-300"
                                                    >
                                                        <ArrowRight size={18} strokeWidth={3} />
                                                        <div className="absolute -top-10 right-0 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover/btn:opacity-100 transition-all translate-y-2 group-hover/btn:translate-y-0 uppercase tracking-widest shadow-xl pointer-events-none whitespace-nowrap">View Stats</div>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Performance Analysis Tab */}
                {activeTab === 'analysis' && (
                    <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-8 animate-slide-up pb-10">
                        {/* Individual Insight (if selected) */}
                        {employeeStats ? (
                            <div ref={statsRef} className="space-y-4">
                                <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-6 rounded-[24px] border border-slate-100 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>
                                    <div className="flex items-center gap-5 w-full md:w-auto">
                                        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl shadow-lg ring-4 ring-blue-50">
                                            {teamOverview.find(e => e.id === selectedEmployee)?.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight">{teamOverview.find(e => e.id === selectedEmployee)?.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider rounded-lg">{teamOverview.find(e => e.id === selectedEmployee)?.designation}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full flex justify-end">
                                        <button
                                            onClick={() => { setSelectedEmployee(null); dispatch(reset()); }}
                                            className="group flex items-center gap-2 text-slate-400 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-all bg-white hover:bg-red-50 px-4 py-2 rounded-xl border border-slate-100 hover:border-red-100 ml-auto md:ml-0"
                                        >
                                            <AlertTriangle size={14} />
                                            Reset View
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                                <div className="bg-white p-6 rounded-[24px] shadow-xl border border-slate-100 relative overflow-hidden">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-black text-slate-800 text-lg tracking-tight">Efficiency Trend</h4>
                                    </div>
                                    <div className="h-[250px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={employeeStats.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: '#94a3b8' }} dy={10} />
                                                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '700', fill: '#94a3b8' }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff' }} itemStyle={{ color: '#818cf8' }} />
                                                <Line type="monotone" dataKey="efficiency" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#fff', stroke: '#6366f1', strokeWidth: 2 }} fill="url(#colorEfficiency)" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-slate-100 border-dashed">
                                <div className="p-6 bg-slate-50 rounded-3xl mb-4">
                                    <Users size={48} className="text-slate-300" />
                                </div>
                                <h3 className="text-xl font-black text-slate-400">Select an employee from Leaderboard</h3>
                                <p className="text-slate-400 font-bold text-xs mt-2">to view detailed performance insights</p>
                                <button onClick={() => setActiveTab('leaderboard')} className="mt-6 px-6 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-100 transition-colors">
                                    Go to Leaderboard
                                </button>
                            </div>
                        )}

                        {/* Team Charts */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-[24px] shadow-xl border border-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <BarChart3 size={18} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="font-black text-slate-800 text-base">Efficiency Benchmarks</h4>
                                </div>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={teamChartData} barSize={24}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '700', fill: '#94a3b8' }} dy={10} />
                                            <Tooltip cursor={{ fill: '#f8fafc', radius: 8 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="Efficiency" radius={[6, 6, 6, 6]}>
                                                {teamChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.Efficiency >= 85 ? '#10b981' : entry.Efficiency >= 65 ? '#3b82f6' : '#f59e0b'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[24px] shadow-xl border border-slate-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                                        <Users size={18} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="font-black text-slate-800 text-base">Consistency Score</h4>
                                </div>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={teamChartData} barSize={24}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '700', fill: '#94a3b8' }} dy={10} />
                                            <Tooltip cursor={{ fill: '#f8fafc', radius: 8 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="Consistency" radius={[6, 6, 6, 6]} fill="#8b5cf6" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
