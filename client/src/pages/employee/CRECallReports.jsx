import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getMyWorkLogs, getMyCallLogs, syncCallLogs } from '../../features/employee/employeeSlice';
import { Capacitor } from '@capacitor/core';
import { BackgroundRunner } from '@capacitor/background-runner';
import { Preferences } from '@capacitor/preferences';
import { getCallLogPlugin } from '../../utils/capacitorPlugins';
import { toast } from 'react-toastify';
import {
    Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
    Calendar, Clock, User, Hash, Search, Filter,
    RefreshCw, CheckCircle2, ChevronRight, Activity, Smartphone,
     Zap, Layers, Share2, PlayCircle, Settings
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from '../../components/ConfirmationModal';

const CallLog = getCallLogPlugin();

const CRECallReports = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { callLogs, workLogs, isLoading } = useSelector((state) => state.employee);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [simFilter, setSimFilter] = useState('ALL');
    const [isUniqueOnly, setIsUniqueOnly] = useState(false);
    const getIstToday = () => {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 5.5)).toISOString().split('T')[0];
    };
    const [selectedDate, setSelectedDate] = useState(getIstToday());
    const [isFetchingLocal, setIsFetchingLocal] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);

    // Persisted SIM slot preference — default SIM 2
    const [officialSim, setOfficialSim] = useState(() =>
        parseInt(localStorage.getItem('cre_official_sim') || '0') // Changed default to 0 (None)
    );
    const [simLabels, setSimLabels] = useState({});
    const [simMap, setSimMap] = useState({}); // Maps subId to slot and vice versa
    const [pendingSim, setPendingSim] = useState(null); // For Confirmation Modal
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        const loadPrefs = async () => {
            if (Capacitor.isNativePlatform()) {
                const { value: simPref } = await Preferences.get({ key: 'cre_official_sim' });
                if (simPref) setOfficialSim(parseInt(simPref));

                const { value: labelsPref } = await Preferences.get({ key: 'sim_labels' });
                if (labelsPref) setSimLabels(JSON.parse(labelsPref));
                
                // Trigger Discovery
                discoverSims();
            } else {
                const val = localStorage.getItem('cre_official_sim');
                if (val) setOfficialSim(parseInt(val));
                
                const labels = localStorage.getItem('sim_labels');
                if (labels) setSimLabels(JSON.parse(labels));
            }
        };
        loadPrefs();
    }, []);

    const discoverSims = async () => {
        try {
            const CallLogPlugin = Capacitor.Plugins.CallLog;
            if (!CallLogPlugin) return;

            const labels = { ...simLabels };
            const mapping = {};

            // 1. Precise Discovery via SubscriptionManager
            if (CallLogPlugin.getSimInfo) {
                const simInfo = await CallLogPlugin.getSimInfo();
                if (simInfo.sims && simInfo.sims.length > 0) {
                    const sims = simInfo.sims;
                    sims.forEach(sim => {
                        const slot = String(sim.simSlot);
                        const subId = String(sim.simId);
                        
                        let label = sim.simLabel || sim.displayName || `SIM ${slot}`;
                        
                        // Check for duplicates
                        const isIdentical = sims.some(s => String(s.simSlot) !== slot && (s.simLabel === sim.simLabel || s.displayName === sim.displayName));
                        if (isIdentical) {
                            label = `${label} (${slot === "1" ? "P" : "S"})`;
                        }

                        labels[slot] = label;
                        labels[subId] = label;
                        mapping[subId] = slot;
                        mapping[slot] = subId;
                    });
                }
            }

            // 2. Fallback via Call Logs (If manager found nothing or just one)
            try {
                const result = await CallLogPlugin.getCallLogs();
                if (result.logs && result.logs.length > 0) {
                    result.logs.forEach(log => {
                        const id = String(log.simSlot || log.simId);
                        if (id && log.simLabel && !labels[id]) {
                            labels[id] = log.simLabel;
                        }
                    });
                }
            } catch (err) {}

            setSimLabels(labels);
            setSimMap(mapping);
            if (Capacitor.isNativePlatform()) {
                await Preferences.set({ key: 'sim_labels', value: JSON.stringify(labels) });
            }
        } catch (e) {
            console.error("SIM discovery failed", e);
        }
    };

    useEffect(() => {
        dispatch(getMyCallLogs({ 
            startDate: selectedDate, 
            endDate: selectedDate 
        }));
        
        // Auto-sync on mount for native devices
        if (Capacitor.isNativePlatform() && selectedDate === getIstToday()) {
            syncDeviceLogs();
        }
    }, [dispatch, selectedDate]);

    const handleSimChange = (slot) => {
        const parsed = parseInt(slot);
        setPendingSim(parsed);
        setIsConfirmOpen(true);
    };

    const confirmSimChange = async () => {
        if (pendingSim === null) return;
        
        const parsed = pendingSim;
        setOfficialSim(parsed);
        localStorage.setItem('cre_official_sim', String(parsed));
        if (Capacitor.isNativePlatform()) {
            await Preferences.set({
                key: 'cre_official_sim',
                value: String(parsed)
            });
        }
        toast.success(`SIM ${parsed} set as Official Work SIM.`);
        setIsConfirmOpen(false);

        // Re-sync logs for the newly selected SIM if today
        if (selectedDate === getIstToday()) {
            syncDeviceLogs();
        }
    };

    const syncDeviceLogs = async () => {
        setIsFetchingLocal(true);
        try {
            const CallLog = getCallLogPlugin();
            const result = await CallLog.getCallLogs();
            if (result.logs && result.logs.length > 0) {
                const allLogs = result.logs;
                console.log(`Diagnostic: Found ${allLogs.length} total logs on device.`);
                
                // Diagnostic: Log all unique SIM IDs found
                const detectedSims = [...new Set(allLogs.map(l => String(l.simSlot || l.simId || "Unknown")))].filter(s => s !== "null");
                console.log(`[Diagnostic] Detected SIM IDs on device: ${detectedSims.join(", ")}`);

                // DISCOVERY: Capture SIM labels and persist them
                const newLabels = { ...simLabels };
                let labelsChanged = false;
                allLogs.forEach(log => {
                    const id = String(log.simSlot || log.simId);
                    const label = log.simLabel;
                    if (id && label && newLabels[id] !== label) {
                        newLabels[id] = label;
                        labelsChanged = true;
                    }
                });
                
                if (labelsChanged) {
                    setSimLabels(newLabels);
                    localStorage.setItem('sim_labels', JSON.stringify(newLabels));
                    if (Capacitor.isNativePlatform()) {
                        Preferences.set({ key: 'sim_labels', value: JSON.stringify(newLabels) });
                    }
                }

                // Client-side Filter: Only send logs matching the selected official SIM (unless 'All' is selected)
                let filteredLogs = allLogs;
                if (officialSim !== 0) {
                    filteredLogs = allLogs.filter(log => {
                        const logSlot = String(log.simSlot || log.simId || "").toLowerCase();
                        const targetSlot = String(officialSim).toLowerCase();
                        if (!logSlot || logSlot === "null" || logSlot === "undefined") return true; 
                        return logSlot === targetSlot || logSlot.includes(targetSlot);
                    });
                    console.log(`[Diagnostic] Filter applied: ${officialSim}. Result: ${filteredLogs.length} logs.`);
                } else {
                    console.log(`[Diagnostic] Syncing ALL logs (Official SIM: 0). Total: ${allLogs.length} logs.`);
                }

                // FALLBACK: If specific SIM filtering fails but device HAS logs
                if (filteredLogs.length === 0 && allLogs.length > 0) {
                    const uniqueSims = [...new Set(allLogs.map(l => String(l.simSlot || l.simId || "")))].filter(s => s && s !== "null" && s !== "undefined");
                    if (uniqueSims.length === 1) {
                        filteredLogs = allLogs;
                        console.log("Diagnostic: Single SIM auto-fallback applied.");
                    }
                }

                if (filteredLogs.length === 0) {
                    toast.warning(`No logs found for SIM ${officialSim}. Detected SIM IDs: ${[...new Set(allLogs.map(l => l.simSlot || l.simId))].filter(Boolean).join(", ")}`);
                    return;
                }

                const res = await dispatch(syncCallLogs({ 
                    logs: filteredLogs, 
                    simFilter: officialSim,
                    syncDate: new Date().toISOString()
                }));

                if (!res.error) {
                    toast.success(`${filteredLogs.length} logs successfully moved to VPS.`);
                    setLastSyncTime(new Date());
                    
                    // Update last sync time in local storage/Preferences
                    if (Capacitor.isNativePlatform()) {
                        await Preferences.set({
                            key: 'last_synced_report',
                            value: JSON.stringify({ date: getIstToday(), timestamp: Date.now() })
                        });
                    }

                    dispatch(getMyCallLogs({ 
                        startDate: selectedDate, 
                        endDate: selectedDate 
                    }));
                } else {
                    const errorDetails = res.payload || res.error?.message || "Unknown Network Error";
                    console.error("Manual Sync Backend Error:", errorDetails);
                    toast.error(`VPS Sync Failed: ${errorDetails}`);
                }
            } else {
                toast.info("No call logs detected in device history.");
            }
        } catch (error) {
            console.error("Native Plugin Error:", error);
            toast.error(`Native Bridge Error: ${error.message}`);
        } finally {
            setIsFetchingLocal(false);
        }
    };

    const testBackgroundSync = async () => {
        if (!Capacitor.isNativePlatform()) {
            toast.error("Background Runner is only available on native Android/iOS.");
            return;
        }

        try {
            toast.info("Dispatching test event to Background Engine...");
            const result = await BackgroundRunner.dispatchEvent({
                label: 'com.peopledesk.app.runner',
                event: 'dailyCallLogSync',
                details: {}
            });
            console.log("Background Hub Result:", result);
            toast.success("Event dispatched! Check your server data in a few moments.");
        } catch (error) {
            console.error("Native Dispatch Error:", error);
            const errMsg = error.message || String(error);
            toast.error(`Sync Trigger Error: ${errMsg}`, { autoClose: 5000 });
        }
    };

    // helper to get IST date string consistently
    const toIstDateString = (dateInput) => {
        if (!dateInput) return null;
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return null;
        // Shift to IST for comparison
        const ist = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
        return ist.toISOString().split('T')[0];
    };

    // Extract & Merge from Decoupled State
    const allSyncedCalls = (callLogs || [])
        .filter(log => {
            const hasCalls = log.calls && Array.isArray(log.calls);
            if (!hasCalls && log.calls) console.warn("Diagnostic: Found CallLog record with non-array calls property", log);
            return hasCalls;
        })
        .flatMap(log => {
            return log.calls.map(call => ({
                ...call,
                workLogDate: log.date,
            }));
        })
        .filter(call => {
            if (!call.date) return false;
            const callDateStr = toIstDateString(call.date);
            const isMatch = callDateStr === selectedDate;
            
            // Helpful for debugging if anything appears missing
            if (searchTerm === 'DEBUG') {
                console.log(`[DateCheck] Call: ${call.number} | Time: ${new Date(call.date).toLocaleTimeString()} | CallDate: ${callDateStr} | Selected: ${selectedDate} | Match: ${isMatch}`);
            }
            
            return isMatch;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Intelligence
    if (searchTerm === 'DEBUG' && callLogs?.length > 0) {
        console.log(`[Diagnostic] callLogs in state:`, callLogs.length);
        console.log(`[Diagnostic] allSyncedCalls count:`, allSyncedCalls.length);
    }

    // Intelligence
    const availableSims = [...new Set(allSyncedCalls.map(c => c.simId))].filter(Boolean);

    // Merge persisted labels with any found in current call set
    const activeSimLabels = (allSyncedCalls || []).reduce((acc, curr) => {
        const id = String(curr.simId || "");
        const label = curr.simLabel;
        if (id && label && !acc[id]) acc[id] = label; // Only add if NOT already discovered via plugin
        return acc;
    }, { ...simLabels });

    const filteredSynced = allSyncedCalls.filter(call => {
        const matchesSearch = call.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (call.name && call.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'ALL' || call.type === filterType;
        
        // Auto-filter by Official SIM preference only (Removed the redundant bottom filter)
        if (officialSim === 0) return matchesSearch && matchesType; // Show all if none selected yet for review
        
        const logSimId = String(call.simId || "").toLowerCase();
        const targetSlot = String(officialSim).toLowerCase();
        
        // 1. Direct match with slot string
        if (logSimId === targetSlot) return matchesSearch && matchesType;
        
        // 2. Match via simMap (SubId to Slot)
        if (simMap[logSimId] === targetSlot) return matchesSearch && matchesType;
        
        // 3. Partial match (for subscription IDs containing the slot index)
        const matchesSim = logSimId.includes(targetSlot);
        
        return matchesSearch && matchesType && matchesSim;
    });

    const displayLogs = isUniqueOnly
        ? filteredSynced.filter((call, index, self) =>
            index === self.findIndex((t) => t.number === call.number)
        )
        : filteredSynced;

    const getCallIcon = (type) => {
        switch (type) {
            case 'INCOMING': return <PhoneIncoming className="text-emerald-500" size={16} />;
            case 'OUTGOING': return <PhoneOutgoing className="text-blue-500" size={16} />;
            case 'MISSED': return <PhoneMissed className="text-rose-500" size={16} />;
            case 'REJECTED': return <PhoneMissed className="text-amber-500" size={16} />;
            default: return <Phone className="text-slate-300" size={16} />;
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    // Calculate aggregated stats for Pie Chart
    const stats = {
        INCOMING: displayLogs.filter(c => c.type === 'INCOMING').length,
        OUTGOING: displayLogs.filter(c => c.type === 'OUTGOING').length,
        MISSED: displayLogs.filter(c => c.type === 'MISSED').length,
        REJECTED: displayLogs.filter(c => c.type === 'REJECTED').length
    };

    const pieData = [
        { name: 'Incoming', value: stats.INCOMING, color: '#10b981' }, // emerald-500
        { name: 'Outgoing', value: stats.OUTGOING, color: '#3b82f6' }, // blue-500
        { name: 'Missed', value: stats.MISSED, color: '#f43f5e' }, // rose-500
        { name: 'Rejected', value: stats.REJECTED, color: '#f59e0b' } // amber-500
    ].filter(d => d.value > 0);

    if (isLoading && allSyncedCalls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="text-blue-600 animate-pulse" size={20} />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-slate-800 font-black uppercase text-xs tracking-[0.3em]">Igniting Engine</p>
                    <p className="text-slate-400 font-bold text-[10px] mt-1 uppercase">Fetching Real-time Intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-32">
            {/* Premium Header Container */}
            <motion.header
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/70 backdrop-blur-3xl p-8 rounded-[3rem] border border-white shadow-2xl relative overflow-hidden"
            >
                {/* Background Accents */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-100/20 rounded-full blur-3xl -ml-20 -mb-20"></div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
                                {user?.name?.split(' ')[0]}'s Call Analytics
                            </h1>
                            <div className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${Capacitor.isNativePlatform() ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                <Zap size={12} /> {Capacitor.isNativePlatform() ? "Sync Active" : "Web Preview"}
                            </div>
                        </div>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] ml-1">Universal Call Intelligence Ledger</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* SIM Slot Selector */}
                        <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
                            <span className="text-[9px] font-black text-slate-400 uppercase px-2">OFFICIAL SIM</span>
                            {[1, 2].map((slot) => {
                                const label = simLabels[slot] || `SIM ${slot}`;

                                return (
                                    <button
                                        key={slot}
                                        onClick={() => handleSimChange(slot)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${officialSim === slot
                                            ? 'bg-slate-900 text-white shadow'
                                            : 'text-slate-400 hover:bg-white hover:shadow-sm'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Date Selector */}
                        <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
                            <span className="text-[9px] font-black text-slate-400 uppercase px-2 flex items-center gap-1">
                                <Calendar size={12} /> DATE
                            </span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-[9px] font-black uppercase outline-none border-none p-1.5 text-slate-700 cursor-pointer"
                            />
                        </div>

                        <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
                            <button onClick={testBackgroundSync} className="p-3 bg-white text-emerald-600 hover:text-emerald-700 rounded-xl transition-all shadow-sm active:scale-90" title="Test Background Engine">
                                <PlayCircle size={18} />
                            </button>
                        </div>
                        <button
                            disabled={isFetchingLocal} onClick={syncDeviceLogs}
                            className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 active:scale-95 disabled:opacity-50 group"
                        >
                            <RefreshCw size={16} className={isFetchingLocal ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                            {isFetchingLocal ? "UPDATING LEDGER..." : "SYNC OFFICIAL LOGS"}
                        </button>
                    </div>
                </div>

                {/* Intelligent Filter Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-10">
                    <div className="xl:col-span-4 relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Identify number or contact..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50/70 pl-14 pr-6 py-4.5 rounded-[1.5rem] border border-slate-100 outline-none focus:ring-4 ring-blue-50 focus:border-blue-400/50 transition-all font-bold text-sm placeholder:text-slate-300"
                        />
                    </div>

                    <div className="xl:col-span-5 flex bg-slate-50/70 p-2 rounded-[1.5rem] border border-slate-100 overflow-x-auto no-scrollbar scroll-smooth">
                        {['ALL', 'INCOMING', 'OUTGOING', 'MISSED', 'REJECTED'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-white text-blue-600 shadow-xl border border-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {type === 'ALL' ? <Layers size={14} className="mx-auto" /> : type}
                            </button>
                        ))}
                    </div>

                    <div className="xl:col-span-3 flex items-center justify-between gap-4 bg-slate-50/70 p-2 rounded-[1.5rem] border border-slate-100">
                        <div className="flex items-center gap-3 pl-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Smartphone size={14} /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {officialSim === 0 ? "NO SIM SELECTED" : (simLabels[officialSim] || `SYNCING SIM ${officialSim}`)}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsUniqueOnly(!isUniqueOnly)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isUniqueOnly ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Unique
                        </button>
                    </div>
                </div>
            </motion.header>

            {/* Debug Banner - Visible only when data is missing but logs exist in state */}
            {(callLogs?.length > 0 && displayLogs.length === 0) && (
                <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] space-y-3">
                    <div className="flex items-center gap-3 text-amber-700 font-black uppercase text-xs">
                        <Activity size={18} /> Sync Diagnostic Intelligence
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white/50 p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Raw Records</p>
                            <p className="text-xl font-black text-slate-800">{callLogs.length}</p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Selected Date</p>
                            <p className="text-sm font-black text-slate-800">{selectedDate}</p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Selected SIM</p>
                            <p className="text-[10px] font-black text-slate-800">{simLabels[officialSim] || `SIM ${officialSim}`}</p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl overflow-hidden">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Found in Data</p>
                            <p className="text-[9px] font-black text-slate-600 truncate">
                                {Object.entries(
                                    allSyncedCalls.reduce((acc, c) => {
                                        const id = c.simId || "None";
                                        acc[id] = (acc[id] || 0) + 1;
                                        return acc;
                                    }, {})
                                ).map(([id, count]) => `${simLabels[id] || id}:${count}`).join(", ") || "None"}
                            </p>
                        </div>
                        <div className="bg-white/50 p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Filtered Calls</p>
                            <p className="text-xl font-black text-slate-800">{filteredSynced.length}</p>
                        </div>
                    </div>
                    {allSyncedCalls.length > 0 && filteredSynced.length === 0 ? (
                        <p className="text-[10px] font-bold text-red-600 bg-red-100/50 p-2 rounded-lg">
                            ATTENTION: {allSyncedCalls.length} logs are hidden because they belong to a DIFFERENT SIM. 
                            Current view is filtered for <b>{simLabels[officialSim] || `SIM ${officialSim}`}</b>.
                        </p>
                    ) : (
                        <p className="text-[10px] font-bold text-amber-600 bg-amber-100/50 p-2 rounded-lg">
                            Tip: If {'Total Raw Calls'} is {'>'} 0 but metrics are 0, the dates in your phone logs do not match "{selectedDate}". Check your phone's date/time settings.
                        </p>
                    )}
                </div>
            )}

            {/* Premium Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Visual Chart Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-5 bg-white p-8 rounded-[3.5rem] border border-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <h3 className="text-slate-800 font-black uppercase text-xs tracking-widest self-start mb-4">Volume Distribution</h3>

                    <div className="flex-1 w-full min-h-[220px]">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%" cy="50%"
                                        innerRadius={70} outerRadius={100}
                                        paddingAngle={5} dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                        itemStyle={{ fontWeight: 'black' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.1em' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center opacity-50 space-y-4 h-full py-10">
                                <PieChart className="text-slate-300" size={48} />
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">No Intelligence Gathered</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Live Metrics Grid */}
                <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricBox label="Total Calls" value={displayLogs.length} color="blue" icon={Hash} subtext="Aggregated volume" />
                    <MetricBox label="Incoming" value={stats.INCOMING} color="emerald" icon={PhoneIncoming} subtext="Received intelligence" />
                    <MetricBox label="Outgoing" value={stats.OUTGOING} color="sky" icon={PhoneOutgoing} subtext="Dispatched signals" />
                    <MetricBox label="Missed" value={stats.MISSED} color="rose" icon={PhoneMissed} subtext="Dropped connections" />
                    <MetricBox label="Rejected" value={stats.REJECTED} color="amber" icon={PhoneMissed} subtext="Declined handshakes" />
                    <MetricBox label="Unique Leads" value={new Set(displayLogs.map(l => l.number)).size} color="indigo" icon={User} subtext="Distinct entities" />
                    <div className="col-span-2 md:col-span-3">
                        <MetricBox label="Total Talk Time" value={formatDuration(displayLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0))} color="fuchsia" icon={Clock} subtext="Cumulative VoIP Duration" />
                    </div>
                </div>

            </div>

            {/* Smart Data Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[3.5rem] border border-white shadow-2xl overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Type</th>
                                <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subscriber Identification</th>
                                <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timeline</th>
                                <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Impact (Sec)</th>
                                <th className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Origin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/60">
                            <AnimatePresence mode="popLayout">
                                {displayLogs.length > 0 ? (
                                    displayLogs.map((call, idx) => (
                                        <motion.tr
                                            key={`${call.date}-${idx}`}
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="group hover:bg-blue-50/30 transition-all duration-300"
                                        >
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-4 rounded-3xl transition-all duration-500 group-hover:rotate-[360deg] ${call.type === 'OUTGOING' ? 'bg-blue-50 text-blue-600 shadow-sm' : call.type === 'INCOMING' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'bg-rose-50 text-rose-600 shadow-sm'}`}>
                                                        {getCallIcon(call.type)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-800">{call.type}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Signal Type</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">{call.number}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{call.name || "UNIDENTIFIED SOURCE"}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700">{new Date(call.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><Clock size={10} /> {new Date(call.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-6">
                                                <span className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest border transition-all ${call.duration > 0 ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100 shadow-emerald-50' : 'bg-rose-50/50 text-rose-600 border-rose-100 shadow-rose-50'}`}>
                                                    {formatDuration(call.duration)}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200 group-hover:bg-blue-500 transition-all duration-500"></div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-600 transition-colors">{call.simId ? `SLOT ${String(call.simId).substring(0, 4)}` : 'PRIMARY'}</span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <Share2 size={40} className="text-slate-400" />
                                                <p className="text-slate-400 font-black uppercase text-xs tracking-[0.4em]">Intelligence Stream Empty</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* SIM Selection Confirmation Modal */}
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmSimChange}
                title="Confirm Official Work SIM"
                message={`Are you sure you want to set SIM ${pendingSim}${activeSimLabels[pendingSim] ? ` (${activeSimLabels[pendingSim]})` : ''} as your Official Work SIM?\n\nOnly calls from this SIM will be synced to the VPS server.`}
                type="info"
                confirmText="Set as Official"
            />
        </div>
    );
};

const MetricBox = ({ label, value, color, icon: Icon, subtext }) => {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-emerald-100/30',
        blue: 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-100/30',
        amber: 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-100/30',
        purple: 'bg-purple-50 text-purple-600 border-purple-100 ring-purple-100/30',
        rose: 'bg-rose-50 text-rose-600 border-rose-100 ring-rose-100/30',
        sky: 'bg-sky-50 text-sky-600 border-sky-100 ring-sky-100/30',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-100/30',
        fuchsia: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 ring-fuchsia-100/30',
    };

    const lightColorMap = {
        emerald: 'bg-emerald-50/50',
        blue: 'bg-blue-50/50',
        amber: 'bg-amber-50/50',
        purple: 'bg-purple-50/50',
        rose: 'bg-rose-50/50',
        sky: 'bg-sky-50/50',
        indigo: 'bg-indigo-50/50',
        fuchsia: 'bg-fuchsia-50/50',
    };

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-white p-7 rounded-[2.5rem] border border-white shadow-xl flex flex-col gap-4 relative overflow-hidden group cursor-default"
        >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-1000 ${lightColorMap[color] || 'bg-slate-50'}`}></div>

            <div className="flex items-center justify-between relative z-10">
                <div className={`p-4 rounded-3xl shadow-sm border ${colorMap[color] || 'bg-slate-50 text-slate-600'}`}>
                    <Icon size={22} className="group-hover:rotate-12 transition-transform" />
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-slate-400`}>{label}</span>
                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{subtext}</span>
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
            </div>
        </motion.div>
    );
};

export default CRECallReports;
