import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, AlertCircle, Info, CheckCircle2, DollarSign,
    Clock, RefreshCw, FileText, Upload, Download,
    ChevronRight, Calendar, Calculator
} from 'lucide-react';

const SalarySettings = () => {
    const { user } = useSelector((state) => state.auth);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // State for manual upload
    const [uploadMonth, setUploadMonth] = useState(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2);
    const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
    const [selectedFile, setSelectedFile] = useState(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const token = user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            const response = await axios.get(`${baseUrl}/settings`, config);
            setSettings(response.data);
        } catch (err) {
            setError('Failed to fetch settings');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSetting = async (key, value) => {
        try {
            setSaving(true);
            setError('');
            setMessage('');
            const token = user.token;
            const config = {
                headers: { Authorization: `Bearer ${token}` },
            };
            await axios.post(`${baseUrl}/settings`, { key: String(key), value: String(value) }, config);
            setSettings(prev => ({ ...prev, [key]: String(value) }));
            setMessage('Setting updated successfully');
        } catch (err) {
            setError('Failed to update setting');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            setError('Please select an Excel file first');
            return;
        }

        try {
            setUploading(true);
            setError('');
            setMessage('');

            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('month', uploadMonth);
            formData.append('year', uploadYear);

            const token = user.token;
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
            };

            const response = await axios.post(`${baseUrl}/payroll/import-manual`, formData, config);
            setMessage(response.data.message);
            setSelectedFile(null);
            // Clear input
            const fileInput = document.getElementById('manual-payroll-upload');
            if (fileInput) fileInput.value = '';
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to upload payroll data');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        // Simple template logic - in real world this would be a static file or generated blob
        const headers = ["Email", "AllocatedSalary", "AbsenteeismDeduction", "ShortageDeduction", "ManualDeductions", "NetPayout"];
        const csvContent = headers.join(",") + "\n" + "employee@example.com,50000,0,0,0,50000";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'manual_payroll_template.csv';
        a.click();
    };

    const isShortageEnabled = settings.isGlobalShortageDeductionEnabled !== 'false';
    const isDashboardEnabled = settings.isSalaryDashboardEnabled !== 'false';
    const calculationMode = settings.payrollCalculationMode || 'AUTO';

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto pb-20">
            {/* Header section with Premium Glassmorphic style */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 relative"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-indigo-700 to-blue-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
                        <DollarSign size={200} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                                <Calculator className="text-white" size={24} />
                            </div>
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-200">System Configuration</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Salary Control Center</h1>
                        <p className="text-blue-100/70 font-medium mt-2 max-w-md">Manage global payroll logic, automatic deduction triggers, and manual salary overrides.</p>
                    </div>

                    <div className="flex gap-4 relative z-10 w-full md:w-auto">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl flex flex-col justify-center flex-1 md:flex-initial min-w-[160px]">
                            <p className="text-[10px] font-black uppercase text-blue-200 mb-1">Calculation Mode</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${calculationMode === 'AUTO' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                                <span className="text-lg font-black">{calculationMode === 'AUTO' ? 'Automated' : 'Manual Override'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Notifications */}
            <AnimatePresence>
                {(error || message) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 overflow-hidden"
                    >
                        {error && (
                            <div className="p-5 bg-rose-50 border border-rose-100 text-rose-700 rounded-[2rem] flex items-center gap-3 shadow-sm">
                                <div className="p-2 bg-rose-100 rounded-xl"><AlertCircle size={20} /></div>
                                <span className="text-sm font-black">{error}</span>
                            </div>
                        )}
                        {message && (
                            <div className="p-5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-[2rem] flex items-center gap-3 shadow-sm">
                                <div className="p-2 bg-emerald-100 rounded-xl"><CheckCircle2 size={20} /></div>
                                <span className="text-sm font-black">{message}</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Mode Selector Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-12 xl:col-span-5 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden"
                >
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-2">
                                <Calculator className="text-indigo-600" size={24} />
                                Calculation Logic
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">Define how the system generates pay summaries.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => updateSetting('payrollCalculationMode', 'AUTO')}
                            className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${calculationMode === 'AUTO' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-2xl transition-colors ${calculationMode === 'AUTO' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600 shadow-sm'}`}>
                                    <RefreshCw size={24} />
                                </div>
                                <div className="text-left">
                                    <h4 className={`font-black uppercase tracking-wider text-xs mb-1 ${calculationMode === 'AUTO' ? 'text-indigo-900' : 'text-slate-500'}`}>System Automatic</h4>
                                    <p className={`text-xs font-bold leading-tight ${calculationMode === 'AUTO' ? 'text-indigo-600/70' : 'text-slate-400'}`}>Based on attendance, LOP rules, and shortage math.</p>
                                </div>
                            </div>
                            {calculationMode === 'AUTO' && <CheckCircle2 className="text-indigo-600" size={24} />}
                        </button>

                        <button
                            onClick={() => updateSetting('payrollCalculationMode', 'MANUAL')}
                            className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${calculationMode === 'MANUAL' ? 'border-amber-600 bg-amber-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-2xl transition-colors ${calculationMode === 'MANUAL' ? 'bg-amber-600 text-white' : 'bg-white text-slate-400 group-hover:text-slate-600 shadow-sm'}`}>
                                    <FileText size={24} />
                                </div>
                                <div className="text-left">
                                    <h4 className={`font-black uppercase tracking-wider text-xs mb-1 ${calculationMode === 'MANUAL' ? 'text-amber-900' : 'text-slate-500'}`}>Manual Excel Override</h4>
                                    <p className={`text-xs font-bold leading-tight ${calculationMode === 'MANUAL' ? 'text-amber-600/70' : 'text-slate-400'}`}>Admins upload custom values via spreadsheet.</p>
                                </div>
                            </div>
                            {calculationMode === 'MANUAL' && <CheckCircle2 className="text-amber-600" size={24} />}
                        </button>
                    </div>

                    <div className="mt-8 p-4 bg-slate-100/50 rounded-2xl border border-slate-200">
                        <div className="flex gap-3">
                            <div className="mt-0.5"><Info className="text-slate-400" size={16} /></div>
                            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                                <strong>Safety Warning:</strong> Switching to Manual will hide all time-log details from employees and only show the final net payout you upload.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Automation & Secondary Controls Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-12 xl:col-span-7 space-y-8"
                >
                    {/* Manual Upload Section - Animates in when mode is MANUAL */}
                    <AnimatePresence mode="wait">
                        {calculationMode === 'MANUAL' ? (
                            <motion.div
                                key="manual-panel"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                        <Upload className="text-amber-600" size={24} />
                                        Upload Payroll Records
                                    </h3>
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="text-[10px] font-black text-amber-600 flex items-center gap-1.5 hover:translate-x-1 transition-transform"
                                    >
                                        <Download size={14} /> DOWNLOAD TEMPLATE
                                    </button>
                                </div>

                                <form onSubmit={handleFileUpload} className="space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Month</p>
                                            <select
                                                value={uploadMonth}
                                                onChange={(e) => setUploadMonth(parseInt(e.target.value))}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-700 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                {months.map((m, i) => (
                                                    <option key={i} value={i + 1}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Year</p>
                                            <select
                                                value={uploadYear}
                                                onChange={(e) => setUploadYear(parseInt(e.target.value))}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-700 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                {[2024, 2025, 2026].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <input
                                            id="manual-payroll-upload"
                                            type="file"
                                            accept=".xlsx, .xls, .csv"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className={`p-10 border-2 border-dashed rounded-3xl text-center transition-all ${selectedFile ? 'border-amber-500 bg-amber-50' : 'border-slate-200 group-hover:border-amber-300 group-hover:bg-slate-50'}`}>
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${selectedFile ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 text-slate-400 group-hover:text-amber-500'}`}>
                                                {selectedFile ? <FileText size={32} /> : <Upload size={32} />}
                                            </div>
                                            <h4 className="text-sm font-black text-slate-800 mb-1">
                                                {selectedFile ? selectedFile.name : 'Select or Drop Excel File'}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium">Valid formats: .xlsx, .csv (Max 10MB)</p>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={uploading || !selectedFile}
                                        className={`w-full py-4.5 rounded-[1.5rem] font-black text-white shadow-xl transition-all flex items-center justify-center gap-3 ${uploading ? 'bg-slate-400' : selectedFile ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 active:scale-95' : 'bg-slate-200 cursor-not-allowed'}`}
                                    >
                                        {uploading ? (
                                            <RefreshCw className="animate-spin" size={20} />
                                        ) : (
                                            <Upload size={20} />
                                        )}
                                        {uploading ? 'UPLOADING...' : 'START IMPORT SESSION'}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="auto-panel"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                        <Clock className="text-indigo-600" size={24} />
                                        Automation Controls
                                    </h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                                                <DollarSign size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 mb-1">Global Salary Dashboard</h4>
                                                <p className="text-[11px] text-slate-500 font-bold max-w-sm leading-tight">Enable or disable the salary view for all employees. When OFF, the "My Salary" link is hidden.</p>
                                            </div>
                                        </div>

                                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isDashboardEnabled}
                                                onChange={(e) => updateSetting('isSalaryDashboardEnabled', e.target.checked)}
                                                disabled={saving}
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-sm"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                                                <Clock size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-800 mb-1">Time Shortage Deduction</h4>
                                                <p className="text-[11px] text-slate-500 font-bold max-w-sm leading-tight">Apply math for missing working hours globally. When OFF, total shortage is always ₹0.</p>
                                            </div>
                                        </div>

                                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isShortageEnabled}
                                                onChange={(e) => updateSetting('isGlobalShortageDeductionEnabled', e.target.checked)}
                                                disabled={saving}
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 shadow-sm"></div>
                                        </label>
                                    </div>

                                    <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
                                        <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                                            <Info size={14} /> Active Simulation Logic
                                        </h4>
                                        <ul className="space-y-3">
                                            {[
                                                '26th to 25th cycle cutoff is standard.',
                                                '4-day absenteeism buffer applied globally.',
                                                'Permission credits (up to 4/month) used for shortage math.',
                                                'Calculations refresh dynamically on every employee dashboard reload.'
                                            ].map((text, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs font-medium text-indigo-800/70">
                                                    <div className="mt-1 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                                    {text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default SalarySettings;
