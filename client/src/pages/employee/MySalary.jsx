import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign, Calendar, AlertCircle, ShieldAlert,
    FileText, TrendingDown, ChevronDown, Info,
    CheckCircle2, Clock, Calculator, Lock, RefreshCw
} from 'lucide-react';

const MySalary = () => {
    const { user } = useSelector((state) => state.auth);
    const [showDetails, setShowDetails] = useState(false);

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

                if (response.data.disabled) {
                    setError("Month Remuneration Cycle is completed for this month");
                    setSummary(null);
                } else if (response.data.message && !response.data.financials) {
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
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"
            />
        </div>
    );

    return (
        <div className="relative overflow-hidden select-none p-4 pb-16 md:p-6 md:pb-20">
            {/* CSS Security Layer */}
            <style dangerouslySetInnerHTML={{
                __html: `
@media print { body { display: none!important; } }
                .security - watermark {
    pointer - events: none;
    background - image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Ctext x='50%25' y='50%25' dy='.35em' fill='rgba(0,0,0,0.03)' font-size='12' font-family='monospace' text-anchor='middle' transform='rotate(-25, 150, 150)'%3E${user.email} | ${ip}%3C/text%3E%3C/svg%3E");
    position: fixed;
    inset: 0;
    z - index: 50;
}
` }} />

            <div className="security-watermark" />

            <div className="relative z-10 max-w-5xl mx-auto space-y-6">

                {/* Header/Selector Bar - Glassmorphism */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center justify-between gap-4 bg-white/40 backdrop-blur-2xl p-4 md:p-5 rounded-2xl border border-white/60 shadow-xl shadow-slate-200/40"
                >
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-200/50">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Remuneration Cycle</p>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Financial Dashboard</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/50 p-2 rounded-3xl border border-white shadow-inner">
                        <div className="flex items-center gap-2 px-2">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent border-none text-sm font-black text-slate-700 px-3 py-2 outline-none cursor-pointer hover:text-blue-600 transition-colors"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                            <div className="w-px h-6 bg-slate-200" />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent border-none text-sm font-black text-slate-700 px-3 py-2 outline-none cursor-pointer hover:text-blue-600 transition-colors"
                            >
                                {[2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        {loading && (
                            <div className="pr-4">
                                <RefreshCw className="animate-spin text-blue-600" size={16} />
                            </div>
                        )}
                    </div>
                </motion.div>

                {error && (() => {
                    const isCycleCompleted = error.toLowerCase().includes('cycle is completed') ||
                        error.toLowerCase().includes('next month cycle') ||
                        error.toLowerCase().includes('remuneration cycle');
                    if (isCycleCompleted) {
                        return (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-12 bg-emerald-50/50 backdrop-blur-md border border-emerald-100 rounded-[3rem] text-center shadow-2xl shadow-emerald-100/20"
                            >
                                <div className="w-20 h-20 bg-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-emerald-600 shadow-inner">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-3xl font-black text-emerald-900 mb-3 tracking-tight">Cycle Finalized! 🌟</h3>
                                <p className="text-emerald-700 font-bold mb-8 text-lg">{error}</p>
                                <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200">
                                    AWAITING NEXT CYCLE...
                                </div>
                            </motion.div>
                        );
                    }
                    return (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-12 bg-rose-50/50 backdrop-blur-md border border-rose-100 rounded-[3rem] text-center shadow-2xl shadow-rose-100/20"
                        >
                            <ShieldAlert className="mx-auto text-rose-500 mb-6" size={48} />
                            <h3 className="text-2xl font-black text-rose-900 mb-2 tracking-tight">Data Unavailable</h3>
                            <p className="text-rose-600 font-bold text-lg mb-4">{error}</p>
                            <p className="text-rose-400 text-sm font-bold opacity-70">Access restricted or records not yet generated for this cycle.</p>
                        </motion.div>
                    );
                })()}

                {summary && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Summary Banner Card */}
                        <div className="relative group">
                            <div className="absolute inset-0 bg-blue-600 rounded-3xl blur-3xl opacity-10 group-hover:opacity-20 transition-opacity" />
                            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-2xl border border-white/5 overflow-hidden">
                                {/* Decorative Gradient Blobs */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] -mr-32 -mt-32" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px] -ml-32 -mb-32" />

                                <div className="relative z-10 w-full md:w-auto">
                                    <div className="flex items-center gap-3 mb-2">
                                        {summary.isManual ? (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-full text-amber-400 text-[9px] font-black uppercase tracking-widest shadow-lg">
                                                <Lock size={10} /> Official Remuneration Access
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md border border-blue-500/30 rounded-full text-blue-300 text-[9px] font-black uppercase tracking-widest">
                                                <RefreshCw size={10} className="animate-spin-slow" /> Real-time Simulation
                                            </div>
                                        )}
                                    </div>
                                    <h1 className="text-4xl font-black tracking-tight mb-1">My Remuneration</h1>
                                    <p className="text-blue-200/60 font-black text-[10px] uppercase tracking-[0.2em]">CYCLE: {summary.cycle.start} — {summary.cycle.end}</p>
                                </div>

                                <div className="relative z-10 bg-white/5 backdrop-blur-2xl px-6 py-5 rounded-2xl border border-white/10 text-right shadow-2xl group-hover:border-white/20 transition-all">
                                    <div className="flex items-center justify-end gap-2 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Allocated Monthly CTC</div>
                                    </div>
                                    <div className="text-4xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                                        ₹{summary.financials.allocatedSalary.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                icon={<Calendar size={22} />}
                                label="Attendance"
                                value={summary.stats.presentDays}
                                sub={`PRESENT OF ${summary.cycle.totalDays} `}
                                color="blue"
                                delay={0.1}
                            />
                            <StatCard
                                icon={<TrendingDown size={22} />}
                                label="Absent Days"
                                value={summary.stats.absentDays}
                                sub="LOP DEDUCTION BASIS"
                                color="amber"
                                delay={0.2}
                            />
                            <StatCard
                                icon={<Clock size={22} />}
                                label="Shortage"
                                value={summary.stats.shortageHours ? `${summary.stats.shortageHours} h` : '0h'}
                                sub="MISSING WORK HOURS"
                                color="rose"
                                delay={0.3}
                            />
                            <StatCard
                                icon={<FileText size={22} />}
                                label="Exceptions"
                                value={`${summary.stats.approvedLeaves}/${summary.stats.approvedPermissions}`}
                                sub="LEAVES & PERMISSIONS"
                                color="indigo"
                                delay={0.4}
                            />
                        </div >

                        {/* Detailed Calculation Toggle Section */}
                        {
                            !summary.isManual && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="bg-slate-50/50 backdrop-blur-sm border border-slate-200/60 rounded-[2.5rem] overflow-hidden"
                                >
                                    <button
                                        onClick={() => setShowDetails(!showDetails)}
                                        className="w-full flex items-center justify-between px-8 py-5 hover:bg-slate-100/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                                <Calculator size={18} />
                                            </div>
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Show Calculation Details</span>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: showDetails ? 180 : 0 }}
                                            className="text-slate-400"
                                        >
                                            <ChevronDown size={20} />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence>
                                        {showDetails && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-8 pt-0 border-t border-slate-200/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Working Hours Math</h4>
                                                        <div className="space-y-2">
                                                            <DetailRow label="Expected (Present Days × 8h)" value={`${summary.stats.presentDays * 8}h`} />
                                                            <DetailRow label="Actual Work Log Hours" value={`${summary.stats.actualWorkingHours}h`} color="text-emerald-600" />
                                                            <DetailRow label="Permission Credit Hours" value={`${summary.stats.permissionCreditHours}h`} color="text-indigo-600" />
                                                            <div className="pt-2 border-t font-black flex justify-between text-xs">
                                                                <span>Net Shortage Hours</span>
                                                                <span className="text-rose-600">{summary.stats.shortageHours}h</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Absenteeism Rules</h4>
                                                        <div className="space-y-2">
                                                            <DetailRow label="Total Absent Days" value={summary.stats.absentDays} />
                                                            <DetailRow label="Global Buffer (Free Leaves)" value="4 Days" />
                                                            <DetailRow label="Net LOP Applied Days" value={Math.max(0, summary.stats.absentDays - 4)} color="text-rose-600" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Formula Constants</h4>
                                                        <div className="space-y-2">
                                                            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-[10px] font-bold text-slate-500 italic leading-relaxed">
                                                                "Shortage Deduction = Shortage Hours × (Allocated / 240 hours)"
                                                            </div>
                                                            <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-[10px] font-bold text-slate-500 italic leading-relaxed">
                                                                "LOP Deduction = LOP Days × (Allocated / 30 days)"
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        }

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Deductions Card */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                                className="lg:col-span-12 xl:col-span-7 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                                    <TrendingDown size={200} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                    <div className="p-2 bg-rose-50 text-rose-600 rounded-xl shadow-sm"><FileText size={20} /></div>
                                    Deduction Breakdown
                                </h3>
                                <div className="space-y-6 relative z-10">
                                    <DeductionRow label="Absenteeism LOP" value={summary.financials.absenteeismDeduction} />
                                    <DeductionRow label="Time Shortage Adjustment" value={summary.financials.shortageDeduction} />

                                    {summary.financials.deductionBreakdown?.map((ded, idx) => (
                                        <DeductionRow key={idx} label={ded.label || 'Other Deduction'} value={parseFloat(ded.amount) || 0} />
                                    ))}

                                    {(!summary.financials.deductionBreakdown || summary.financials.deductionBreakdown.length === 0) && summary.financials.manualDeductions > 0 && (
                                        <DeductionRow label="Variable Management Adjustments" value={summary.financials.manualDeductions} />
                                    )}

                                    <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100 flex justify-between items-center bg-slate-50 -mx-6 px-6 rounded-b-2xl">
                                        <div>
                                            <span className="text-slate-400 font-black text-[9px] uppercase tracking-widest block mb-0.5">Total Impact</span>
                                            <span className="text-slate-600 font-bold text-xs">Aggregated Deductions</span>
                                        </div>
                                        <div className="text-2xl font-black font-mono text-rose-600 px-4 py-1.5 bg-rose-50 rounded-xl border border-rose-100">
                                            - ₹{(summary.financials.absenteeismDeduction + summary.financials.shortageDeduction + summary.financials.manualDeductions).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Payout Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 }}
                                className="lg:col-span-12 xl:col-span-5 bg-gradient-to-br from-emerald-500 to-teal-700 p-8 rounded-2xl shadow-2xl text-white relative overflow-hidden group"
                            >
                                <div className="absolute -bottom-20 -right-20 opacity-10 group-hover:opacity-20 transition-opacity duration-1000 rotate-12">
                                    <DollarSign size={400} strokeWidth={1} />
                                </div>

                                <div className="relative z-10 flex flex-col h-full justify-between min-h-[300px]">
                                    <div>
                                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl w-fit mb-6 shadow-xl border border-white/20">
                                            <DollarSign size={24} />
                                        </div>
                                        <h3 className="text-2xl font-black mb-2 tracking-tight">Net Estimated Payout</h3>
                                        <p className="text-emerald-100/70 font-bold mb-6 leading-relaxed text-xs">The projected on-hand salary after all system logic and management adjustments.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-3xl transform hover:scale-105 transition-transform duration-500">
                                            <div className="text-emerald-600 font-black text-[9px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Final Disbursement Value
                                            </div>
                                            <div className="text-4xl font-black tracking-tighter font-mono text-slate-900 overflow-hidden text-ellipsis">
                                                ₹{summary.financials.onHandSalary.toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-emerald-100/60">
                                            <Info size={16} />
                                            <p className="text-[10px] font-bold italic leading-relaxed">
                                                * Encrypted data transmission active. Your financial records are protected under organizational security policies.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div >
                )}
            </div >
        </div >
    );
};

