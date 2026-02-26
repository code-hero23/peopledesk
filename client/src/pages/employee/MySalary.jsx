import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { DollarSign, Calendar, AlertCircle, ShieldAlert, FileText, TrendingDown, ChevronDown } from 'lucide-react';

const MySalary = () => {
    const { user } = useSelector((state) => state.auth);

    // Default to latest completed month
    const getInitialPeriod = () => {
        const d = new Date();
        const istD = d.getUTCDate();
        let m = d.getUTCMonth();
        let y = d.getUTCFullYear();

        if (istD < 26) {
            m -= 1; // Previous month's start anchor
        }
        if (m < 0) { m += 12; y -= 1; }
        return { m: m + 1, y };
    };

    const initial = getInitialPeriod();
    const [selectedMonth, setSelectedMonth] = useState(initial.m);
    const [selectedYear, setSelectedYear] = useState(initial.y);

    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ip, setIp] = useState('');

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                const token = user.token;
                const config = {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { month: selectedMonth, year: selectedYear }
                };
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                const response = await axios.get(`${baseUrl}/payroll/my-summary`, config);

                if (response.data.message && !response.data.financials) {
                    setError(response.data.message);
                    setSummary(null);
                } else {
                    setSummary(response.data);
                    setError(null);
                }

                if (!ip) {
                    try {
                        const ipRes = await axios.get('https://api.ipify.org?format=json');
                        setIp(ipRes.data.ip);
                    } catch (e) {
                        console.error("IP lookup failed", e);
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch salary details');
                setSummary(null);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [user.token, selectedMonth, selectedYear, ip]);

    useEffect(() => {
        const handleContextMenu = (e) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    if (loading && !summary) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="relative overflow-hidden select-none p-6 pb-20">
            {/* CSS Security Layer */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print { body { display: none !important; } }
                .security-watermark {
                    pointer-events: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Ctext x='50%25' y='50%25' dy='.35em' fill='rgba(0,0,0,0.03)' font-size='14' font-family='monospace' text-anchor='middle' transform='rotate(-25, 150, 150)'%3E${user.email} | ${ip}%3C/text%3E%3C/svg%3E");
                    position: absolute;
                    inset: 0;
                    z-index: 50;
                }
            ` }} />

            <div className="security-watermark" />

            <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-fade-in">

                {/* Month/Year Selector Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white/60 backdrop-blur-xl p-5 rounded-[30px] border border-white shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Select Period</p>
                            <h2 className="text-lg font-black text-slate-800 leading-none">Salary Cycle</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-white border-none text-sm font-black text-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-white border-none text-sm font-black text-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 shadow-sm outline-none appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        {loading && <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full ml-2"></div>}
                    </div>
                </div>

                {error && (() => {
                    const isCycleCompleted = error.toLowerCase().includes('cycle is comleted') || error.toLowerCase().includes('next month cycle');
                    if (isCycleCompleted) {
                        return (
                            <div className="p-10 bg-emerald-50 border border-emerald-100 rounded-[40px] text-center shadow-xl shadow-emerald-100/20 animate-fade-in">
                                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-inner">
                                    <Calendar size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-emerald-900 mb-2">Cycle Completed! 🌟</h3>
                                <p className="text-emerald-700 font-bold mb-6">{error}</p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest leading-none">
                                    Next cycle starting soon
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div className="p-8 bg-rose-50 border border-rose-100 rounded-[40px] text-center">
                            <ShieldAlert className="mx-auto text-rose-500 mb-4" size={32} />
                            <p className="text-rose-900 font-black text-lg">{error}</p>
                            <p className="text-rose-500 text-sm font-bold mt-2">Try selecting a different cycle or contact HR.</p>
                        </div>
                    );
                })()}

                {summary && (
                    <>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-8 rounded-[40px] text-white shadow-2xl shadow-blue-200 border border-white/20">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-blue-200 text-sm font-black uppercase tracking-widest">
                                    <ShieldAlert size={14} /> Secure Access Active
                                </div>
                                <h1 className="text-4xl font-black font-display tracking-tight">Financial Summary</h1>
                                <p className="text-blue-200/80 font-bold mt-1">REMUNERATION CYCLE: {summary.cycle.start} — {summary.cycle.end}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20 text-right">
                                <div className="text-xs font-black text-white/60 mb-1 uppercase">Allocated CTC</div>
                                <div className="text-3xl font-black font-mono tracking-tighter">₹{summary.financials.allocatedSalary.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <StatCard icon={<Calendar className="text-blue-500" />} label="Present Days" value={summary.stats.presentDays} sub={`of ${summary.cycle.totalDays} Total`} color="blue" />
                            <StatCard icon={<TrendingDown className="text-amber-500" />} label="Absent Days" value={summary.stats.absentDays} sub="L.O.P. Basis" color="amber" />
                            <StatCard icon={<AlertCircle className="text-rose-500" />} label="Shortage Hrs" value={summary.stats.shortageHours} sub={`${summary.stats.actualWorkingHours}h Worked + ${summary.stats.permissionCreditHours}h Credit`} color="rose" />
                            <StatCard icon={<FileText className="text-emerald-500" />} label="Leaves/Perms" value={`${summary.stats.approvedLeaves}/${summary.stats.approvedPermissions}`} sub={`Max ${summary.stats.permissionCreditHours}h Credit`} color="emerald" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
                                    <FileText size={180} strokeWidth={1} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-slate-100 rounded-2xl text-slate-600"><FileText size={20} /></span>
                                    Deduction Breakdown
                                </h3>
                                <div className="space-y-4 relative z-10">
                                    <DeductionRow label="Absenteeism LOP (Buffer Rule)" value={summary.financials.absenteeismDeduction} />
                                    <DeductionRow label="Time Shortage Deduction" value={summary.financials.shortageDeduction} />

                                    {summary.financials.deductionBreakdown?.map((ded, idx) => (
                                        <DeductionRow key={idx} label={ded.label || 'Other Deduction'} value={parseFloat(ded.amount) || 0} />
                                    ))}

                                    {(!summary.financials.deductionBreakdown || summary.financials.deductionBreakdown.length === 0) && summary.financials.manualDeductions > 0 && (
                                        <DeductionRow label="Fixed Deductions (Admin)" value={summary.financials.manualDeductions} />
                                    )}

                                    <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                                        <span className="text-slate-500 font-bold">Total Salary Deductions</span>
                                        <span className="text-rose-600 font-black font-mono">
                                            ₹{(summary.financials.absenteeismDeduction + summary.financials.shortageDeduction + summary.financials.manualDeductions).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-8 rounded-[40px] shadow-xl text-white relative overflow-hidden group">
                                <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                                    <DollarSign size={240} strokeWidth={1} />
                                </div>
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-white/20 rounded-2xl"><DollarSign size={20} /></span>
                                    Net Payout Estimation
                                </h3>
                                <div className="space-y-2 relative z-10">
                                    <p className="text-emerald-100/80 font-bold mb-1 uppercase text-xs tracking-widest">Calculated On-Hand</p>
                                    <div className="text-6xl font-black tracking-tighter font-mono">
                                        ₹{summary.financials.onHandSalary.toLocaleString()}
                                    </div>
                                    <p className="text-emerald-500 bg-white/90 px-4 py-2 rounded-2xl text-xs font-black inline-block mt-6">
                                        READY FOR PAYOUT
                                    </p>
                                    <p className="text-[10px] text-white/60 mt-4 leading-relaxed italic">
                                        * This summary is an estimation based on present log data. Final values may vary during actual disbursement.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[40px] border border-slate-100 text-center">
                            <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-lg mx-auto">
                                This summary is dynamically generated for <strong>{user.name}</strong> ({user.email}).
                                Unauthorized reproduction or sharing of this dashboard's content is strictly prohibited.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, sub, color }) => (
    <div className={`bg-white p-6 rounded-[35px] border border-slate-100 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] duration-300`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 bg-${color}-50 rounded-2xl`}>{icon}</div>
            <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 leading-none mb-1">{sub}</p>
                <p className="text-sm font-black text-slate-800 leading-none">{label}</p>
            </div>
        </div>
        <div className="text-4xl font-black tracking-tighter font-mono text-slate-900">{value}</div>
    </div>
);

const DeductionRow = ({ label, value }) => (
    <div className="flex justify-between items-center text-rose-50/10">
        <span className="text-sm font-bold text-slate-600">{label}</span>
        <span className="font-mono text-slate-900 font-bold leading-none">- ₹{value.toLocaleString()}</span>
    </div>
);

export default MySalary;
