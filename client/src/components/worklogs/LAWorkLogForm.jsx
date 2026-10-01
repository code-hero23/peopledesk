import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createWorkLog, closeWorkLog, getTodayLogStatus, addProjectReport } from '../../features/employee/employeeSlice';
import { getProjects, createProject } from '../../features/projects/projectSlice';
import SuccessModal from '../SuccessModal';
import ConfirmationModal from '../ConfirmationModal';
import {
    FileText, Box, PenTool, Layout, DollarSign,
    MessageCircle, Users, CheckSquare, Plus, Clock, X,
    ImageIcon, Briefcase, Calendar, ChevronRight, MapPin, Monitor,
    AlertTriangle, Search, ChevronDown, Check, Sparkles, Filter,
    Layers, HelpCircle, ArrowRight, Play, CheckCircle2, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const PROCESS_SUGGESTIONS = [
    '3D Modeling',
    '2D Production Drawing',
    'Revised 2D Design',
    '3D Rendering & Lighting',
    'Revised 3D Renders',
    'Infurnia Modeling',
    'Estimation & BOQ',
    'Online Client Discussion',
    'Showroom Client Meeting',
    'Site Measurement & Verification'
];

const METRIC_FIELDS = [
    { key: 'initial2D', label: 'Initial 2D', icon: PenTool, category: '2D Drafting' },
    { key: 'production2D', label: 'Production 2D', icon: Layout, category: '2D Drafting' },
    { key: 'revised2D', label: 'Revised 2D', icon: FileText, category: '2D Drafting' },
    { key: 'fresh3D', label: 'Fresh 3D', icon: Box, category: '3D Visualization' },
    { key: 'revised3D', label: 'Revised 3D', icon: Box, category: '3D Visualization' },
    { key: 'infurnia', label: 'Infurnia', icon: Monitor, category: '3D Visualization' },
    { key: 'estimation', label: 'Estimation', icon: DollarSign, category: 'Commercials' },
    { key: 'woe', label: 'W.O.E', icon: Briefcase, category: 'Commercials' },
    { key: 'onlineDiscussion', label: 'Online Discussion', icon: MessageCircle, category: 'Meetings & Site' },
    { key: 'showroomDiscussion', label: 'Showroom Meeting', icon: Users, category: 'Meetings & Site' },
    { key: 'siteVisit', label: 'Site Visit', icon: MapPin, category: 'Meetings & Site' },
    { key: 'signFromEngineer', label: 'Sign From Engineer', icon: FileText, category: 'Meetings & Site' },
];

const INITIAL_METRICS = {
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

const LAWorkLogForm = ({ onSuccess }) => {
    const dispatch = useDispatch();
    const { isLoading, todayLog } = useSelector((state) => state.employee);
    const { projects } = useSelector((state) => state.projects);

    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [reportType, setReportType] = useState('daily'); // 'daily', 'project'
    
    // Project Search & Combobox states
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const projectDropdownRef = useRef(null);

    // Project entries search & filter state
    const [entriesSearchQuery, setEntriesSearchQuery] = useState('');

    // Inline Create Project Modal
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', location: '' });

    // Confirmation Modal Config
    const [confirmationConfig, setConfirmationConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const isTodayClosed = todayLog?.logStatus === 'CLOSED';
    const isTodayOpen = todayLog?.logStatus === 'OPEN';
    
    const projectReportsList = useMemo(() => {
        if (!todayLog?.la_project_reports) return [];
        return typeof todayLog.la_project_reports === 'string'
            ? JSON.parse(todayLog.la_project_reports)
            : todayLog.la_project_reports;
    }, [todayLog]);


    const [openingData, setOpeningData] = useState({ ...INITIAL_METRICS });
    const [closingData, setClosingData] = useState({ ...INITIAL_METRICS, notes: '' });
    const [dailyNotes, setDailyNotes] = useState('');

    // Detailed Project Report State
    const [projectReport, setProjectReport] = useState({
        date: new Date().toLocaleDateString('en-CA'),
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
        onlineMeetings: [],
        showroomMeetings: [],
        measurements: [],
        requirements: [],
        colours: []
    });

    const [projectStartTime, setProjectStartTime] = useState(null);
    const [openAccordion, setOpenAccordion] = useState(null); // 'meetings', 'measurements', 'requirements'

    useEffect(() => {
        dispatch(getTodayLogStatus());
        dispatch(getProjects());
    }, [dispatch]);

    // Close project dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
                setIsProjectDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Persistence: Preload data from todayLog (Opening Metrics) into Closing Form
    useEffect(() => {
        if (isTodayOpen && todayLog?.la_opening_metrics) {
            setClosingData(prev => ({
                ...prev,
                ...todayLog.la_opening_metrics,
                notes: prev.notes
            }));
        }
    }, [isTodayOpen, todayLog]);

    // Filter projects for searchable dropdown
    const filteredProjects = useMemo(() => {
        if (!projects || !Array.isArray(projects)) return [];
        if (!projectSearchQuery.trim()) return projects;
        const q = projectSearchQuery.toLowerCase();
        return projects.filter(p =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.location && p.location.toLowerCase().includes(q)) ||
            (p.id && String(p.id).includes(q))
        );
    }, [projects, projectSearchQuery]);

    // Filter today's project report entries
    const filteredEntries = useMemo(() => {
        if (!projectReportsList || !Array.isArray(projectReportsList)) return [];
        if (!entriesSearchQuery.trim()) return projectReportsList;
        const q = entriesSearchQuery.toLowerCase();
        return projectReportsList.filter(entry =>
            (entry.clientName && entry.clientName.toLowerCase().includes(q)) ||
            (entry.site && entry.site.toLowerCase().includes(q)) ||
            (entry.process && entry.process.toLowerCase().includes(q)) ||
            (entry.remarks && entry.remarks.toLowerCase().includes(q))
        );
    }, [projectReportsList, entriesSearchQuery]);

    // Calculate summary statistics
    const stats = useMemo(() => {
        let totalCompleted = 0;
        let totalReference = 0;
        let totalHours = 0;

        projectReportsList.forEach(r => {
            if (r.completedImages) totalCompleted += parseInt(r.completedImages) || 0;
            if (r.imageCount) totalReference += parseInt(r.imageCount) || 0;
            if (r.totalHours) totalHours += parseFloat(r.totalHours) || 0;
        });

        return {
            totalEntries: projectReportsList.length,
            totalCompleted,
            totalReference,
            totalHours: totalHours.toFixed(1)
        };
    }, [projectReportsList]);

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
            if (typeof updatedList[index] === 'object' && key !== null) {
                updatedList[index] = { ...updatedList[index], [key]: value };
            } else {
                updatedList[index] = value;
            }
            return { ...prev, [field]: updatedList };
        });
    };

    const sanitizeMetrics = (metricsObj) => {
        const sanitized = { ...metricsObj };
        Object.keys(sanitized).forEach(k => {
            if (sanitized[k] && typeof sanitized[k] === 'object') {
                const detailsStr = String(sanitized[k].details || '').trim();
                const rawCount = sanitized[k].count;
                if (detailsStr && (!rawCount || rawCount === '0' || rawCount === 0)) {
                    sanitized[k] = { ...sanitized[k], count: 1 };
                }
            }
        });
        return sanitized;
    };

    const handleOpeningSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setConfirmationConfig({
            isOpen: true,
            title: 'Start Day & Submit Opening Plan',
            message: 'Are you ready to start your working day with these initial metrics and targets?',
            onConfirm: () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const payload = {
                    logStatus: 'OPEN',
                    la_opening_metrics: sanitizeMetrics(openingData),
                    startTime: currentTime
                };
                dispatch(createWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Opening Plan Submitted! Session started.");
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
            title: 'End Day & Submit Closing Report',
            message: 'Are you sure you want to end your day and submit final closing metrics for today?',
            onConfirm: () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const payload = {
                    la_closing_metrics: sanitizeMetrics(closingData),
                    notes: dailyNotes,
                    endTime: currentTime
                };
                dispatch(closeWorkLog(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Closing Report Submitted! Great work today.");
                        setShowSuccess(true);
                    }
                    setIsSubmitting(false);
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleSelectProject = (project) => {
        setProjectReport(prev => ({
            ...prev,
            projectId: project.id,
            clientName: project.name,
            site: project.location || ''
        }));
        setIsProjectDropdownOpen(false);
        setProjectSearchQuery('');

        if (!projectStartTime) {
            setProjectStartTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!newProject.name.trim()) return toast.error("Project name is required");
        setIsSubmitting(true);
        try {
            const result = await dispatch(createProject(newProject)).unwrap();
            toast.success("Project created successfully!");
            setProjectReport(prev => ({
                ...prev,
                projectId: result.id,
                clientName: result.name,
                site: result.location || ''
            }));
            setIsCreatingProject(false);
            setNewProject({ name: '', location: '' });
            if (!projectStartTime) {
                setProjectStartTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            }
        } catch (error) {
            toast.error(error || "Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProjectReportSubmit = (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!projectReport.clientName && !projectReport.projectId) {
            return toast.error("Please select or specify a Project / Client name.");
        }

        setConfirmationConfig({
            isOpen: true,
            title: 'Save Project Report Entry',
            message: `Add log entry for "${projectReport.clientName || 'Project'}" to your daily record?`,
            onConfirm: () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const startTimeToUse = projectStartTime || projectReport.startTime || currentTime;

                const payload = {
                    projectReport: {
                        ...projectReport,
                        startTime: startTimeToUse,
                        endTime: currentTime
                    }
                };

                dispatch(addProjectReport(payload)).then((res) => {
                    if (!res.error) {
                        setModalMessage("Project Report Entry Saved!");
                        setShowSuccess(true);
                        // Reset form
                        setProjectReport({
                            date: new Date().toLocaleDateString('en-CA'),
                            projectId: '', clientName: '', site: '', process: '',
                            imageCount: '', startTime: '', endTime: '',
                            completedImages: '', pendingImages: '', remarks: '',
                            onlineMeetings: [], showroomMeetings: [], measurements: [], requirements: [], colours: []
                        });
                        setProjectStartTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                        setOpenAccordion(null);
                    }
                    setIsSubmitting(false);
                });
                setConfirmationConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold text-slate-500">Loading LA Workspace...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Top Workspace Banner & Workflow Switcher */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                                <Sparkles size={12} /> Architect Workspace
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                isTodayClosed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                isTodayOpen ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse' :
                                'bg-slate-700 text-slate-300'
                            }`}>
                                {isTodayClosed ? '● Day Completed' : isTodayOpen ? '● Day Active' : '○ Not Started'}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Daily Work Logs & Project Reporting</h1>
                        <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                            Record structured 2D/3D metrics, log project-specific execution hours, and submit end-of-day reports seamlessly.
                        </p>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 min-w-[110px]">
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-wider">Date</p>
                            <p className="text-sm font-black">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 min-w-[110px]">
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-wider">Projects Logged</p>
                            <p className="text-sm font-black text-emerald-300">{stats.totalEntries} Entries</p>
                        </div>
                        {todayLog?.startTime && (
                            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 min-w-[110px]">
                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-wider">Start Time</p>
                                <p className="text-sm font-black text-amber-300">{todayLog.startTime}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
                    <button
                        onClick={() => setReportType('daily')}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                            reportType === 'daily'
                                ? 'bg-white text-slate-900 shadow-lg scale-105'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                        <Calendar size={16} /> Daily Report ({isTodayOpen ? 'Closing' : isTodayClosed ? 'Completed' : 'Opening'})
                    </button>

                    <button
                        onClick={() => setReportType('project')}
                        className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                            reportType === 'project'
                                ? 'bg-blue-500 text-white shadow-lg scale-105 shadow-blue-500/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                        <Briefcase size={16} /> Project Wise Logs
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{stats.totalEntries}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <AnimatePresence mode="wait">
                {reportType === 'daily' ? (
                    <motion.div
                        key="daily"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="space-y-6"
                    >
                        {isTodayClosed ? (
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-8 sm:p-12 rounded-3xl text-center border border-emerald-200 dark:border-emerald-800 shadow-xl space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-300 shadow-inner">
                                    <CheckCircle2 size={36} />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-100">Day Successfully Completed!</h3>
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 max-w-lg mx-auto">
                                    Your opening metrics, project reports, and closing submission for today have been officially recorded.
                                </p>
                                <div className="pt-4 flex justify-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setReportType('project')}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        <Briefcase size={16} /> View Today's Project Entries ({stats.totalEntries})
                                    </button>
                                </div>
                            </div>
                        ) : isTodayOpen ? (
                            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                                            <CheckSquare size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white">Closing Report</h3>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">End of Day Submission & Final Counts</p>
                                        </div>
                                    </div>
                                    
                                </div>

                                <MetricsGridForm
                                    data={closingData}
                                    setData={setClosingData}
                                    onSubmit={handleClosingSubmit}
                                    type="closing"
                                    isSubmitting={isSubmitting}
                                    isLoading={isLoading}
                                    dailyNotes={dailyNotes}
                                    setDailyNotes={setDailyNotes}
                                />
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
                                <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                                        <Layout size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Opening Report & Day Planning</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Set your planned targets for today</p>
                                    </div>
                                </div>

                                <MetricsGridForm
                                    data={openingData}
                                    setData={setOpeningData}
                                    onSubmit={handleOpeningSubmit}
                                    type="opening"
                                    isSubmitting={isSubmitting}
                                    isLoading={isLoading}
                                />
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="project"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="space-y-8"
                    >
                        {/* Warning if Day is not opened */}
                        {!isTodayOpen && !isTodayClosed && (
                            <div className="p-5 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle size={24} className="text-amber-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-black">Opening Report Not Submitted</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            Please submit the daily Opening report first to set your planned metrics, or log directly.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReportType('daily')}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase whitespace-nowrap shadow-md transition-all active:scale-95"
                                >
                                    Start Day Now
                                </button>
                            </div>
                        )}

                        {/* Project Report Form Card */}
                        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                                        <Briefcase size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 dark:text-white">Add Project-Wise Work Entry</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log specific drawings, processes, and client interactions</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                        <Clock size={14} /> Session Start: <strong className="text-slate-700 dark:text-slate-200">{projectStartTime || 'Now'}</strong>
                                    </span>
                                </div>
                            </div>

                            <form onSubmit={handleProjectReportSubmit} className="space-y-6">
                                {/* 1. Searchable Project Selector */}
                                <div className="grid grid-cols-1 gap-4" ref={projectDropdownRef}>
                                    <div className="relative">
                                        <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                            <span>Select Project / Client <span className="text-rose-500">*</span></span>
                                            <button
                                                type="button"
                                                onClick={() => setIsCreatingProject(!isCreatingProject)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                {isCreatingProject ? <X size={14} /> : <Plus size={14} />}
                                                {isCreatingProject ? 'Cancel' : 'New Project'}
                                            </button>
                                        </label>

                                        {isCreatingProject ? (
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-blue-200 dark:border-slate-700 space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Project / Client Name *"
                                                        value={newProject.name}
                                                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                                        className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-xl font-bold text-slate-800 dark:text-white outline-none border border-slate-200 dark:border-slate-700 text-sm focus:border-blue-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Site Location (e.g. Whitefield)"
                                                        value={newProject.location}
                                                        onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                                                        className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-xl font-bold text-slate-800 dark:text-white outline-none border border-slate-200 dark:border-slate-700 text-sm focus:border-blue-500"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleCreateProject}
                                                    disabled={isSubmitting}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all"
                                                >
                                                    {isSubmitting ? 'Creating...' : 'Save & Select Project'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <div
                                                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                                                    className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                                                            <Briefcase size={18} />
                                                        </div>
                                                        <div className="truncate">
                                                            {projectReport.clientName ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-slate-800 dark:text-white text-base truncate">{projectReport.clientName}</span>
                                                                    {projectReport.site && (
                                                                        <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold">
                                                                            📍 {projectReport.site}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 font-bold text-sm">Search and choose project...</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                                                </div>

                                                {/* Searchable Combobox Dropdown */}
                                                <AnimatePresence>
                                                    {isProjectDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 5 }}
                                                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 flex flex-col"
                                                        >
                                                            {/* Search Input */}
                                                            <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-2">
                                                                <Search size={16} className="text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Type project name or location..."
                                                                    value={projectSearchQuery}
                                                                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                                    autoFocus
                                                                    className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-400"
                                                                />
                                                                {projectSearchQuery && (
                                                                    <button type="button" onClick={() => setProjectSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                                                        <X size={14} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Project List */}
                                                            <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-700/50">
                                                                {filteredProjects.length === 0 ? (
                                                                    <div className="p-6 text-center text-slate-400 text-xs">
                                                                        <p className="font-bold">No projects found matching "{projectSearchQuery}"</p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setNewProject({ name: projectSearchQuery, location: '' });
                                                                                setIsCreatingProject(true);
                                                                                setIsProjectDropdownOpen(false);
                                                                            }}
                                                                            className="mt-3 text-xs font-black text-blue-600 hover:underline"
                                                                        >
                                                                            + Create "{projectSearchQuery}" as new project
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    filteredProjects.map((p) => {
                                                                        const isSelected = projectReport.projectId === p.id;
                                                                        return (
                                                                            <div
                                                                                key={p.id}
                                                                                onClick={() => handleSelectProject(p)}
                                                                                className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                                                                                    isSelected
                                                                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                                                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                                                                                }`}
                                                                            >
                                                                                <div>
                                                                                    <p className="font-black text-sm">{p.name}</p>
                                                                                    {p.location && (
                                                                                        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                                                            <MapPin size={10} /> {p.location}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                {isSelected && <Check size={18} className="text-blue-600 dark:text-blue-400" />}
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Process & Task Selection with Quick Chips */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Process / Task Description <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 3D Living Room Modeling & Texture Mapping"
                                        value={projectReport.process}
                                        onChange={(e) => setProjectReport({ ...projectReport, process: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 text-sm transition-all"
                                    />
                                    {/* Quick chips */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {PROCESS_SUGGESTIONS.map((proc) => (
                                            <button
                                                key={proc}
                                                type="button"
                                                onClick={() => setProjectReport(prev => ({ ...prev, process: proc }))}
                                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                                                    projectReport.process === proc
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                                                }`}
                                            >
                                                {proc}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Image Deliverables & Tracking Counts */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <ImageIcon size={12} /> Reference Images (#)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={projectReport.imageCount}
                                            onChange={(e) => setProjectReport({ ...projectReport, imageCount: e.target.value })}
                                            className="w-full bg-transparent font-black text-xl text-slate-800 dark:text-white outline-none"
                                        />
                                    </div>

                                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/40">
                                        <label className="block text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Completed Images
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={projectReport.completedImages}
                                            onChange={(e) => setProjectReport({ ...projectReport, completedImages: e.target.value })}
                                            className="w-full bg-transparent font-black text-xl text-emerald-700 dark:text-emerald-300 outline-none"
                                        />
                                    </div>

                                    <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/40">
                                        <label className="block text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Clock size={12} /> Pending Images
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={projectReport.pendingImages}
                                            onChange={(e) => setProjectReport({ ...projectReport, pendingImages: e.target.value })}
                                            className="w-full bg-transparent font-black text-xl text-amber-700 dark:text-amber-300 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* 4. Remarks */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Remarks & Key Observations (Optional)
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Add notes, client feedback, or revision details..."
                                        value={projectReport.remarks}
                                        onChange={(e) => setProjectReport({ ...projectReport, remarks: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 text-sm transition-all"
                                    ></textarea>
                                </div>

                                {/* 5. Collapsible Section for Additional Details (Meetings, Measurements, Specs) */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Additional Detailed Modules (Optional)</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setOpenAccordion(openAccordion === 'meetings' ? null : 'meetings')}
                                            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                                openAccordion === 'meetings'
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <MessageCircle size={16} className="text-blue-500" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Meetings</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
                                                {projectReport.onlineMeetings.length + projectReport.showroomMeetings.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setOpenAccordion(openAccordion === 'measurements' ? null : 'measurements')}
                                            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                                openAccordion === 'measurements'
                                                    ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700'
                                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <PenTool size={16} className="text-purple-500" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Measurements</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
                                                {projectReport.measurements.length}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setOpenAccordion(openAccordion === 'specs' ? null : 'specs')}
                                            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                                openAccordion === 'specs'
                                                    ? 'bg-pink-50 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700'
                                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Layers size={16} className="text-pink-500" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Specs & Colours</span>
                                            </div>
                                            <span className="text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
                                                {projectReport.requirements.length + projectReport.colours.length}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Accordion 1: Meetings */}
                                    {openAccordion === 'meetings' && (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
                                            {/* Online Meeting */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2">
                                                        <MessageCircle size={14} className="text-blue-500" /> Online Meeting Log
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => addRow('onlineMeetings', { date: new Date().toLocaleDateString('en-CA'), startTime: '', endTime: '', discussion: '' })}
                                                        className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-xl hover:bg-blue-200"
                                                    >
                                                        + Add Online Meeting
                                                    </button>
                                                </div>
                                                {projectReport.onlineMeetings.map((row, idx) => (
                                                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <input type="date" value={row.date} onChange={e => updateRow('onlineMeetings', idx, 'date', e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none" />
                                                        <input type="time" placeholder="Start" value={row.startTime} onChange={e => updateRow('onlineMeetings', idx, 'startTime', e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none" />
                                                        <input type="text" placeholder="Discussed details..." value={row.discussion} onChange={e => updateRow('onlineMeetings', idx, 'discussion', e.target.value)} className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-none sm:col-span-1" />
                                                        <div className="flex justify-end items-center">
                                                            <button type="button" onClick={() => removeRow('onlineMeetings', idx)} className="text-rose-500 hover:text-rose-700 p-1">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Showroom Meeting */}
                                            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2">
                                                        <Users size={14} className="text-amber-500" /> Showroom Meeting Log
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => addRow('showroomMeetings', { date: new Date().toLocaleDateString('en-CA'), startTime: '', endTime: '', discussion: '' })}
                                                        className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-xl hover:bg-amber-200"
                                                    >
                                                        + Add Showroom Meeting
                                                    </button>
                                                </div>
                                                {projectReport.showroomMeetings.map((row, idx) => (
                                                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <input type="date" value={row.date} onChange={e => updateRow('showroomMeetings', idx, 'date', e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none" />
                                                        <input type="time" placeholder="Start" value={row.startTime} onChange={e => updateRow('showroomMeetings', idx, 'startTime', e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none" />
                                                        <input type="text" placeholder="Discussed points..." value={row.discussion} onChange={e => updateRow('showroomMeetings', idx, 'discussion', e.target.value)} className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-none" />
                                                        <div className="flex justify-end items-center">
                                                            <button type="button" onClick={() => removeRow('showroomMeetings', idx)} className="text-rose-500 hover:text-rose-700 p-1">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Accordion 2: Measurements */}
                                    {openAccordion === 'measurements' && (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2">
                                                    <PenTool size={14} className="text-purple-500" /> Site Measurements with AE
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => addRow('measurements', { aeName: '', date: new Date().toLocaleDateString('en-CA'), discussion: '' })}
                                                    className="text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-xl hover:bg-purple-200"
                                                >
                                                    + Add AE Measurement
                                                </button>
                                            </div>
                                            {projectReport.measurements.map((row, idx) => (
                                                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <input type="text" placeholder="AE Name" value={row.aeName} onChange={e => updateRow('measurements', idx, 'aeName', e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none" />
                                                    <input type="date" value={row.date} onChange={e => updateRow('measurements', idx, 'date', e.target.value)} className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none" />
                                                    <input type="text" placeholder="Measurement details..." value={row.discussion} onChange={e => updateRow('measurements', idx, 'discussion', e.target.value)} className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-none" />
                                                    <div className="flex justify-end items-center">
                                                        <button type="button" onClick={() => removeRow('measurements', idx)} className="text-rose-500 hover:text-rose-700 p-1">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Accordion 3: Specs & Colours */}
                                    {openAccordion === 'specs' && (
                                        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Requirements */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Requirements</span>
                                                        <button type="button" onClick={() => addRow('requirements', '')} className="text-[11px] font-bold text-pink-600 hover:underline">+ Add</button>
                                                    </div>
                                                    {projectReport.requirements.map((req, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <input type="text" placeholder="e.g. Master Bedroom Wardrobe" value={req} onChange={e => updateRow('requirements', idx, null, e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white outline-none" />
                                                            <button type="button" onClick={() => removeRow('requirements', idx)} className="text-rose-400 hover:text-rose-600"><X size={16} /></button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Colours */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Colour Codes</span>
                                                        <button type="button" onClick={() => addRow('colours', '')} className="text-[11px] font-bold text-teal-600 hover:underline">+ Add</button>
                                                    </div>
                                                    {projectReport.colours.map((col, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <input type="text" placeholder="e.g. SF 102 High Gloss White" value={col} onChange={e => updateRow('colours', idx, null, e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white outline-none" />
                                                            <button type="button" onClick={() => removeRow('colours', idx)} className="text-rose-400 hover:text-rose-600"><X size={16} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-[1.01] transition-all flex justify-center items-center gap-2 active:scale-95"
                                >
                                    {isSubmitting ? 'Saving Entry...' : (
                                        <>
                                            <Plus size={20} />
                                            <span>Add Project Report Entry</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Project Wise Entries Search & List */}
                        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                        <span>Today's Project Entries</span>
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold px-2.5 py-0.5 rounded-full font-mono">
                                            {projectReportsList.length}
                                        </span>
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtered list of tasks recorded for today</p>
                                </div>

                                {/* Search Bar for Project Reports */}
                                <div className="relative min-w-[260px]">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search project, process, site..."
                                        value={entriesSearchQuery}
                                        onChange={(e) => setEntriesSearchQuery(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                                    />
                                    {entriesSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setEntriesSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Entries List */}
                            <div className="space-y-3">
                                {projectReportsList.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                                        <Briefcase size={36} className="mx-auto text-slate-300" />
                                        <p className="font-bold text-sm">No project reports logged yet for today.</p>
                                        <p className="text-xs text-slate-400">Select a project above and click "Add Project Report Entry".</p>
                                    </div>
                                ) : filteredEntries.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <p className="font-bold text-sm">No project entries matching "{entriesSearchQuery}"</p>
                                    </div>
                                ) : (
                                    filteredEntries.map((entry, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-slate-50/80 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-800 dark:text-white text-base">
                                                        {entry.clientName || 'Unnamed Project'}
                                                    </span>
                                                    {entry.site && (
                                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md">
                                                            📍 {entry.site}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                                    <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded-md text-[10px] uppercase">
                                                        {entry.process || 'Task'}
                                                    </span>
                                                    <span className="text-slate-500 font-bold flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md text-[10px]">
                                                        <Clock size={11} /> {entry.startTime || '--:--'} - {entry.endTime || '--:--'}
                                                    </span>
                                                    {entry.remarks && (
                                                        <span className="text-slate-500 dark:text-slate-400 italic text-xs">
                                                            "{entry.remarks}"
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Deliverables summary */}
                                            <div className="flex items-center gap-3 self-end sm:self-center">
                                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase">Completed / Ref</p>
                                                    <p className="text-sm font-black font-mono">
                                                        <span className="text-emerald-600 dark:text-emerald-400">{entry.completedImages || 0}</span>
                                                        <span className="text-slate-400"> / </span>
                                                        <span className="text-slate-700 dark:text-slate-300">{entry.imageCount || 0}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
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

// Sub-component: Clean Card-Based Metrics Form
const MetricsGridForm = ({
    data,
    setData,
    onSubmit,
    type,
    isSubmitting,
    isLoading,
    dailyNotes,
    setDailyNotes
}) => {
    const update = (key, field, val) => {
        setData(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
    };

    const isOpening = type === 'opening';

    return (
        <form onSubmit={onSubmit} className="space-y-6">

            {/* Structured Metric Categories */}
            <div className="space-y-6">
                {['2D Drafting', '3D Visualization', 'Commercials', 'Meetings & Site'].map((category) => {
                    const fieldsInCat = METRIC_FIELDS.filter(f => f.category === category);
                    return (
                        <div key={category} className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 pl-1">
                                {category}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {fieldsInCat.map((f) => {
                                    const Icon = f.icon;
                                    const countVal = data[f.key]?.count ?? '';
                                    const detailsVal = data[f.key]?.details ?? '';

                                    return (
                                        <div
                                            key={f.key}
                                            className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700 transition-all space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="p-2 bg-white dark:bg-slate-700/60 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm">
                                                        <Icon size={16} />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                        {f.label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="w-24 flex-shrink-0">
                                                    <input
                                                        type="number"
                                                        placeholder="Count: 0"
                                                        value={countVal}
                                                        onChange={(e) => update(f.key, 'count', e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-center font-black text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Notes / Project..."
                                                        value={detailsVal}
                                                        onChange={(e) => {
                                                            const detailsVal = e.target.value;
                                                            setData(prev => {
                                                                const curCount = prev[f.key]?.count;
                                                                const newCount = (detailsVal.trim() && (!curCount || curCount === '0' || curCount === 0)) ? 1 : curCount;
                                                                return {
                                                                    ...prev,
                                                                    [f.key]: {
                                                                        ...prev[f.key],
                                                                        details: detailsVal,
                                                                        count: newCount
                                                                    }
                                                                };
                                                            });
                                                        }}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Daily Notes (For Closing Report) */}
            {!isOpening && setDailyNotes && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <MessageCircle size={16} /> Daily Notes & Highlights (for Admin & HR)
                    </label>
                    <textarea
                        value={dailyNotes}
                        onChange={(e) => setDailyNotes(e.target.value)}
                        rows={3}
                        placeholder="Summarize daily achievements, challenges, or client approvals for management..."
                        className="w-full bg-white dark:bg-slate-900 p-3.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none border border-blue-200 dark:border-slate-700 focus:border-blue-500 placeholder:text-slate-400"
                    ></textarea>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 ${
                    isOpening
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
                }`}
            >
                {isSubmitting || isLoading ? 'Submitting...' : (
                    <>
                        <CheckSquare size={20} />
                        {isOpening ? 'Submit Opening Report' : 'Submit Final Closing Report'}
                    </>
                )}
            </button>
        </form>
    );
};

export default LAWorkLogForm;