const StatCard = ({ icon, label, value, sub, color, delay }) => {
    const colorStyles = {
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-amber-50 text-amber-600",
        rose: "bg-rose-50 text-rose-600",
        emerald: "bg-emerald-50 text-emerald-600",
        indigo: "bg-indigo-50 text-indigo-600"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: "spring", stiffness: 100 }}
            className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
        >
            <div className="flex items-center gap-4 mb-4 space-y-1">
                <div className={`p-3 rounded-xl ${colorStyles[color]} group-hover:scale-110 transition-transform shadow-sm`}>{icon}</div>
                <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">{sub}</p>
                    <p className="text-xs font-black text-slate-800 tracking-tight leading-none">{label}</p>
                </div>
            </div>
            <div className="text-3xl font-black tracking-tight font-mono text-slate-900 group-hover:text-blue-600 transition-colors">{value}</div>
        </motion.div>
    );
};

const DetailRow = ({ label, value, color = "text-slate-600" }) => (
    <div className="flex justify-between items-center text-[11px] font-bold">
        <span className="text-slate-400">{label}</span>
        <span className={color}>{value}</span>
    </div>
);

const DeductionRow = ({ label, value }) => (
    <div className="flex justify-between items-center group/row">
        <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-200 group-hover/row:bg-rose-500 transition-colors" />
            <span className="text-sm font-black text-slate-600 group-hover/row:text-slate-900 transition-colors">{label}</span>
        </div>
        <span className="font-mono text-slate-900 font-black text-lg">
            - ₹{value.toLocaleString()}
        </span>
    </div>
);

export default MySalary;
