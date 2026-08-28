import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { getCallStats } from '../../features/admin/adminSlice';
import {
    Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff,
    Calendar, Clock, User, Hash, Search, Filter,
    RefreshCw, ChevronRight, Activity, Smartphone,
    PieChart as PieChartIcon, BarChart3, TrendingUp, Users,
    ArrowLeft, Download, Settings, Save, Info, X as CloseIcon, Mail, Flame,
    Sparkles, Zap, ShieldCheck, CheckCircle2, AlertCircle
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
    const [isMounted, setIsMounted] = useState(false);
    const [isRequestingAllSync, setIsRequestingAllSync] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncStatusData, setSyncStatusData] = useState(null);
    const [isPollingSync, setIsPollingSync] = useState(false);
    const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
    const [simFilter, setSimFilter] = useState('ALL');
    const [syncModalTab, setSyncModalTab] = useState('ALL');
    const [showActivationModal, setShowActivationModal] = useState(false);
    const [adminActivationCode, setAdminActivationCode] = useState(null);
    const [isGeneratingActivationCode, setIsGeneratingActivationCode] = useState(false);
    const [selectedUserForActivation, setSelectedUserForActivation] = useState(null);
    const pollTimeoutRef = useRef(null);

    const handleCreateAdminActivationCode = async (targetUserId = null) => {
        setIsGeneratingActivationCode(true);
        try {
            const token = JSON.parse(localStorage.getItem('user'))?.token;
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const payload = targetUserId ? { userId: targetUserId } : {};
            const res = await axios.post(`${baseUrl}/call-sync/activation-codes`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAdminActivationCode(res.data.code);
            setShowActivationModal(true);
            toast.success('APK activation code generated! Valid for 10 minutes.');
        } catch (err) {
            console.error('Error creating activation code:', err);
            toast.error(err.response?.data?.message || 'Could not generate activation code');
        } finally {
            setIsGeneratingActivationCode(false);
        }
    };

    const formatDeviceName = (rawName) => {
        if (!rawName) return 'Android Device';
        const str = String(rawName).trim();
        if (!str.includes('Mozilla/') && !str.includes('AppleWebKit') && !str.includes('Build/')) {
            return str;
        }

        const androidMatch = str.match(/Android\s+([\d.]+)/i);
        const androidVer = androidMatch ? `Android ${androidMatch[1]}` : 'Android';

        let model = '';
        const buildMatch = str.match(/;\s*([^;]+?)\s+Build\//i);
        if (buildMatch && buildMatch[1]) {
            model = buildMatch[1].trim();
        } else {
            const deviceMatch = str.match(/\(([^)]+)\)/);
            if (deviceMatch && deviceMatch[1]) {
                const parts = deviceMatch[1].split(';').map(s => s.trim());
                const candidate = parts.find(p => !p.startsWith('Linux') && !p.startsWith('Android') && !p.startsWith('wv'));
                if (candidate) model = candidate;
            }
        }

        if (model) {
            return `${androidVer} • ${model}`;
        }

        return `${androidVer} Device`;
    };

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        dispatch(getCallStats({ ...dateRange }));
    }, [dispatch, dateRange]);

    useEffect(() => {
        console.log("Admin Call Stats Data:", callStats);
    }, [callStats]);

    const handleRefresh = () => {
        dispatch(getCallStats({ ...dateRange }));
    };

    const fetchBulkStatusOnce = async () => {
        try {
            setIsRefreshingStatus(true);
            const token = JSON.parse(localStorage.getItem('user')).token;
            const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');
            const statusRes = await axios.get(`${baseUrl}/call-sync/status-all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSyncStatusData(statusRes.data);
            dispatch(getCallStats({ ...dateRange }));
            return statusRes.data;
        } catch (err) {
            console.error('Failed fetching bulk sync status:', err);
            return null;
        } finally {
            setIsRefreshingStatus(false);
        }
    };

    const pollBulkStatus = async (token, baseUrl, startTime) => {
        try {
            const statusRes = await axios.get(`${baseUrl}/call-sync/status-all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = statusRes.data;
            setSyncStatusData(data);

            const elapsedTime = Date.now() - startTime;
            if (data.pendingDevices === 0 || elapsedTime >= 180000) {
                setIsPollingSync(false);
                setIsRequestingAllSync(false);
                dispatch(getCallStats({ ...dateRange }));
                if (data.pendingDevices === 0) {
                    toast.success('All employee devices synced call logs successfully!');
                } else {
                    toast.info(`Sync polling cycle ended. ${data.syncedDevices}/${data.totalDevices} devices synced so far.`);
                }
            } else {
                pollTimeoutRef.current = setTimeout(() => pollBulkStatus(token, baseUrl, startTime), 3000);
            }
        } catch (err) {
            console.error('Failed polling bulk sync status:', err);
            setIsPollingSync(false);
            setIsRequestingAllSync(false);
        }
    };

    const handleRequestAllSync = async () => {
        try {
            if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current);
                pollTimeoutRef.current = null;
            }
            setIsRequestingAllSync(true);
            setShowSyncModal(true);
            setSyncStatusData(null);
            setIsPollingSync(true);

            const token = JSON.parse(localStorage.getItem('user')).token;
            const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');

            const response = await axios.post(`${baseUrl}/call-sync/request-sync-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.info(response.data.message || 'Sync trigger sent to all employee devices');
            const startTime = Date.now();
            pollBulkStatus(token, baseUrl, startTime);
        } catch (error) {
            console.error('Bulk sync request failed:', error);
            toast.error(error.response?.data?.message || 'Failed to request sync for all employees');
            setIsRequestingAllSync(false);
            setIsPollingSync(false);
        }
    };

    const handleRequestSingleDeviceSync = async (userId, userName) => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');
            await axios.post(`${baseUrl}/call-sync/request-sync`, { userId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Sync request re-sent to ${userName || 'employee'}'s device`);
            fetchBulkStatusOnce();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed requesting sync for ${userName || 'employee'}`);
        }
    };

    useEffect(() => {
        if (!showSyncModal && pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
            setIsPollingSync(false);
            setIsRequestingAllSync(false);
        }
    }, [showSyncModal]);

    // Data Processing
    const normalize = (num) => String(num || "").replace(/\D/g, "").slice(-10);
    const normalizeDesignation = (value) => String(value || '').toUpperCase();
    const isCreFamilyDesignation = (value) => {
        const designation = normalizeDesignation(value);
        return (
            designation.includes('CRE') ||
            designation.includes('RELATIONSHIP') ||
            designation.includes('CLIENT-CARE') ||
            designation.includes('CLIENT CARE') ||
            designation.includes('CUSTOMER-RELATIONSHIP') ||
            designation.includes('CUSTOMER REL')
        );
    };

    const employeeMetrics = callStats.reduce((acc, log) => {
        const key = log.empId || (typeof log.user === 'object' ? log.user?.id : log.userId) || 'unknown';
        const rawName = typeof log.user === 'object' ? log.user?.name : (log.user || log.userName);
        const userName = typeof rawName === 'string' ? rawName : "Unknown Personnel";
        const rawDesg = typeof log.user === 'object' ? log.user?.designation : (log.designation || 'OTHER');
        const userDesignation = typeof rawDesg === 'string' ? rawDesg : 'OTHER';

        if (!acc[key]) {
            acc[key] = {
                name: userName,
                empId: log.empId,
                designation: userDesignation,
                totalCalls: 0,
                incoming: 0,
                outgoing: 0,
                missed: 0,
                duration: 0,
                lastSync: log.lastSync,
                logs: []
            };
        } else {
            const logTime = log.lastSync ? new Date(log.lastSync).getTime() : 0;
            const currTime = acc[key].lastSync ? new Date(acc[key].lastSync).getTime() : 0;
            if (logTime > currTime) {
                acc[key].lastSync = log.lastSync;
            }
            if (acc[key].name === "Unknown Personnel" && userName !== "Unknown Personnel") {
                acc[key].name = userName;
            }
        }

        const calls = log.calls || [];
        const normExcluded = (excludedNumbers || []).map(normalize);
        const filteredCalls = calls.filter(c => {
            if (!c || !c.number) return false;
            return !normExcluded.includes(normalize(c.number));
        });
        
        acc[key].totalCalls += filteredCalls.length;
        acc[key].logs.push(...calls.map(c => ({ ...c, dateFormatted: log.date })));

        filteredCalls.forEach(c => {
            if (c.type === 'INCOMING') acc[key].incoming++;
            if (c.type === 'OUTGOING') acc[key].outgoing++;
            if (c.type === 'MISSED' || c.type === 'REJECTED') acc[key].missed++;
            acc[key].duration += (c.duration || 0);
        });

        return acc;
    }, {});

    const metricsArray = Object.values(employeeMetrics).sort((a, b) => b.totalCalls - a.totalCalls);

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
            
            const response = await fetch(`${baseUrl}/export/call-stats?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&simFilter=${simFilter}`, {
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
                simFilter,
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

    const filteredMetrics = metricsArray.filter(m => (typeof m.name === 'string' ? m.name : "Unknown Personnel").toLowerCase().includes((searchTerm || '').toLowerCase()));
    const creMetrics = filteredMetrics.filter((m) => isCreFamilyDesignation(typeof m.designation === 'string' ? m.designation : ''));
    const faMetrics = filteredMetrics.filter((m) => {
        const d = (typeof m.designation === 'string' ? m.designation : '').toUpperCase();
        return !isCreFamilyDesignation(d) && (d.includes('FA') || d.includes('FIELD ASSISTANT') || d.includes('FINANCIAL ASSISTANT'));
    });
    const laMetrics = filteredMetrics.filter((m) => {
        const d = (typeof m.designation === 'string' ? m.designation : '').toUpperCase();
        return !isCreFamilyDesignation(d) && !faMetrics.includes(m) && (d.includes('LA') || d.includes('LEGAL ASSISTANT') || d.includes('LOAN ASSISTANT') || d.includes('LAND ASSISTANT'));
    });
    const otherEmployeeMetrics = filteredMetrics.filter((m) => {
        return !creMetrics.includes(m) && !faMetrics.includes(m) && !laMetrics.includes(m);
    });

    // Chart Data
    const barData = metricsArray.slice(0, 10).map(m => {
        const safeName = typeof m.name === 'string' ? m.name : "Unknown";
        return {
            name: safeName.split(' ')[0],
            Calls: m.totalCalls,
            TalkTime: Math.round(m.duration / 60)
        };
    });

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
        const normExcluded = (excludedNumbers || []).map(normalize);
        const filteredCalls = calls.filter(c => {
            if (!c.number) return false;
            return !normExcluded.includes(normalize(c.number));
        });

        globalStats.total += filteredCalls.length;
        filteredCalls.forEach(c => {
            if (c.type === 'INCOMING') globalStats.incoming++;
            if (c.type === 'OUTGOING') globalStats.outgoing++;
            if (c.type === 'MISSED') globalStats.missed++;
            if (c.type === 'REJECTED') globalStats.rejected++;
            globalStats.duration += (c.duration || 0);
            globalStats.uniqueNumbers.add(c.number);
        });
    });

    const globalPieData = [
        { name: 'Incoming', value: globalStats.incoming, color: '#10b981' },
        { name: 'Outgoing', value: globalStats.outgoing, color: '#3b82f6' },
        { name: 'Missed', value: globalStats.missed, color: '#f43f5e' },
        { name: 'Rejected', value: globalStats.rejected, color: '#f59e0b' }
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
            <div className="flex flex-col items-center justify-center min-h-[550px] space-y-6">
                <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
                    <Activity size={24} className="text-blue-600 absolute animate-pulse" />
                </div>
                <div className="text-center space-y-1">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Aggregating Call Intelligence</h3>
                    <p className="text-xs text-slate-400 font-medium">Fetching real-time call logs and device synchronization metrics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
            {/* Executive Header Banner */}
            <header className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] text-white shadow-2xl border border-slate-800/80 overflow-hidden">
                {/* Background ambient glow shapes */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Title Block */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25 ring-4 ring-white/10">
                                <BarChart3 className="text-white" size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white">Call Analytics</h1>
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                                        <Sparkles size={10} className="animate-pulse" /> LIVE
                                    </span>
                                </div>
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em] mt-0.5">
                                    CRE & Client Care Intelligence Hub
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date Range Picker Pill */}
                        <div className="flex items-center gap-2 bg-slate-900/90 p-2 px-3 rounded-2xl border border-slate-700/80 shadow-inner">
                            <Calendar size={15} className="text-blue-400 shrink-0" />
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer [color-scheme:dark]"
                            />
                            <span className="text-slate-500 font-black text-[9px] uppercase px-1">TO</span>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer [color-scheme:dark]"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => {
                                    setShowActivationModal(true);
                                    if (!adminActivationCode) {
                                        handleCreateAdminActivationCode();
                                    }
                                }}
                                disabled={isGeneratingActivationCode}
                                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-900/30 active:scale-95 flex items-center gap-2 font-bold text-xs disabled:opacity-50"
                                title="Get 6-Digit APK Activation Code for Mobile Call Sync"
                            >
                                <Smartphone size={16} className={isGeneratingActivationCode ? 'animate-pulse' : ''} />
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                    {isGeneratingActivationCode ? 'Generating...' : 'Get APK Code'}
                                </span>
                            </button>

                            <button
                                onClick={handleRequestAllSync}
                                disabled={isRequestingAllSync}
                                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white rounded-2xl transition-all shadow-lg shadow-cyan-900/30 active:scale-95 flex items-center gap-2 font-bold text-xs disabled:opacity-50"
                                title="Request Sync For All Enrolled Employees"
                            >
                                <Smartphone size={16} className={isRequestingAllSync ? 'animate-pulse' : ''} />
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                    {isRequestingAllSync ? 'Syncing...' : 'Sync All'}
                                </span>
                            </button>

                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="p-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-2xl transition-all border border-slate-700/80 active:scale-95 flex items-center gap-1.5 font-bold text-xs disabled:opacity-50"
                                title="Export Analytics to Excel"
                            >
                                <Download size={16} className={isExporting ? 'animate-bounce text-emerald-400' : 'text-emerald-400'} />
                                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Export</span>
                            </button>

                            <button
                                onClick={() => setShowEmailModal(true)}
                                className="p-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-2xl transition-all border border-slate-700/80 active:scale-95 flex items-center gap-1.5 font-bold text-xs"
                                title="Email Performance Report"
                            >
                                <Mail size={16} className="text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Email</span>
                            </button>

                            <button
                                onClick={() => setShowExcludedSettings(true)}
                                className="p-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-2xl transition-all border border-slate-700/80 active:scale-95 flex items-center gap-1.5 font-bold text-xs"
                                title="Manage Excluded Numbers"
                            >
                                <Settings size={16} className="text-amber-400" />
                                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Exclusions</span>
                            </button>

                            <button
                                onClick={handleRefresh}
                                className="p-2.5 bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700 rounded-2xl transition-all border border-slate-700/80 active:scale-90"
                                title="Refresh Data"
                            >
                                <RefreshCw size={16} className={isLoading ? 'animate-spin text-blue-400' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Modal: Exclusion Settings */}
            <AnimatePresence>
                {showExcludedSettings && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md">
                                        <Settings size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Exclusion Ledger</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Contact Filtering</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowExcludedSettings(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors">
                                    <CloseIcon size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex gap-3 text-amber-800 dark:text-amber-300">
                                    <Info size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-xs font-semibold leading-relaxed">
                                        Enter phone numbers separated by commas. These numbers will be <strong>excluded</strong> from unique calculations across all reports.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Excluded Numbers List</label>
                                    <textarea
                                        value={tempExcludedNumbers}
                                        onChange={(e) => setTempExcludedNumbers(e.target.value)}
                                        placeholder="+919876543210, +919988776655..."
                                        className="w-full h-36 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 outline-none focus:ring-2 ring-blue-500/30 transition-all font-mono text-xs text-slate-700 dark:text-slate-200 resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSavingSettings}
                                    className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-blue-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSavingSettings ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isSavingSettings ? "Saving Exclusion List..." : "Save Exclusions"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!selectedEmployee ? (
                <>
                    {/* Analytics Summary & Charts Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                        {/* KPI Metric Boxes */}
                        <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
                            <MetricBox label="Global Volume" value={globalStats.total} color="blue" icon={Activity} />
                            <MetricBox label="Active Personnel" value={metricsArray.length} color="purple" icon={Users} />
                            <MetricBox label="Incoming Calls" value={globalStats.incoming} color="emerald" icon={PhoneIncoming} />
                            <MetricBox label="Outgoing Calls" value={globalStats.outgoing} color="sky" icon={PhoneOutgoing} />
                            <MetricBox label="Missed Calls" value={globalStats.missed} color="rose" icon={PhoneMissed} />
                            <MetricBox label="Rejected Calls" value={globalStats.rejected} color="amber" icon={PhoneMissed} />
                            <div className="col-span-2">
                                <MetricBox label="Total Talk Time" value={formatDuration(globalStats.duration)} color="fuchsia" icon={Clock} />
                            </div>
                        </div>

                        {/* Visual Donut Chart Card */}
                        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between min-h-[340px]">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-slate-800 dark:text-slate-200 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                    <PieChartIcon className="text-emerald-500" size={14} /> Global Breakdown
                                </h3>
                            </div>
                            <div className="flex-1 w-full min-h-[220px] flex items-center justify-center">
                                {(isMounted && globalPieData.length > 0) ? (
                                    <ResponsiveContainer width="100%" height={220} minWidth={0}>
                                        <PieChart>
                                            <Pie
                                                data={globalPieData}
                                                cx="50%" cy="50%"
                                                innerRadius={48} outerRadius={78}
                                                paddingAngle={4} dataKey="value"
                                                stroke="none"
                                            >
                                                {globalPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    color: '#fff',
                                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                                                    fontSize: '11px',
                                                    fontWeight: '700'
                                                }}
                                            />
                                            <Legend
                                                iconType="circle"
                                                iconSize={8}
                                                wrapperStyle={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.05em' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center opacity-50 space-y-2 py-8">
                                        <PieChartIcon className="text-slate-300 dark:text-slate-600" size={40} />
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">No Signals Detected</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top Performers Bar Chart Card */}
                        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between min-h-[340px]">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-slate-800 dark:text-slate-200 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                    <BarChart3 className="text-blue-500" size={14} /> Top Performers (Volume)
                                </h3>
                            </div>
                            <div className="flex-1 w-full min-h-[220px]">
                                {barData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220} minWidth={0}>
                                        <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '700', fill: '#94a3b8' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '700', fill: '#94a3b8' }} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    color: '#fff',
                                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                                                    fontSize: '11px',
                                                    fontWeight: '700'
                                                }}
                                                cursor={{ fill: 'rgba(241, 245, 249, 0.08)' }}
                                            />
                                            <Bar dataKey="Calls" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center opacity-50 space-y-2 py-8">
                                        <BarChart3 className="text-slate-300 dark:text-slate-600" size={40} />
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">No Performance Data</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Personnel Engagement Matrix Table Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                        {/* Table Controls Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-900/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                        Personnel Engagement Matrix
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {filteredMetrics.length} Active Personnel Enrolled
                                    </p>
                                </div>
                            </div>
                            <div className="relative group w-full md:w-80">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Filter personnel by name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 ring-blue-500/30 transition-all font-bold text-xs text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        </div>

                        {/* Table View */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100/60 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-slate-800/60">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Personnel</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Calls Volume</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Call Distribution (In / Out / Missed)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Talk Duration</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {[
                                        { title: 'CRE / CLIENT CARE', employees: creMetrics, badgeColor: 'bg-blue-500' },
                                        { title: 'FA', employees: faMetrics, badgeColor: 'bg-emerald-500' },
                                        { title: 'LA', employees: laMetrics, badgeColor: 'bg-purple-500' },
                                        { title: 'EMPLOYEE', employees: otherEmployeeMetrics, badgeColor: 'bg-amber-500' }
                                    ].map((section) => (
                                        section.employees.length > 0 ? [
                                            <tr key={`${section.title}-header`} className="bg-slate-50/80 dark:bg-slate-950/80">
                                                <td colSpan="5" className="px-6 py-3.5 border-y border-slate-200/60 dark:border-slate-800/60">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${section.badgeColor}`}></span>
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                                                            {section.title}
                                                        </span>
                                                        <span className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                            {section.employees.length}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>,
                                            ...section.employees.map((metrics) => (
                                                <tr key={metrics.empId} className="group hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shrink-0">
                                                                {(typeof metrics.name === 'string' ? metrics.name : "U").charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                                    {typeof metrics.name === 'string' ? metrics.name : "Unknown Personnel"}
                                                                </span>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] font-mono text-slate-400">{metrics.empId}</span>
                                                                    {metrics.lastSync && (new Date() - new Date(metrics.lastSync)) < 30 * 60 * 1000 ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800 text-[8px] font-bold uppercase tracking-wider">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                                                                            LIVE • {new Date(metrics.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md text-[8px] font-bold uppercase tracking-wider">
                                                                            OFFLINE • {metrics.lastSync ? new Date(metrics.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'NEVER'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-black text-slate-800 dark:text-slate-100">{metrics.totalCalls}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-40 space-y-1.5">
                                                            <div className="flex gap-0.5 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                                                <div className="bg-emerald-500 rounded-l-full h-full transition-all" style={{ width: `${metrics.totalCalls > 0 ? (metrics.incoming / metrics.totalCalls) * 100 : 0}%` }}></div>
                                                                <div className="bg-blue-500 h-full transition-all" style={{ width: `${metrics.totalCalls > 0 ? (metrics.outgoing / metrics.totalCalls) * 100 : 0}%` }}></div>
                                                                <div className="bg-rose-500 rounded-r-full h-full transition-all" style={{ width: `${metrics.totalCalls > 0 ? (metrics.missed / metrics.totalCalls) * 100 : 0}%` }}></div>
                                                            </div>
                                                            <div className="flex justify-between text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                                                <span className="text-emerald-600 dark:text-emerald-400">{metrics.incoming} In</span>
                                                                <span className="text-blue-600 dark:text-blue-400">{metrics.outgoing} Out</span>
                                                                <span className="text-rose-600 dark:text-rose-400">{metrics.missed} Missed</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            <Clock size={13} className="text-blue-500" />
                                                            {formatDuration(metrics.duration)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setSelectedEmployee(metrics)}
                                                            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-500 rounded-xl transition-all active:scale-95"
                                                            title="Inspect Employee Call Logs"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ] : null
                                    ))}
                                    {creMetrics.length === 0 && faMetrics.length === 0 && laMetrics.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                                                No matching employees found for current search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Modal: Email Report */}
                    <AnimatePresence>
                        {showEmailModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                    className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden"
                                >
                                    <button 
                                        onClick={() => setShowEmailModal(false)}
                                        className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        <CloseIcon size={18} />
                                    </button>

                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <Mail size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Email Analytics Report</h2>
                                            <p className="text-slate-400 font-medium text-xs">Dispatch formatted summary to destination address</p>
                                        </div>

                                        <div className="w-full space-y-3 pt-2">
                                            <input 
                                                type="email"
                                                value={emailAddress}
                                                onChange={(e) => setEmailAddress(e.target.value)}
                                                placeholder="Enter recipient email..."
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 ring-indigo-500/30 transition-all"
                                            />
                                            <button 
                                                onClick={handleEmailReport}
                                                disabled={isEmailing}
                                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isEmailing ? (
                                                    <><RefreshCw className="animate-spin" size={14} /> Transmitting...</>
                                                ) : (
                                                    <><Activity size={14} /> Send Email Report</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            ) : (() => {
                const getCallSimLabel = (c) => {
                    const label = String(c.simLabel || "").trim();
                    if (label && label.toLowerCase() !== 'unknown' && label.toLowerCase() !== 'null') {
                        return label;
                    }
                    return c.simSlot ? `SIM ${c.simSlot}` : 'N/A';
                };

                const uniqueLabels = [...new Set(selectedEmployee.logs.map(getCallSimLabel))].filter(l => l !== 'N/A');

                const normExcluded = (excludedNumbers || []).map(normalize);
                const employeeFilteredLogs = selectedEmployee.logs
                    .filter(c => {
                        if (!c.number) return false;
                        return !normExcluded.includes(normalize(c.number));
                    })
                    .filter(c => {
                        if (simFilter === 'ALL') return true;
                        return getCallSimLabel(c).toLowerCase() === simFilter.toLowerCase();
                    });

                const numberCallCounts = employeeFilteredLogs.reduce((acc, c) => {
                    const norm = normalize(c.number);
                    if (norm) {
                        acc[norm] = (acc[norm] || 0) + 1;
                    }
                    return acc;
                }, {});

                const localMetrics = {
                    total: employeeFilteredLogs.length,
                    incoming: employeeFilteredLogs.filter(c => c.type === 'INCOMING').length,
                    outgoing: employeeFilteredLogs.filter(c => c.type === 'OUTGOING').length,
                    missed: employeeFilteredLogs.filter(c => c.type === 'MISSED' || c.type === 'REJECTED').length,
                    unattendedOutgoing: employeeFilteredLogs.filter(c => c.type === 'OUTGOING' && (c.duration === 0 || c.duration === '0' || !c.duration)).length,
                    uniqueLeads: new Set(employeeFilteredLogs.map(c => normalize(c.number))).size,
                    duration: employeeFilteredLogs.reduce((acc, c) => acc + (c.duration || 0), 0)
                };

                const localPieData = [
                    { name: 'Incoming', value: localMetrics.incoming, color: '#10b981' },
                    { name: 'Outgoing', value: localMetrics.outgoing, color: '#3b82f6' },
                    { name: 'Missed', value: localMetrics.missed, color: '#f43f5e' }
                ].filter(d => d.value > 0);

                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        {/* Drill-down Header Toolbar */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <button
                                onClick={() => {
                                    setSelectedEmployee(null);
                                    setSimFilter('ALL');
                                }}
                                className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 font-black text-xs uppercase tracking-wider bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
                            >
                                <ArrowLeft size={16} /> Back to Command Matrix
                            </button>

                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <Filter size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SIM Filter:</span>
                                <select
                                    value={simFilter}
                                    onChange={(e) => setSimFilter(e.target.value)}
                                    className="bg-transparent text-xs font-black text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                                >
                                    <option value="ALL">All SIM Slots</option>
                                    {uniqueLabels.map(label => (
                                        <option key={label} value={label}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Side: Employee Profile & Donut */}
                            <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col items-center">
                                <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-3 shadow-lg shadow-blue-500/20">
                                    {(typeof selectedEmployee.name === 'string' ? selectedEmployee.name : "U").charAt(0)}
                                </div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight text-center">
                                    {typeof selectedEmployee.name === 'string' ? selectedEmployee.name : "Unknown Personnel"}
                                </h2>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-4 text-center">
                                    {selectedEmployee.empId} • {selectedEmployee.designation || 'Personnel'}
                                    {selectedEmployee.lastSync && (
                                        <span className="block mt-1 text-[9px] text-blue-500 font-mono">
                                            LAST SYNC: {new Date(selectedEmployee.lastSync).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                        </span>
                                    )}
                                </p>

                                <button
                                    onClick={() => {
                                        const targetId = selectedEmployee.id || selectedEmployee.userId;
                                        setSelectedUserForActivation(selectedEmployee);
                                        handleCreateAdminActivationCode(targetId);
                                    }}
                                    disabled={isGeneratingActivationCode}
                                    className="mb-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Smartphone size={14} /> Get APK Activation Code
                                </button>

                                <div className="w-full space-y-4">
                                    <div className="h-[220px] w-full">
                                        {(isMounted && selectedEmployee) && (
                                            <ResponsiveContainer width="100%" height={220} minWidth={0}>
                                                <PieChart>
                                                    <Pie
                                                        data={localPieData}
                                                        cx="50%" cy="50%"
                                                        innerRadius={50} outerRadius={72}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {localPieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            color: '#fff',
                                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                                                            fontSize: '11px',
                                                            fontWeight: '700'
                                                        }}
                                                    />
                                                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: '800' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Metrics Grid + Raw Call Logs Table */}
                            <div className="lg:col-span-8 space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <MetricBox label="Logged Calls" value={localMetrics.total} color="blue" icon={Hash} />
                                    <MetricBox label="Incoming" value={localMetrics.incoming} color="emerald" icon={PhoneIncoming} />
                                    <MetricBox label="Outgoing" value={localMetrics.outgoing} color="sky" icon={PhoneOutgoing} />
                                    <MetricBox label="Missed" value={localMetrics.missed} color="rose" icon={PhoneMissed} />
                                    <MetricBox label="Unattended" value={localMetrics.unattendedOutgoing} color="amber" icon={PhoneOff} />
                                    <MetricBox label="Unique Leads" value={localMetrics.uniqueLeads} color="indigo" icon={User} />
                                    <div className="col-span-2 sm:col-span-3">
                                        <MetricBox label="Session Duration" value={formatDuration(localMetrics.duration)} color="fuchsia" icon={Clock} />
                                    </div>
                                </div>

                                {/* Raw Call Logs Table */}
                                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
                                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
                                        <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="text-blue-500" size={16} /> Call Transmission Logs
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Total: {employeeFilteredLogs.length} Records
                                        </span>
                                    </div>

                                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-100/60 dark:bg-slate-950/60 sticky top-0 z-10 border-b border-slate-200/60 dark:border-slate-800/60">
                                                <tr>
                                                    <th className="px-6 py-3.5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Type</th>
                                                    <th className="px-6 py-3.5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Phone / Contact</th>
                                                    <th className="px-6 py-3.5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">SIM Slot</th>
                                                    <th className="px-6 py-3.5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Timestamp</th>
                                                    <th className="px-6 py-3.5 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Duration</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                                {[...employeeFilteredLogs]
                                                    .sort((a, b) => {
                                                        const normA = normalize(a.number);
                                                        const normB = normalize(b.number);
                                                        const countA = numberCallCounts[normA] || 0;
                                                        const countB = numberCallCounts[normB] || 0;
                                                        const freqA = countA > 3 ? 1 : 0;
                                                        const freqB = countB > 3 ? 1 : 0;

                                                        if (freqA !== freqB) return freqB - freqA;

                                                        const timeA = new Date(a.date).getTime() || 0;
                                                        const timeB = new Date(b.date).getTime() || 0;
                                                        return timeB - timeA;
                                                    })
                                                    .map((call, idx) => {
                                                        const normNum = normalize(call.number);
                                                        const callCount = numberCallCounts[normNum] || 0;
                                                        const isFrequent = callCount > 3;

                                                        return (
                                                            <tr 
                                                                key={idx} 
                                                                className={`transition-colors ${
                                                                    isFrequent 
                                                                        ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-500' 
                                                                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                                                                }`}
                                                            >
                                                                <td className="px-6 py-3.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`p-1 rounded-md ${call.type === 'OUTGOING' ? 'bg-blue-50 text-blue-600' : call.type === 'INCOMING' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                            {call.type === 'OUTGOING' ? <PhoneOutgoing size={12} /> : call.type === 'INCOMING' ? <PhoneIncoming size={12} /> : <PhoneMissed size={12} />}
                                                                        </div>
                                                                        <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">{call.type}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3.5">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-xs font-black ${isFrequent ? 'text-amber-900 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                                {call.number}
                                                                            </span>
                                                                            {isFrequent && (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white uppercase tracking-wider shadow-sm">
                                                                                    <Flame size={10} /> Frequent ({callCount})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className="text-[9px] font-semibold text-slate-400 uppercase">{call.name || "UNKNOWN CONTACT"}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3.5">
                                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                                        {call.simLabel || (call.simSlot ? `SIM ${call.simSlot}` : 'N/A')}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-3.5">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{new Date(call.date).toLocaleDateString('en-GB')}</span>
                                                                        <span className="text-[9px] font-semibold text-slate-400">{new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-3.5 text-right">
                                                                    <span className={`text-xs font-black ${call.duration > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                                                        {call.duration}s
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })()}

            {/* Modal: Live Device Sync Progress */}
            <AnimatePresence>
                {showSyncModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl text-white space-y-5"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-2xl border transition-all ${
                                        isPollingSync 
                                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                                            : syncStatusData && syncStatusData.pendingDevices === 0 
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    }`}>
                                        <Smartphone className={isPollingSync ? 'animate-pulse' : ''} size={22} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-black tracking-tight">
                                                {isPollingSync 
                                                    ? 'Live Employee Device Sync' 
                                                    : syncStatusData && syncStatusData.pendingDevices === 0 
                                                    ? '✓ All Devices Synced' 
                                                    : 'Sync Request Active'}
                                            </h3>
                                            {isPollingSync && (
                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span> POLLING
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {isPollingSync 
                                                ? 'Broadcasting signal and syncing call logs from employee devices...' 
                                                : syncStatusData && syncStatusData.pendingDevices === 0 
                                                ? 'Call logs successfully uploaded from all enrolled employee phones' 
                                                : 'Sync signal active on server. Devices check in automatically every minute.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSyncModal(false)}
                                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                                >
                                    <CloseIcon size={18} />
                                </button>
                            </div>

                            {/* Overall Progress Section */}
                            <div className="space-y-2.5 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/90">
                                <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-300 flex items-center gap-1.5">
                                        <Activity size={14} className="text-cyan-400" />
                                        {isPollingSync 
                                            ? 'Device synchronization in progress...' 
                                            : syncStatusData && syncStatusData.pendingDevices === 0 
                                            ? '✓ Complete' 
                                            : 'Waiting for devices check-in'}
                                    </span>
                                    <span className="text-cyan-400 font-mono text-xs font-black">
                                        {syncStatusData ? `${syncStatusData.syncedDevices} / ${syncStatusData.totalDevices} Synced` : 'Connecting...'}
                                    </span>
                                </div>

                                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                                    <motion.div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            syncStatusData && syncStatusData.pendingDevices === 0 
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                                : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                                        }`}
                                        style={{
                                            width: syncStatusData && syncStatusData.totalDevices > 0
                                                ? `${Math.round((syncStatusData.syncedDevices / syncStatusData.totalDevices) * 100)}%`
                                                : '5%'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setSyncModalTab('ALL')}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                            syncModalTab === 'ALL'
                                                ? 'bg-slate-800 text-white border border-slate-700'
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        All Devices ({syncStatusData?.devices?.length || 0})
                                    </button>
                                    <button
                                        onClick={() => setSyncModalTab('SYNCED')}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                            syncModalTab === 'SYNCED'
                                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                                                : 'text-slate-400 hover:text-emerald-400'
                                        }`}
                                    >
                                        Synced ({syncStatusData?.syncedDevices || 0})
                                    </button>
                                    <button
                                        onClick={() => setSyncModalTab('PENDING')}
                                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                                            syncModalTab === 'PENDING'
                                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/80'
                                                : 'text-slate-400 hover:text-amber-400'
                                        }`}
                                    >
                                        Pending ({syncStatusData?.pendingDevices || 0})
                                    </button>
                                </div>

                                <button
                                    onClick={fetchBulkStatusOnce}
                                    disabled={isRefreshingStatus}
                                    className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors"
                                    title="Refresh Status"
                                >
                                    <RefreshCw size={14} className={isRefreshingStatus ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Devices List */}
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {syncStatusData?.devices
                                    ?.filter(dev => {
                                        if (syncModalTab === 'SYNCED') return !dev.requestPending;
                                        if (syncModalTab === 'PENDING') return dev.requestPending;
                                        return true;
                                    })
                                    ?.map((dev) => {
                                        const cleanDevice = formatDeviceName(dev.deviceName);
                                        const initial = (dev.user?.name || 'E').charAt(0).toUpperCase();

                                        return (
                                            <div key={dev.id} className="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-2xl border border-slate-800 hover:border-slate-700/80 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-black text-white text-xs shadow-md shrink-0">
                                                        {initial}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-white text-xs">{dev.user?.name || 'Employee'}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-medium text-slate-400">
                                                                {cleanDevice}
                                                            </span>
                                                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                                                                SIM {dev.officialSim}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {dev.requestPending ? (
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                            <Clock size={10} /> Pending
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                            <CheckCircle2 size={10} /> Synced
                                                        </span>
                                                    )}

                                                    <button
                                                        onClick={() => handleRequestSingleDeviceSync(dev.user?.id, dev.user?.name)}
                                                        title={`Re-trigger sync signal for ${dev.user?.name || 'employee'}`}
                                                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 rounded-xl transition-all active:scale-95"
                                                    >
                                                        <RefreshCw size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                {(!syncStatusData || syncStatusData.devices?.length === 0) && (
                                    <div className="text-center py-8 text-slate-500 text-xs space-y-2">
                                        <RefreshCw size={20} className="animate-spin mx-auto opacity-50 text-cyan-400" />
                                        <p>Waiting for status response from employee devices...</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={fetchBulkStatusOnce}
                                        disabled={isRefreshingStatus}
                                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/60 transition-all flex items-center gap-1.5"
                                    >
                                        <RefreshCw size={13} className={isRefreshingStatus ? 'animate-spin' : ''} />
                                        Refresh Status
                                    </button>

                                    {!isPollingSync && syncStatusData && syncStatusData.pendingDevices > 0 && (
                                        <button
                                            onClick={() => {
                                                setIsPollingSync(true);
                                                const token = JSON.parse(localStorage.getItem('user')).token;
                                                const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api');
                                                pollBulkStatus(token, baseUrl, Date.now());
                                            }}
                                            className="px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-xl border border-cyan-500/30 transition-all flex items-center gap-1.5"
                                        >
                                            <Activity size={13} className="animate-pulse" />
                                            Resume Sync Polling
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={() => setShowSyncModal(false)}
                                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
                                >
                                    Close Dialog
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal: APK Activation Code */}
            <AnimatePresence>
                {showActivationModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-6 text-center"
                        >
                            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                <Smartphone size={32} />
                            </div>

                            <div>
                                <h3 className="text-xl font-black tracking-tight">APK Device Activation</h3>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                    {selectedUserForActivation
                                        ? `Activation code for ${selectedUserForActivation.name} (${selectedUserForActivation.designation || 'Personnel'})`
                                        : 'Generate a 6-digit code to activate the PeopleDesk Call Sync APK on Android.'}
                                </p>
                            </div>

                            {/* Personnel Selector if needed */}
                            {filteredMetrics.length > 0 && !selectedUserForActivation && (
                                <div className="text-left space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Employee (Optional):</label>
                                    <select
                                        onChange={(e) => {
                                            const targetId = e.target.value ? Number(e.target.value) : null;
                                            const targetEmp = filteredMetrics.find(m => (m.id || m.userId) === targetId);
                                            setSelectedUserForActivation(targetEmp || null);
                                            handleCreateAdminActivationCode(targetId);
                                        }}
                                        className="w-full bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-200 outline-none cursor-pointer"
                                    >
                                        <option value="">Your Account (Logged-in User)</option>
                                        {filteredMetrics.map((emp) => (
                                            <option key={emp.id || emp.userId} value={emp.id || emp.userId}>
                                                {emp.name} ({emp.designation || 'Staff'})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {adminActivationCode ? (
                                <div className="bg-indigo-950/40 p-6 rounded-3xl border-2 border-indigo-500/30 space-y-3">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">6-Digit Activation Code</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-4xl font-black text-indigo-300 tracking-[0.25em] font-mono select-all">
                                            {adminActivationCode}
                                        </span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(adminActivationCode);
                                                toast.success('Activation code copied to clipboard!');
                                            }}
                                            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl shadow-sm border border-slate-700 transition-all active:scale-95"
                                            title="Copy code"
                                        >
                                            <CheckCircle2 size={18} />
                                        </button>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400">
                                        ⏰ Valid for 10 minutes.
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleCreateAdminActivationCode(selectedUserForActivation?.id || selectedUserForActivation?.userId)}
                                    disabled={isGeneratingActivationCode}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-indigo-950/50 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                                >
                                    {isGeneratingActivationCode ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
                                    {isGeneratingActivationCode ? 'Generating Code...' : 'Generate Activation Code'}
                                </button>
                            )}

                            {/* Instructions */}
                            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-left space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Device Activation Steps:</p>
                                <ol className="text-xs font-medium text-slate-300 space-y-1.5 list-decimal list-inside">
                                    <li>Open the <span className="font-bold text-indigo-400">PeopleDesk APK</span> on the mobile phone.</li>
                                    <li>Type in the 6-digit code shown above.</li>
                                    <li>Select the official company SIM slot.</li>
                                    <li>Tap <span className="font-bold text-indigo-400">Activate Device</span>.</li>
                                </ol>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    onClick={() => handleCreateAdminActivationCode(selectedUserForActivation?.id || selectedUserForActivation?.userId)}
                                    disabled={isGeneratingActivationCode}
                                    className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                    <RefreshCw size={12} className={isGeneratingActivationCode ? 'animate-spin' : ''} /> Generate New Code
                                </button>
                                <button
                                    onClick={() => {
                                        setShowActivationModal(false);
                                        setSelectedUserForActivation(null);
                                    }}
                                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const MetricBox = ({ label, value, color, icon: Icon }) => {
    const colorMap = {
        emerald: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
        blue: 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40',
        amber: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40',
        purple: 'bg-purple-50/80 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40',
        rose: 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40',
        sky: 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/40',
        indigo: 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40',
        fuchsia: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-100 dark:border-fuchsia-900/40',
    };

    return (
        <div className={`p-4 md:p-5 rounded-2xl border shadow-sm flex items-center justify-between group hover:-translate-y-0.5 transition-all duration-200 ${colorMap[color]}`}>
            <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-75">{label}</span>
                <p className="text-xl md:text-2xl font-black tracking-tight">{value}</p>
            </div>
            <div className="w-9 h-9 bg-white/70 dark:bg-slate-900/70 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm shrink-0">
                <Icon size={18} className="opacity-90" />
            </div>
        </div>
    );
};

export default AdminCallReports;
