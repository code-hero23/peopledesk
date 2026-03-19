import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus, addProjectReport } from '../../features/employee/employeeSlice';
import { getProjects } from '../../features/projects/projectSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import {
    FileText, Box, PenTool, Layout, DollarSign,
    MessageCircle, Users, CheckSquare, Plus, Clock,
    Image as ImageIcon, Briefcase, Calendar, ChevronRight, MapPin, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LAWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const { projects } = useSelector((state) => state.projects);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [reportType, setReportType] = useState('daily'); // 'daily', 'project'
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const isTodayClosed = todayLog?.logStatus === 'CLOSED';
    const isTodayOpen = todayLog?.logStatus === 'OPEN';

    useEffect(() => {
        dispatch(getTodayLogStatus());
        dispatch(getProjects());
    }, [dispatch]);

    // Initial State structure for Opening/Closing
    const initialMetrics = {
        initial2D: { count: '', details: '' },
        production2D: { count: '', details: '' },
        revised2D: { count: '', details: '' },
        fresh3D: { count: '', details: '' },
        revised3D: { count: '', details: '' },
        estimation: { count: '', details: '' },
        woe: { count: '', details: '' },
        onlineDiscussion: { count: '', details: '' },
        showroomDiscussion: { count: '', details: '' },
        signFromEngineer: { count: '', details: '' },
        siteVisit: { count: '', details: '' },
        infurnia: { count: '', details: '' }
    };

    const [openingData, setOpeningData] = useState({ ...initialMetrics });
    const [closingData, setClosingData] = useState({ ...initialMetrics, notes: '' });
    const [dailyNotes, setDailyNotes] = useState(''); // Separate state for easier management

    // Persistence: Preload data from todayLog (Opening Metrics) into Closing Form
    useEffect(() => {
        if (isTodayOpen && todayLog?.la_opening_metrics) {
            setClosingData(prev => ({
                ...prev,
                ...todayLog.la_opening_metrics,
                notes: prev.notes // Keep notes separate if needed
            }));
        }
    }, [isTodayOpen, todayLog]);

    // Project Report State
    const [projectReport, setProjectReport] = useState({
        date: new Date().toISOString().split('T')[0],
        projectId: '',
        clientName: '',
        site: '',
        process: '',
        imageCount: '',
        startTime: '',
        endTime: '',
        completedImages: '',
        pendingImages: '',
        remarks: '',
        // New Detailed Fields
        onlineMeetings: [],
        showroomMeetings: [],
        measurements: [],
        requirements: [],
        colours: []
    });
    const [projectStartTime, setProjectStartTime] = useState(null);

    // Helper for adding rows to dynamic tables
    const addRow = (field, structure) => {
        setProjectReport(prev => ({
            ...prev,
            [field]: [...prev[field], structure]
        }));
    };

    // Helper for removing rows
    const removeRow = (field, index) => {
        setProjectReport(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    // Helper for updating row data
    const updateRow = (field, index, key, value) => {
        setProjectReport(prev => {
            const updatedList = [...prev[field]];
            if (typeof updatedList[index] === 'object') {
                updatedList[index] = { ...updatedList[index], [key]: value };
            } else {
                // simple array of strings/values
                updatedList[index] = value;
            }
            return { ...prev, [field]: updatedList };
        });
    };

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Opening Report',
            message: 'Are you sure you want to start your day with these metrics?',
            onConfirm: () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const payload = { 
                    logStatus: 'OPEN', 
                    la_opening_metrics: openingData,
                    startTime: currentTime
                };
                dispatch(createWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Opening Report Submitted! Day started.");
                        setShowSuccess(true);
                    }
                    setIsSubmitting(false);
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleClosingSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setConfirmationConfig({
            isOpen: true,
            title: 'Submit Closing Report',
            message: 'Are you sure you want to end your day and submit these closing metrics?',
            onConfirm: () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const payload = {
                    la_closing_metrics: closingData,
                    notes: dailyNotes,
                    endTime: currentTime
                };
                dispatch(closeWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Closing Report Submitted! Day ended.");
                        setShowSuccess(true);
                    }
                    setIsSubmitting(false);
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleProjectReportSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setConfirmationConfig({
            isOpen: true,
            title: 'Add Project Wise Report',
            message: 'Confirm adding this report to your daily log?',
            onConfirm: () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const payload = {
                    projectReport: {
                        ...projectReport,
                        startTime: projectStartTime || currentTime,
                        endTime: currentTime,
                        totalHours: 0 // We'll let the backend or details handle this if needed, but manual input is removed
                    }
                };

                dispatch(addProjectReport(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Project Report Added!");
                        setShowSuccess(true);
                        // Reset form
                        setProjectReport({
                            date: new Date().toISOString().split('T')[0],
                            projectId: '', clientName: '', site: '', process: '',
                            imageCount: '', startTime: '', endTime: '',
                            completedImages: '', pendingImages: '', remarks: '',
                            onlineMeetings: [], showroomMeetings: [], measurements: [], requirements: [], colours: []
                        });
                        setProjectStartTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                    }
                    setIsSubmitting(false);
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleProjectSelect = (e) => {
        const pId = e.target.value;
        const selected = projects.find(p => p.id === parseInt(pId));
        if (selected) {
            setProjectReport(prev => ({
                ...prev, projectId: pId, clientName: selected.name, site: selected.location || ''
            }));
        } else {
            setProjectReport(prev => ({ ...prev, projectId: pId }));
        }

        if (!projectStartTime) {
            setProjectStartTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading workspace...</div>;

    return (

        <div className="space-y-8">
            {/* Top Card Switcher */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Daily Report Selector */}
                <button
                    onClick={() => setReportType('daily')}
                    className={`relative p-6 rounded-[2rem] text-left transition-all duration-300 group overflow-hidden ${reportType === 'daily'
                        ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl shadow-slate-900/30 scale-[1.02] ring-4 ring-slate-900/10 dark:from-slate-800 dark:to-slate-900 dark:ring-slate-800/50'
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:scale-[1.01]'
                        }`}
                >
                    <div className="relative z-10 flex items-start justify-between">
                        <div>
                            <div className={`p-3 rounded-2xl w-fit mb-4 transition-colors ${reportType === 'daily' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                                <Calendar size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className={`text-xl font-black mb-1 ${reportType === 'daily' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Daily Reports</h3>
                            <p className={`text-xs font-bold uppercase tracking-widest ${reportType === 'daily' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400'}`}>Opening & Closing</p>
                        </div>
                        {reportType === 'daily' && (
                            <div className="bg-white/20 p-2 rounded-full">
                                <ChevronRight size={20} className="text-white" />
                            </div>
                        )}
                        {reportType !== 'daily' && (
                            <div className="p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                <ChevronRight size={20} className="text-slate-300" />
                            </div>
                        )}
                    </div>
                    {/* Decor */}
                    <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-2xl transition-opacity duration-500 ${reportType === 'daily' ? 'bg-indigo-500/20 opacity-100' : 'opacity-0'}`}></div>
                </button>

                {/* 2. Project Report Selector */}
                <button
                    onClick={() => setReportType('project')}
                    className={`relative p-6 rounded-[2rem] text-left transition-all duration-300 group overflow-hidden ${reportType === 'project'
                        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-indigo-500/30 scale-[1.02] ring-4 ring-indigo-500/10 dark:shadow-indigo-900/40'
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-900/50 hover:shadow-xl hover:scale-[1.01]'
                        }`}
                >
                    <div className="relative z-10 flex items-start justify-between">
                        <div>
                            <div className={`p-3 rounded-2xl w-fit mb-4 transition-colors ${reportType === 'project' ? 'bg-white/20 text-white' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-500 dark:text-violet-400 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 group-hover:text-violet-600 dark:group-hover:text-violet-300'}`}>
                                <Briefcase size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className={`text-xl font-black mb-1 ${reportType === 'project' ? 'text-white' : 'text-slate-800 dark:text-white'}`}>Project Wise</h3>
                            <p className={`text-xs font-bold uppercase tracking-widest ${reportType === 'project' ? 'text-indigo-200 dark:text-indigo-400' : 'text-slate-400'}`}>Detailed Task Logs</p>
                        </div>
                        {reportType === 'project' && (
                            <div className="bg-white/20 p-2 rounded-full">
                                <ChevronRight size={20} className="text-white" />
                            </div>
                        )}
                        {reportType !== 'project' && (
                            <div className="p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                <ChevronRight size={20} className="text-violet-300" />
                            </div>
                        )}
                    </div>
                    {/* Decor */}
                    <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-2xl transition-opacity duration-500 ${reportType === 'project' ? 'bg-white/30 opacity-100' : 'opacity-0'}`}></div>
                </button>
            </div>

            {/* Content Display */}
            <AnimatePresence mode="wait">
                {reportType === 'daily' ? (
                    <motion.div
                        key="daily"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Daily Report Content */}
                        {isTodayClosed ? (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-[2rem] text-center border border-emerald-100 dark:border-emerald-900/30 transition-colors">
                                <CheckSquare size={48} className="mx-auto text-emerald-500 dark:text-emerald-400 mb-4" />
                                <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mb-2">Day Completed!</h3>
                                <p className="text-emerald-600 dark:text-emerald-400 font-medium">All daily reports have been submitted successfully.</p>
                            </div>
                        ) : isTodayOpen ? (
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-emerald-100 dark:border-slate-800 shadow-xl shadow-emerald-100/20 dark:shadow-none relative overflow-hidden transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-50 dark:border-slate-800 transition-colors">
                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors">
                                            <CheckSquare size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 dark:text-white transition-colors">Closing Report</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase transition-colors">End of day submission</p>
                                        </div>
                                    </div>
                                    <MetricsForm data={closingData} setData={setClosingData} onSubmit={handleClosingSubmit} type="closing" isSubmitting={isSubmitting} isLoading={isLoading} />
                                    <div className="mt-6 bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[1.5rem] border border-blue-100 dark:border-blue-900/30 space-y-3 transition-colors">
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                            <MessageCircle size={18} />
                                            <h4 className="text-sm font-black uppercase tracking-widest">Daily Notes (for Admin & HR)</h4>
                                        </div>
                                        <textarea
                                            value={dailyNotes}
                                            onChange={(e) => setDailyNotes(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl font-medium text-slate-700 dark:text-slate-200 text-sm outline-none border border-blue-200 dark:border-slate-700 focus:ring-2 ring-blue-100 dark:ring-blue-900/40 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 min-h-[100px]"
                                            placeholder="Share daily summary, insights, or site updates for Admin and HR..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden transition-colors">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-10 -mt-10"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50 dark:border-slate-800 transition-colors">
                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-colors">
                                            <Layout size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white transition-colors">Opening Report</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider transition-colors">Plan your day ahead</p>
                                        </div>
                                    </div>

                                    {/* --- NEW START DAY CARD --- */}
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden mb-8">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-xl"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div>
                                                    <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                                        <Clock size={12} /> Live Session
                                                    </div>
                                                    <h2 className="text-3xl font-black mb-1">Start Your Day</h2>
                                                    <p className="text-blue-100 font-bold text-sm">Review your tasks and begin tracking</p>
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 min-w-[120px]">
                                                        <p className="text-[10px] font-black text-blue-200 uppercase mb-1">Current Date</p>
                                                        <p className="text-lg font-black">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 min-w-[120px]">
                                                        <p className="text-[10px] font-black text-blue-200 uppercase mb-1">Session Time</p>
                                                        <p className="text-lg font-black">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <MetricsForm data={openingData} setData={setOpeningData} onSubmit={handleOpeningSubmit} type="opening" isSubmitting={isSubmitting} isLoading={isLoading} />
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="project"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Project Report Content (Same as previous implementation) */}
                        {!isTodayOpen ? (
                            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-4 transition-colors">
                                <Layout size={24} />
                                <span className="font-bold">Please submit the daily OPENING report before adding project wise reports.</span>
                            </div>
                        ) : (
                            // ... Existing Project Form ...

                            <div className={`p-6 rounded-[2.5rem] relative overflow-hidden transition-all duration-300 border border-blue-100 dark:border-slate-800 shadow-xl shadow-blue-200/20 dark:shadow-none bg-white dark:bg-slate-900`}>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 transition-colors">
                                        <Briefcase size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Project Wise Reports</h2>
                                        <p className="text-blue-400 dark:text-blue-500 font-bold text-xs uppercase tracking-widest transition-colors">Detailed Task Logging</p>
                                    </div>
                                </div>

                                {!isTodayOpen ? (
                                    <div className="p-6 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100 flex items-center gap-4">
                                        <Layout size={24} />
                                        <span className="font-bold">Please submit the daily OPENING report before adding project wise reports.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Form Card */}
                                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none relative overflow-hidden transition-colors">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 dark:from-blue-900/10 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none opacity-50"></div>

                                            <form onSubmit={handleProjectReportSubmit} className="space-y-6 relative z-10">
                                                <div className="grid grid-cols-1 gap-6">
                                                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:ring-4 ring-blue-500/10 transition-all hover:bg-white dark:hover:bg-slate-800">
                                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Project Selection</label>
                                                        <select name="projectId" value={projectReport.projectId} onChange={handleProjectSelect} className="w-full bg-transparent font-bold text-slate-700 dark:text-white outline-none text-lg">
                                                            <option value="" className="dark:bg-slate-900 text-slate-400">-- Select Project --</option>
                                                            {projects?.map(p => (
                                                                <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                        <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Process / Task</label>
                                                        <input type="text" value={projectReport.process} onChange={(e) => setProjectReport({ ...projectReport, process: e.target.value })} className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none" placeholder="e.g. 3D Modeling" />
                                                    </div>
                                                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                                        <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Image Reference (#)</label>
                                                        <input type="number" value={projectReport.imageCount} onChange={(e) => setProjectReport({ ...projectReport, imageCount: e.target.value })} className="w-full bg-transparent font-bold text-slate-700 dark:text-slate-200 outline-none" placeholder="0" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
                                                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-1"><Clock size={12} /> Start Time</label>
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 italic">
                                                        {projectStartTime || 'Selecting...'}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors">
                                                    <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 flex items-center gap-1"><Clock size={12} /> Log Time</label>
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 italic">
                                                        {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="p-4 rounded-2xl border border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                                    <label className="block text-[9px] font-black text-green-600 dark:text-green-400 uppercase mb-1">Completed</label>
                                                    <input type="number" value={projectReport.completedImages} onChange={(e) => setProjectReport({ ...projectReport, completedImages: e.target.value })} className="w-full bg-transparent font-black text-green-800 dark:text-green-300 text-2xl outline-none" placeholder="0" />
                                                </div>
                                                <div className="p-4 rounded-2xl border border-orange-200 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                                                    <label className="block text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase mb-1">Pending</label>
                                                    <input type="number" value={projectReport.pendingImages} onChange={(e) => setProjectReport({ ...projectReport, pendingImages: e.target.value })} className="w-full bg-transparent font-black text-orange-800 dark:text-orange-300 text-2xl outline-none" placeholder="0" />
                                                </div>
                                            </div>

                                            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors transition-colors">
                                                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Remarks</label>
                                                <textarea value={projectReport.remarks} onChange={(e) => setProjectReport({ ...projectReport, remarks: e.target.value })} className="w-full bg-transparent font-medium text-slate-600 dark:text-slate-400 outline-none text-sm resize-none" rows="2" placeholder="Any issues or notes..."></textarea>
                                            </div>

                                            {/* Detailed Sections Divider */}
                                            <div className="relative py-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-slate-200 dark:border-slate-800 transition-colors"></div>
                                                </div>
                                                <div className="relative flex justify-center">
                                                    <span className="bg-white dark:bg-slate-900 px-4 text-sm text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">Additional Details (Optional)</span>
                                                </div>
                                            </div>

                                                {/* 1. Online Meeting */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-black text-slate-700 uppercase flex items-center gap-2"><MessageCircle size={16} className="text-blue-500" /> Online Meeting</label>
                                                        <button type="button" onClick={() => addRow('onlineMeetings', { date: '', startTime: '', endTime: '', discussion: '' })} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors">+ Add Row</button>
                                                    </div>
                                                    {projectReport.onlineMeetings.length > 0 && (
                                                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase">
                                                                    <tr>
                                                                        <th className="px-4 py-3 w-16">#</th>
                                                                        <th className="px-4 py-3 w-32">Date</th>
                                                                        <th className="px-4 py-3 w-28">Start Time</th>
                                                                        <th className="px-4 py-3 w-28">End Time</th>
                                                                        <th className="px-4 py-3">Discussed On</th>
                                                                        <th className="px-4 py-3 w-10"></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {projectReport.onlineMeetings.map((row, idx) => (
                                                                        <tr key={idx} className="bg-white hover:bg-slate-50/50">
                                                                            <td className="px-4 py-2 font-mono text-slate-500">{idx + 1}</td>
                                                                            <td className="px-4 py-2"><input type="date" value={row.date} onChange={e => updateRow('onlineMeetings', idx, 'date', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 text-xs" /></td>
                                                                            <td className="px-4 py-2"><input type="time" value={row.startTime} onChange={e => updateRow('onlineMeetings', idx, 'startTime', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 text-xs" /></td>
                                                                            <td className="px-4 py-2"><input type="time" value={row.endTime} onChange={e => updateRow('onlineMeetings', idx, 'endTime', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 text-xs" /></td>
                                                                            <td className="px-4 py-2"><input type="text" value={row.discussion} onChange={e => updateRow('onlineMeetings', idx, 'discussion', e.target.value)} className="w-full bg-transparent outline-none font-medium text-slate-600" placeholder="Discussion points..." /></td>
                                                                            <td className="px-4 py-2 text-center"><button type="button" onClick={() => removeRow('onlineMeetings', idx)} className="text-red-400 hover:text-red-500"><Plus size={16} className="rotate-45" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 2. Measurements */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-black text-slate-700 uppercase flex items-center gap-2"><PenTool size={16} className="text-purple-500" /> Measurements</label>
                                                        <button type="button" onClick={() => addRow('measurements', { aeName: '', date: '', discussion: '' })} className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-100 transition-colors">+ Add Row</button>
                                                    </div>
                                                    {projectReport.measurements.length > 0 && (
                                                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase">
                                                                    <tr>
                                                                        <th className="px-4 py-3">AE Name</th>
                                                                        <th className="px-4 py-3 w-40">Date</th>
                                                                        <th className="px-4 py-3">Discussed On</th>
                                                                        <th className="px-4 py-3 w-10"></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {projectReport.measurements.map((row, idx) => (
                                                                        <tr key={idx} className="bg-white hover:bg-slate-50/50">
                                                                            <td className="px-4 py-2"><input type="text" value={row.aeName} onChange={e => updateRow('measurements', idx, 'aeName', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700" placeholder="AE Name" /></td>
                                                                            <td className="px-4 py-2"><input type="date" value={row.date} onChange={e => updateRow('measurements', idx, 'date', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 text-xs" /></td>
                                                                            <td className="px-4 py-2"><input type="text" value={row.discussion} onChange={e => updateRow('measurements', idx, 'discussion', e.target.value)} className="w-full bg-transparent outline-none font-medium text-slate-600" placeholder="Details..." /></td>
                                                                            <td className="px-4 py-2 text-center"><button type="button" onClick={() => removeRow('measurements', idx)} className="text-red-400 hover:text-red-500"><Plus size={16} className="rotate-45" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 3. Showroom Meeting */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-sm font-black text-slate-700 uppercase flex items-center gap-2"><Users size={16} className="text-orange-500" /> Showroom Meeting</label>
                                                        <button type="button" onClick={() => addRow('showroomMeetings', { date: '', startTime: '', endTime: '', discussion: '' })} className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-100 transition-colors">+ Add Row</button>
                                                    </div>
                                                    {projectReport.showroomMeetings.length > 0 && (
                                                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase">
                                                                    <tr>
                                                                        <th className="px-4 py-3 w-16">#</th>
                                                                        <th className="px-4 py-3 w-32">Date</th>
                                                                        <th className="px-4 py-3 w-28">Start Time</th>
                                                                        <th className="px-4 py-3 w-28">End Time</th>
                                                                        <th className="px-4 py-3">Discussed On</th>
                                                                        <th className="px-4 py-3 w-10"></th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {projectReport.showroomMeetings.map((row, idx) => (
                                                                        <tr key={idx} className="bg-white hover:bg-slate-50/50">
                                                                            <td className="px-4 py-2 font-mono text-slate-500">{idx + 1}</td>
                                                                            <td className="px-4 py-2"><input type="date" value={row.date} onChange={e => updateRow('showroomMeetings', idx, 'date', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 text-xs" /></td>
                                                                            <td className="px-4 py-2"><input type="time" value={row.startTime} onChange={e => updateRow('showroomMeetings', idx, 'startTime', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 text-xs" /></td>
                                                                            <td className="px-4 py-2"><input type="time" value={row.endTime} onChange={e => updateRow('showroomMeetings', idx, 'endTime', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 text-xs" /></td>
                                                                            <td className="px-4 py-2"><input type="text" value={row.discussion} onChange={e => updateRow('showroomMeetings', idx, 'discussion', e.target.value)} className="w-full bg-transparent outline-none font-medium text-slate-600" placeholder="Discussion points..." /></td>
                                                                            <td className="px-4 py-2 text-center"><button type="button" onClick={() => removeRow('showroomMeetings', idx)} className="text-red-400 hover:text-red-500"><Plus size={16} className="rotate-45" /></button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 4. Requirements & Colours Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* Requirements - Treated as simple list */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2 transition-colors"><FileText size={16} className="text-pink-500" /> Requirements</label>
                                                            <button type="button" onClick={() => addRow('requirements', '')} className="text-xs bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 px-3 py-1.5 rounded-lg font-bold hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors">+ Add Item</button>
                                                        </div>
                                                        {projectReport.requirements.length > 0 && (
                                                            <div className="space-y-2">
                                                                {projectReport.requirements.map((req, idx) => (
                                                                    <div key={idx} className="flex gap-2">
                                                                        <input type="text" value={req} onChange={e => updateRow('requirements', idx, null, e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-sm outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-pink-200 dark:focus:border-pink-900/50 border transition-all" placeholder="Requirement detail..." />
                                                                        <button type="button" onClick={() => removeRow('requirements', idx)} className="text-slate-300 hover:text-red-400"><Plus size={18} className="rotate-45" /></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Colours - Treated as simple list for now, or key-value if needed later */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2 transition-colors"><Layout size={16} className="text-teal-500" /> Colours</label>
                                                            <button type="button" onClick={() => addRow('colours', '')} className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-lg font-bold hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors">+ Add Colour</button>
                                                        </div>
                                                        {projectReport.colours.length > 0 && (
                                                            <div className="space-y-2">
                                                                {projectReport.colours.map((col, idx) => (
                                                                    <div key={idx} className="flex gap-2">
                                                                        <input type="text" value={col} onChange={e => updateRow('colours', idx, null, e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-sm outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-teal-200 dark:focus:border-teal-900/50 border transition-all" placeholder="Colour specification..." />
                                                                        <button type="button" onClick={() => removeRow('colours', idx)} className="text-slate-300 hover:text-red-400"><Plus size={18} className="rotate-45" /></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <button type="submit" disabled={isSubmitting || isLoading} className="w-full bg-slate-900 dark:bg-primary-dark hover:bg-black dark:hover:bg-primary text-white font-bold py-5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all flex justify-center items-center gap-3 active:scale-[0.98]">
                                                {isSubmitting || isLoading ? 'Adding...' : <><Plus className="bg-white/20 rounded-full p-1" size={24} /> <span className="text-lg">Add Report Entry</span></>}
                                            </button>
                                            </form>
                                        </div>

                                        {/* List */}
                                        <div className="space-y-4">
                                        <h4 className="font-black text-slate-400 dark:text-slate-500 text-xs uppercase px-4 flex items-center justify-between transition-colors">
                                            <span>Today's Entries</span>
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">{todayLog?.la_project_reports ? (typeof todayLog.la_project_reports === 'string' ? JSON.parse(todayLog.la_project_reports).length : todayLog.la_project_reports.length) : 0}</span>
                                        </h4>
                                            {todayLog && todayLog.la_project_reports &&
                                                ((typeof todayLog.la_project_reports === 'string' ? JSON.parse(todayLog.la_project_reports) : todayLog.la_project_reports).map((r, idx) => (
                                                    <motion.div
                                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                    key={idx} className="bg-white dark:bg-slate-900 p-5 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md dark:hover:border-slate-700 transition-all flex justify-between items-center group cursor-default transition-all"
                                                >
                                                    <div>
                                                        <p className="font-black text-slate-800 dark:text-white text-base mb-1 transition-colors">{r.clientName || 'Unknown Project'}</p>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold uppercase text-white bg-violet-500 px-2 py-0.5 rounded-md transition-colors">{r.process}</span>
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md transition-colors"><Clock size={10} /> {r.startTime} - {r.endTime}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-1 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold font-mono transition-colors">
                                                            <span className="text-emerald-400 transition-colors">{r.completedImages}</span>
                                                            <span className="text-slate-500 transition-colors">/</span>
                                                            <span className="text-slate-400 transition-colors">{r.imageCount}</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                                )))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={modalMessage} />

            <ConfirmationModal
                isOpen={confirmationConfig.isOpen}
                onClose={() => setConfirmationConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationConfig.onConfirm}
                title={confirmationConfig.title}
                message={confirmationConfig.message}
            />
        </div>
    );
};

// Sub-component for the Metrics Grid
const MetricsForm = ({ data, setData, onSubmit, type, isSubmitting, isLoading }) => {
    const update = (key, field, val) => {
        setData(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
    };

    const isOpening = type === 'opening';
    const btnColor = isOpening ? 'bg-blue-600' : 'bg-emerald-600';

    // Config with Icons
    const fields = [
        { key: 'initial2D', label: 'Initial 2D', icon: PenTool },
        { key: 'production2D', label: 'Production 2D', icon: Layout },
        { key: 'revised2D', label: 'Revised 2D', icon: FileText },
        { key: 'fresh3D', label: 'Fresh 3D', icon: Box },
        { key: 'revised3D', label: 'Revised 3D', icon: Box },
        { key: 'estimation', label: 'Estimation', icon: DollarSign },
        { key: 'woe', label: 'W.O.E', icon: Briefcase },
        { key: 'onlineDiscussion', label: 'Online Disc.', icon: MessageCircle },
        { key: 'showroomDiscussion', label: 'Showroom Disc.', icon: Users },
        { key: 'signFromEngineer', label: 'Sign Engineers', icon: FileText },
        { key: 'siteVisit', label: 'Site Visit', icon: MapPin },
        { key: 'infurnia', label: 'Infurnia', icon: Monitor },
    ];

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="border border-slate-100 dark:border-slate-800 rounded-[1.5rem] overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-colors">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 transition-colors">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-1/3">Metric Category</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-24 text-center">Count</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Details / Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                        {fields.map((f) => {
                            const Icon = f.icon;
                            return (
                                <tr key={f.key} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                                                <Icon size={16} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide group-hover:text-slate-800 dark:group-hover:text-white">{f.label}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={data[f.key].count}
                                            onChange={(e) => update(f.key, 'count', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-2 text-center font-bold text-slate-800 dark:text-slate-200 rounded-lg text-sm outline-none border border-slate-100 dark:border-slate-700 focus:border-blue-400 dark:focus:border-blue-600 focus:bg-white dark:focus:bg-slate-700 transition-all"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            placeholder="Add details..."
                                            value={data[f.key].details}
                                            onChange={(e) => update(f.key, 'details', e.target.value)}
                                            className="w-full bg-transparent p-2 font-medium text-slate-600 dark:text-slate-400 text-sm outline-none border-b border-transparent focus:border-blue-200 dark:focus:border-blue-700 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <button type="submit" disabled={isSubmitting || isLoading} className={`w-full ${btnColor} hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2`}>
                {isSubmitting || isLoading ? 'Submitting...' : <><CheckSquare size={20} /> {isOpening ? 'Submit Opening Report' : 'Submit Closing Report'}</>}
            </button>
        </form>
    );
};

export default LAWorkLogForm;
