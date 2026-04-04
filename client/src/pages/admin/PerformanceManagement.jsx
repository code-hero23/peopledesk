import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { User, Award, History, Save, X, Search, ChevronRight, BarChart3, Zap, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const PerformanceManagement = () => {
    const { user } = useSelector((state) => state.auth);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [history, setHistory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Score State
    const [scores, setScores] = useState({
        efficiency: 0,
        consistency: 0,
        quality: 0,
        system: 0,
        behaviour: 0,
        remarks: ''
    });

    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setIsLoading(true);
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/admin/employees`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setEmployees(response.data);
        } catch (error) {
            toast.error("Failed to fetch employees");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistory = async (empId) => {
        try {
            setIsHistoryLoading(true);
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/performance/history/${empId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setHistory(response.data);
        } catch (error) {
            toast.error("Failed to fetch performance history");
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleFetchAutomatedMetrics = async () => {
        if (!selectedEmployee) return;
        try {
            setIsCalculating(true);
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/performance/calculate/${selectedEmployee.id}?month=${month}&year=${year}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            
            const { efficiency, consistency } = response.data;
            setScores(prev => ({
                ...prev,
                efficiency,
                consistency
            }));
            toast.success(`Fetched: ${response.data.counts.presentDays} days present, ${response.data.counts.worklogDays} worklogs.`);
        } catch (error) {
            toast.error("Failed to calculate automated metrics");
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSelectEmployee = (emp) => {
        setSelectedEmployee(emp);
        fetchHistory(emp.id);
        // Reset scores for modal
        setScores({
            efficiency: 0,
            consistency: 0,
            quality: 0,
            system: 0,
            behaviour: 0,
            remarks: ''
        });
    };

    const handleSaveScore = async () => {
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            await axios.post(`${baseUrl}/performance/set`, {
                userId: selectedEmployee.id,
                month,
                year,
                ...scores
            }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            toast.success("Performance score saved successfully!");
            setShowModal(false);
            fetchHistory(selectedEmployee.id);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save score");
        }
    };

    const filteredEmployees = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalScorePreview = (
        (scores.efficiency || 0) + 
        (scores.consistency || 0) + 
        (scores.quality || 0) + 
        (scores.system || 0) + 
        (scores.behaviour || 0)
    ).toFixed(1);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div>
                   <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Award className="text-primary" size={24} /> Performance Scoring
                    </h2>
                    <p className="text-slate-500 text-sm">Evaluate employee performance based on weighted categories.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Search employees..."
                        className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee List */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-widest">Active Employees</h3>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-400">Loading...</div>
                        ) : filteredEmployees.map(emp => (
                            <button 
                                key={emp.id}
                                onClick={() => handleSelectEmployee(emp)}
                                className={`w-full flex items-center gap-3 p-4 border-b border-slate-50 dark:border-slate-800 transition-colors text-left
                                    ${selectedEmployee?.id === emp.id ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-950'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white
                                    ${selectedEmployee?.id === emp.id ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                                    {emp.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{emp.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-tight">{emp.designation}</p>
                                </div>
                                <ChevronRight size={16} className={selectedEmployee?.id === emp.id ? 'text-primary' : 'text-slate-300'} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* History & Action Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedEmployee ? (
                        <>
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl">
                                        {selectedEmployee.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold dark:text-white">{selectedEmployee.name}</h3>
                                        <p className="text-slate-500 text-sm uppercase font-bold tracking-tight">{selectedEmployee.designation}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowModal(true)}
                                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-primary/20 transition-all text-sm"
                                >
                                    <BarChart3 size={18} /> Add Performance Score
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-widest flex items-center gap-2">
                                        <History size={14} /> Score History
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[10px] uppercase font-bold">
                                            <tr>
                                                <th className="px-6 py-4">Month/Year</th>
                                                <th className="px-4 py-4 text-center">Effci (20)</th>
                                                <th className="px-4 py-4 text-center">Consis (30)</th>
                                                <th className="px-4 py-4 text-center">Qual (20)</th>
                                                <th className="px-4 py-4 text-center">Sys (15)</th>
                                                <th className="px-4 py-4 text-center">Beh (15)</th>
                                                <th className="px-6 py-4 text-right">Total (100)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {isHistoryLoading ? (
                                                <tr><td colSpan="7" className="text-center py-8 text-slate-400">Loading history...</td></tr>
                                            ) : history.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center py-8 text-slate-400 italic">No scores recorded yet.</td></tr>
                                            ) : history.map(item => (
                                                <tr key={`history-${item.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-950 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                                        {new Date(0, item.month-1).toLocaleString('default', { month: 'long' })} {item.year}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">{item.efficiency}</td>
                                                    <td className="px-4 py-4 text-center">{item.consistency}</td>
                                                    <td className="px-4 py-4 text-center">{item.quality}</td>
                                                    <td className="px-4 py-4 text-center">{item.system}</td>
                                                    <td className="px-4 py-4 text-center">{item.behaviour}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`px-2 py-1 rounded-lg font-black ${item.totalScore >= 80 ? 'bg-emerald-100 text-emerald-700' : item.totalScore >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                            {item.totalScore}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center mb-4 text-slate-300">
                                <User size={40} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Select an Employee</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">Select an employee from the left panel to record or view their performance scores.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Score Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-slate-950/40 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
                        >
                            <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Record Performance Score</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                {/* Date Selection & Auto-Fetch */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-2xl items-end">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Month</label>
                                        <select 
                                            value={month}
                                            onChange={(e) => setMonth(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-bold outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Year</label>
                                        <select 
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-bold outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value={2026}>2026</option>
                                            <option value={2025}>2025</option>
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleFetchAutomatedMetrics}
                                        disabled={isCalculating}
                                        className="w-full bg-slate-900 border border-slate-800 hover:bg-black text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg h-[38px]"
                                    >
                                        <RefreshCw size={16} className={isCalculating ? 'animate-spin' : ''} />
                                        {isCalculating ? 'Fetching...' : 'Auto-Fetch'}
                                    </button>
                                </div>

                                {/* Scoring Inputs */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex justify-between">
                                        Efficiency <span>max 20</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            max={20}
                                            value={scores.efficiency}
                                            onChange={(e) => setScores({ ...scores, efficiency: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <Zap size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex justify-between">
                                        Consistency <span>max 30</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            max={30}
                                            value={scores.consistency}
                                            onChange={(e) => setScores({ ...scores, consistency: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex justify-between">
                                        Quality <span>max 20</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        max={20}
                                        value={scores.quality}
                                        onChange={(e) => setScores({ ...scores, quality: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex justify-between">
                                        System (PD) <span>max 15</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        max={15}
                                        value={scores.system}
                                        onChange={(e) => setScores({ ...scores, system: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex justify-between">
                                        Behaviour <span>max 15</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        max={15}
                                        value={scores.behaviour}
                                        onChange={(e) => setScores({ ...scores, behaviour: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Total Score</label>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2.5 font-black text-primary text-xl shadow-inner">
                                        {totalScorePreview}%
                                    </div>
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Remarks / Feedback</label>
                                    <textarea 
                                        rows={2}
                                        value={scores.remarks}
                                        onChange={(e) => setScores({ ...scores, remarks: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-medium outline-none focus:ring-2 focus:ring-primary text-sm"
                                        placeholder="Add feedback for the employee..."
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-950/50 flex gap-4">
                                <button 
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveScore}
                                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-primary text-white shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Save size={18} /> Save & Publish
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PerformanceManagement;
