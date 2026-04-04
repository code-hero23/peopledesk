import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Award, Target, Zap, ShieldCheck, Heart, Info, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

const MyScoreBoard = () => {
    const { user } = useSelector((state) => state.auth);
    const [scores, setScores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(0); // Index of the latest score

    useEffect(() => {
        fetchMyScores();
    }, []);

    const fetchMyScores = async () => {
        try {
            setIsLoading(true);
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/performance/my-scores`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setScores(response.data);
        } catch (error) {
            console.error("Failed to fetch scores", error);
        } finally {
            setIsLoading(false);
        }
    };

    const currentScore = scores[selectedMonth] || null;

    if (isLoading) return <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Loading ScoreBoard...</div>;

    if (scores.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px] text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
                    <Award size={32} />
                </div>
                <h2 className="text-xl font-bold dark:text-white">No Scores Yet</h2>
                <p className="text-slate-500 text-sm max-w-xs mt-2">Your performance scores for this month haven't been published yet. Check back soon!</p>
            </div>
        );
    }

    const categories = [
        { label: 'Attendance', value: currentScore.attendance, max: 20, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Productivity', value: currentScore.productivity, max: 30, icon: Target, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'Quality', value: currentScore.quality, max: 20, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'System Usage', value: currentScore.system, max: 15, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Behaviour', value: currentScore.behaviour, max: 15, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                   <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">My ScoreBoard</h2>
                   <p className="text-slate-500 font-medium">Performance summary for {new Date(0, currentScore.month - 1).toLocaleString('default', { month: 'long' })} {currentScore.year}</p>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    {scores.slice(0, 3).map((s, idx) => (
                        <button
                            key={`tab-${s.id}`}
                            onClick={() => setSelectedMonth(idx)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all
                                ${selectedMonth === idx 
                                    ? 'bg-primary text-white shadow-lg' 
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            {new Date(0, s.month-1).toLocaleString('default', { month: 'short' })}
                        </button>
                    ))}
                </div>
            </div>

            {/* Total Score Hero */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-4 bg-slate-950 rounded-[40px] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 blur-[100px] rounded-full"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 blur-[80px] rounded-full"></div>
                    
                    <div className="relative z-10">
                        <Award className="text-primary mb-4" size={32} />
                        <h3 className="text-slate-400 uppercase text-[10px] font-black tracking-widest mb-1">Overall Performance</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-7xl font-black">{currentScore.totalScore}</span>
                            <span className="text-primary text-2xl font-black">%</span>
                        </div>
                    </div>

                    <div className="relative z-10 mt-12 bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10">
                        <p className="text-slate-400 text-xs font-semibold mb-2 flex items-center gap-2">
                             <Info size={14} className="text-primary" /> HR Remarks
                        </p>
                        <p className="text-sm font-medium italic leading-relaxed text-slate-200">
                            "{currentScore.remarks || "Keep up the consistent effort. Great focus on system discipline this month."}"
                        </p>
                    </div>
                </div>

                {/* Score Breakdown Grid */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {categories.map((cat, idx) => {
                        const percentage = (cat.value / cat.max) * 100;
                        const CategoryIcon = cat.icon;
                        
                        return (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                key={cat.label} 
                                className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border border-slate-50 dark:border-slate-800 flex flex-col justify-between group hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-current/5 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start">
                                    <div className={`p-3 rounded-2xl ${cat.bg} ${cat.color} transition-transform group-hover:scale-110 duration-300`}>
                                        <CategoryIcon size={22} />
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-slate-800 dark:text-white">{cat.value}<span className="text-slate-300 dark:text-slate-600 text-sm font-bold"> / {cat.max}</span></div>
                                        <div className={`text-[10px] font-black uppercase text-slate-400 group-hover:text-primary transition-colors`}>{cat.label}</div>
                                    </div>
                                </div>
                                <div className="mt-8 space-y-2">
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 1, delay: 0.5 + (idx * 0.1) }}
                                            className={`h-full rounded-full ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter text-slate-400">
                                        <span>Contribution</span>
                                        <span>Weight: {((cat.max / 100) * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Performance Definitions Footer */}
            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[40px] border border-slate-100 dark:border-slate-900 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">How it's Calculated</h4>
                    <p className="text-[12px] text-slate-500 leading-relaxed font-medium">Your total performance is a weighted sum of five key pillars defined by HR management to ensure continuous professional growth.</p>
                </div>
                <div className="space-y-1">
                    <div className="flex gap-2 items-center text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span>80-100%: Excellent / Exceeding</span>
                    </div>
                    <div className="flex gap-2 items-center text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                        <span>60-79%: Satisfactory / Meeting</span>
                    </div>
                    <div className="flex gap-2 items-center text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span>Below 60%: Needs Improvement</span>
                    </div>
                </div>
                <div className="flex items-start gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                     <Info className="text-primary flex-shrink-0" size={16} />
                     <p className="text-[10px] text-slate-500 italic font-medium leading-relaxed">System usage score tracks your daily worklogs, biometric accuracy, and response time on PeopleDesk.</p>
                </div>
            </div>
        </div>
    );
};

export default MyScoreBoard;
