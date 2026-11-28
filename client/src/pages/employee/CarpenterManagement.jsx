import { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    Hammer,
    Plus,
    Search,
    Filter,
    Calendar,
    Building2,
    User,
    Clock,
    Edit3,
    Trash2,
    Camera,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    X,
    ZoomIn,
    HardHat,
    Phone,
    ArrowRight,
    History,
    Sparkles,
    Upload,
    TrendingUp,
    Check,
    MapPin,
    Layers,
    FileText,
    ExternalLink
} from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'All Projects' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'ON_HOLD', label: 'On Hold' }
];

const CarpenterManagement = () => {
    const { user } = useSelector((state) => state.auth);
    const [assignments, setAssignments] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        inProgress: 0,
        completed: 0,
        assigned: 0,
        onHold: 0,
        avgProgress: 0
    });
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
    const [assignForm, setAssignForm] = useState({
        siteName: '',
        clientName: '',
        siteAddress: '',
        carpenterName: '',
        carpenterPhone: '',
        startDate: new Date().toISOString().split('T')[0],
        targetDate: '',
        scopeOfWork: '',
        initialProgress: 0,
        initialWorkDone: '',
        status: 'IN_PROGRESS',
        remarks: ''
    });

    // Modal: Note Daily Work Done
    const [showDailyLogModal, setShowDailyLogModal] = useState(false);
    const [targetAssignmentForLog, setTargetAssignmentForLog] = useState(null);
    const [isSubmittingLog, setIsSubmittingLog] = useState(false);
    const [dailyLogForm, setDailyLogForm] = useState({
        logDate: new Date().toISOString().split('T')[0],
        workDoneText: '',
        progressPercentage: 0,
        carpentersCount: 1,
        hoursWorked: 8,
        blockersOrIssues: '',
        markCompleted: false
    });
    const [selectedPhotoFiles, setSelectedPhotoFiles] = useState([]);
    const [previewUrls, setPreviewUrls] = useState([]);
    const fileInputRef = useRef(null);

    // Modal: Timeline / Details View
    const [timelineAssignment, setTimelineAssignment] = useState(null);
    const [timelineLogs, setTimelineLogs] = useState([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    // Modal: Photo Zoom Lightbox
    const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState(null);

    const baseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api', []);
    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Bearer ${user?.token}` }
    }), [user?.token]);

    // Permissions check
    const isVendorManagement = (user?.designation || '').toUpperCase().includes('VENDOR') && user?.role !== 'WALL2WALL_EMPLOYEE';
    const isManagement = ['ADMIN', 'SUPER_ADMIN', 'BUSINESS_HEAD', 'HR', 'ACCOUNTS_MANAGER'].includes(user?.role) ||
        (user?.designation || '').toUpperCase() === 'COO';
    const canManage = isVendorManagement || isManagement;

    // Fetch assignments and stats
    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm.trim()) params.append('search', searchTerm.trim());
            if (statusFilter !== 'ALL') params.append('status', statusFilter);

            const [assignRes, statsRes] = await Promise.all([
                axios.get(`${baseUrl}/carpenter-management/assignments?${params.toString()}`, authHeaders),
                axios.get(`${baseUrl}/carpenter-management/stats`, authHeaders)
            ]);

            setAssignments(Array.isArray(assignRes.data) ? assignRes.data : []);
            if (statsRes.data) setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to load carpenter management data:', error);
            toast.error(error.response?.data?.message || 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Helper: full image url
    const getPhotoUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const root = baseUrl.replace('/api', '');
        return `${root}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Keyboard escape closes modals
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShowAssignModal(false);
                setShowDailyLogModal(false);
                setTimelineAssignment(null);
                setLightboxPhotoUrl(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Open Assign Modal
    const handleOpenAssignModal = (assignment = null) => {
        if (assignment) {
            setEditingAssignment(assignment);
            setAssignForm({
                siteName: assignment.siteName || '',
                clientName: assignment.clientName || '',
                siteAddress: assignment.siteAddress || '',
                carpenterName: assignment.carpenterName || '',
                carpenterPhone: assignment.carpenterPhone || '',
                startDate: assignment.startDate ? new Date(assignment.startDate).toISOString().split('T')[0] : '',
                targetDate: assignment.targetDate ? new Date(assignment.targetDate).toISOString().split('T')[0] : '',
                scopeOfWork: assignment.scopeOfWork || '',
                initialProgress: assignment.progressPercentage || 0,
                initialWorkDone: '',
                status: assignment.status || 'IN_PROGRESS',
                remarks: assignment.remarks || ''
            });
        } else {
            setEditingAssignment(null);
            setAssignForm({
                siteName: '',
                clientName: '',
                siteAddress: '',
                carpenterName: '',
                carpenterPhone: '',
                startDate: new Date().toISOString().split('T')[0],
                targetDate: '',
                scopeOfWork: '',
                initialProgress: 0,
                initialWorkDone: '',
                status: 'IN_PROGRESS',
                remarks: ''
            });
        }
        setShowAssignModal(true);
    };

    // Submit Site Assignment
    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingAssign(true);
        try {
            if (editingAssignment) {
                await axios.put(`${baseUrl}/carpenter-management/assignments/${editingAssignment.id}`, assignForm, authHeaders);
                toast.success('Carpenter assignment updated successfully');
            } else {
                await axios.post(`${baseUrl}/carpenter-management/assignments`, assignForm, authHeaders);
                toast.success('Carpenter assigned to site successfully');
            }
            setShowAssignModal(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save assignment:', error);
            toast.error(error.response?.data?.message || 'Failed to save site assignment');
        } finally {
            setIsSubmittingAssign(false);
        }
    };

    // Delete Site Assignment
    const handleDeleteAssignment = async (id) => {
        if (!window.confirm('Are you sure you want to delete this site assignment and all daily work records?')) return;
        try {
            await axios.delete(`${baseUrl}/carpenter-management/assignments/${id}`, authHeaders);
            toast.success('Site assignment deleted');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete assignment');
        }
    };

    // Open Daily Work Log Modal
    const handleOpenDailyLogModal = (assignment) => {
        setTargetAssignmentForLog(assignment);
        setDailyLogForm({
            logDate: new Date().toISOString().split('T')[0],
            workDoneText: '',
            progressPercentage: assignment.progressPercentage || 0,
            carpentersCount: 1,
            hoursWorked: 8,
            blockersOrIssues: '',
            markCompleted: assignment.progressPercentage >= 100
        });
        setSelectedPhotoFiles([]);
        setPreviewUrls([]);
        setShowDailyLogModal(true);
    };

    // Handle File Selection
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setSelectedPhotoFiles(files);
        const urls = files.map(f => URL.createObjectURL(f));
        setPreviewUrls(urls);
    };

    // Submit Daily Work Log
    const handleDailyLogSubmit = async (e) => {
        e.preventDefault();
        if (!dailyLogForm.workDoneText.trim()) {
            toast.error('Please describe the work done today');
            return;
        }

        setIsSubmittingLog(true);
        try {
            const formData = new FormData();
            formData.append('logDate', dailyLogForm.logDate);
            formData.append('workDoneText', dailyLogForm.workDoneText);
            formData.append('progressPercentage', dailyLogForm.progressPercentage);
            formData.append('carpentersCount', dailyLogForm.carpentersCount);
            formData.append('hoursWorked', dailyLogForm.hoursWorked);
            formData.append('blockersOrIssues', dailyLogForm.blockersOrIssues);
            formData.append('markCompleted', dailyLogForm.markCompleted);

            selectedPhotoFiles.forEach(file => {
                formData.append('photos', file);
            });

            await axios.post(
                `${baseUrl}/carpenter-management/assignments/${targetAssignmentForLog.id}/daily-logs`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${user?.token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            toast.success(`Work logged successfully! Progress updated to ${dailyLogForm.progressPercentage}%`);
            setShowDailyLogModal(false);
            fetchData();

            // If timeline is open, refresh it
            if (timelineAssignment?.id === targetAssignmentForLog.id) {
                openTimelineModal(targetAssignmentForLog.id);
            }
        } catch (error) {
            console.error('Failed to log daily work:', error);
            toast.error(error.response?.data?.message || 'Failed to submit daily log');
        } finally {
            setIsSubmittingLog(false);
        }
    };

    // Open Timeline View
    const openTimelineModal = async (assignmentId) => {
        setLoadingTimeline(true);
        try {
            const res = await axios.get(`${baseUrl}/carpenter-management/assignments/${assignmentId}`, authHeaders);
            setTimelineAssignment(res.data.assignment);
            setTimelineLogs(Array.isArray(res.data.dailyLogs) ? res.data.dailyLogs : []);
        } catch (error) {
            console.error('Failed to load project timeline:', error);
            toast.error('Failed to load daily progress timeline');
        } finally {
            setLoadingTimeline(false);
        }
    };

    // Delete single log
    const handleDeleteLog = async (logId) => {
        if (!window.confirm('Delete this work log entry?')) return;
        try {
            await axios.delete(`${baseUrl}/carpenter-management/daily-logs/${logId}`, authHeaders);
            toast.success('Log entry removed');
            if (timelineAssignment) {
                openTimelineModal(timelineAssignment.id);
            }
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete log entry');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Top Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <Hammer size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Carpenter Management</h1>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Vendor Management
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Assign carpenters to project sites and note daily work progress until completion
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={fetchData}
                        title="Refresh"
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {canManage && (
                        <button
                            type="button"
                            onClick={() => handleOpenAssignModal()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus size={16} />
                            <span>Assign Carpenter to Site</span>
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Assigned Sites</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{stats.total}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Sites managed by Vendor Mgmt</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Active Work Ongoing</span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{stats.inProgress}</div>
                    <div className="text-[11px] text-amber-600/70 mt-1">Sites in progress right now</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Completed Projects</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{stats.completed}</div>
                    <div className="text-[11px] text-emerald-600/70 mt-1">Reached 100% completion</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Average Progress</span>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1 font-mono">{stats.avgProgress}%</div>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                        <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, stats.avgProgress))}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search site, client, carpenter name or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {STATUS_OPTIONS.map((st) => (
                            <button
                                key={st.value}
                                type="button"
                                onClick={() => setStatusFilter(st.value)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    statusFilter === st.value
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {st.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {assignments.map((item) => {
                    const progress = Number(item.progressPercentage) || 0;
                    const progressColor = progress >= 100 
                        ? 'bg-emerald-500' 
                        : progress >= 60 
                        ? 'bg-blue-600' 
                        : progress >= 30 
                        ? 'bg-amber-500' 
                        : 'bg-slate-400';

                    const isCompleted = item.status === 'COMPLETED' || progress >= 100;

                    return (
                        <div
                            key={item.id}
                            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                        >
                            {/* Card Header */}
                            <div className="p-5 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="font-black text-slate-800 text-base group-hover:text-amber-600 transition-colors flex items-center gap-1.5">
                                            <Building2 size={16} className="text-amber-500 flex-shrink-0" />
                                            <span>{item.siteName}</span>
                                        </h3>
                                        {item.clientName && (
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                Client: <span className="font-bold text-slate-700">{item.clientName}</span>
                                            </p>
                                        )}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        isCompleted
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : item.status === 'ON_HOLD'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>

                                {item.siteAddress && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                        <MapPin size={12} className="flex-shrink-0" />
                                        <span className="truncate">{item.siteAddress}</span>
                                    </div>
                                )}

                                {/* Carpenter Details */}
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                                            <HardHat size={16} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Carpenter</span>
                                            <span className="font-bold text-xs text-slate-800">{item.carpenterName}</span>
                                        </div>
                                    </div>

                                    {item.carpenterPhone && (
                                        <a
                                            href={`tel:${item.carpenterPhone}`}
                                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                            title="Call Carpenter"
                                        >
                                            <Phone size={13} />
                                        </a>
                                    )}
                                </div>

                                {item.scopeOfWork && (
                                    <div className="text-[11px] text-slate-600 line-clamp-2">
                                        <strong className="text-slate-700">Scope:</strong> {item.scopeOfWork}
                                    </div>
                                )}

                                {/* Progress Bar */}
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">Work Completed:</span>
                                        <span className="font-mono font-black text-slate-900">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Latest Daily Update Preview */}
                                <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                                    <span className="font-bold text-slate-400 uppercase text-[10px]">Latest Daily Work:</span>
                                    {item.latestWorkDone ? (
                                        <p className="text-slate-700 font-medium line-clamp-2 italic">
                                            "{item.latestWorkDone}"
                                        </p>
                                    ) : (
                                        <p className="text-slate-400 italic">No daily logs added yet. Click "+ Note Daily Work" below.</p>
                                    )}
                                    {item.latestLogDate && (
                                        <span className="text-[10px] text-slate-400 block">
                                            Updated: {new Date(item.latestLogDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenDailyLogModal(item)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                                >
                                    <Plus size={14} />
                                    <span>Note Daily Work</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => openTimelineModal(item.id)}
                                    className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors"
                                    title="View Day-by-Day Timeline"
                                >
                                    <History size={15} />
                                </button>

                                {canManage && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenAssignModal(item)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                            title="Edit Assignment"
                                        >
                                            <Edit3 size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteAssignment(item.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                            title="Delete Assignment"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}

                {assignments.length === 0 && !loading && (
                    <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                        <HardHat size={36} className="mx-auto mb-2 opacity-30 text-amber-600" />
                        <p className="font-bold text-slate-700">No Carpenter Site Assignments Found</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Click "+ Assign Carpenter to Site" to assign a project and start logging daily work progress.
                        </p>
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* MODAL 1: ASSIGN CARPENTER TO SITE                         */}
            {/* ========================================================= */}
            <AnimatePresence>
                {showAssignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden my-8"
                        >
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                                        <HardHat size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-base">
                                            {editingAssignment ? 'Edit Carpenter Assignment' : 'Assign Carpenter to Site'}
                                        </h3>
                                        <p className="text-xs text-slate-400">Vendor Management project assignment</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Site / Project Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={assignForm.siteName}
                                            onChange={(e) => setAssignForm({ ...assignForm, siteName: e.target.value })}
                                            placeholder="e.g. Prestige Lakeview Apt 402"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Client Name</label>
                                        <input
                                            type="text"
                                            value={assignForm.clientName}
                                            onChange={(e) => setAssignForm({ ...assignForm, clientName: e.target.value })}
                                            placeholder="e.g. Dr. Rajesh Sharma"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Site Address / Location</label>
                                    <input
                                        type="text"
                                        value={assignForm.siteAddress}
                                        onChange={(e) => setAssignForm({ ...assignForm, siteAddress: e.target.value })}
                                        placeholder="e.g. Whitefield Main Road, Bangalore"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Carpenter / Team Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={assignForm.carpenterName}
                                            onChange={(e) => setAssignForm({ ...assignForm, carpenterName: e.target.value })}
                                            placeholder="e.g. Mohan Carpenter / Team"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Carpenter Phone Number</label>
                                        <input
                                            type="text"
                                            value={assignForm.carpenterPhone}
                                            onChange={(e) => setAssignForm({ ...assignForm, carpenterPhone: e.target.value })}
                                            placeholder="e.g. 9876543210"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Start Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={assignForm.startDate}
                                            onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Target Completion Date</label>
                                        <input
                                            type="date"
                                            value={assignForm.targetDate}
                                            onChange={(e) => setAssignForm({ ...assignForm, targetDate: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Scope of Work</label>
                                    <input
                                        type="text"
                                        value={assignForm.scopeOfWork}
                                        onChange={(e) => setAssignForm({ ...assignForm, scopeOfWork: e.target.value })}
                                        placeholder="e.g. Modular Kitchen Carcase + 3 Bedroom Wardrobes"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-none"
                                    />
                                </div>

                                {!editingAssignment && (
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Day 1 Initial Work Done (Optional)</label>
                                        <textarea
                                            rows={2}
                                            value={assignForm.initialWorkDone}
                                            onChange={(e) => setAssignForm({ ...assignForm, initialWorkDone: e.target.value })}
                                            placeholder="e.g. Material unloaded at site and measurement cross-checked."
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white outline-none resize-none"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Status</label>
                                        <select
                                            value={assignForm.status}
                                            onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                                            <option value="ASSIGNED">ASSIGNED</option>
                                            <option value="ON_HOLD">ON_HOLD</option>
                                            <option value="COMPLETED">COMPLETED</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Remarks</label>
                                        <input
                                            type="text"
                                            value={assignForm.remarks}
                                            onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                                            placeholder="Optional notes..."
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingAssign}
                                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                                    >
                                        {isSubmittingAssign ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Assign Carpenter'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* MODAL 2: NOTE DAILY WORK PROGRESS (DAILY LOG)            */}
            {/* ========================================================= */}
            <AnimatePresence>
                {showDailyLogModal && targetAssignmentForLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden my-8"
                        >
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-slate-800 text-base">Note Daily Work Done</h3>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-600 text-white rounded-full">
                                            Daily Update
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {targetAssignmentForLog.siteName} • Carpenter: <strong>{targetAssignmentForLog.carpenterName}</strong>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDailyLogModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white/80 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleDailyLogSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Date of Work *</label>
                                    <input
                                        type="date"
                                        required
                                        value={dailyLogForm.logDate}
                                        onChange={(e) => setDailyLogForm({ ...dailyLogForm, logDate: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                        How much work was done today? *
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={dailyLogForm.workDoneText}
                                        onChange={(e) => setDailyLogForm({ ...dailyLogForm, workDoneText: e.target.value })}
                                        placeholder="e.g. Assembled 4 kitchen base units and leveled shutters. Drawer channels fixed in Master Bedroom."
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                    />
                                </div>

                                {/* Updated Progress Slider */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-700">Updated Overall Project Progress:</span>
                                        <span className="font-mono font-black text-amber-600 text-sm">
                                            {dailyLogForm.progressPercentage}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={dailyLogForm.progressPercentage}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            setDailyLogForm({
                                                ...dailyLogForm,
                                                progressPercentage: val,
                                                markCompleted: val >= 100
                                            });
                                        }}
                                        className="w-full accent-amber-600 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                        <span>0% Started</span>
                                        <span>50% Mid-way</span>
                                        <span>100% Completed</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Carpenters Working</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={dailyLogForm.carpentersCount}
                                            onChange={(e) => setDailyLogForm({ ...dailyLogForm, carpentersCount: e.target.value })}
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Hours Worked</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="1"
                                            value={dailyLogForm.hoursWorked}
                                            onChange={(e) => setDailyLogForm({ ...dailyLogForm, hoursWorked: e.target.value })}
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Blockers / Material Issues (Optional)</label>
                                    <input
                                        type="text"
                                        value={dailyLogForm.blockersOrIssues}
                                        onChange={(e) => setDailyLogForm({ ...dailyLogForm, blockersOrIssues: e.target.value })}
                                        placeholder="e.g. Edge banding tape ran out, raw ply delivery delayed"
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-none"
                                    />
                                </div>

                                {/* Work Photos Attachment */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                        Attach Photos of Today's Work (Optional)
                                    </label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-amber-200 hover:border-amber-400 bg-amber-50/20 rounded-xl p-4 text-center cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            capture="environment"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <Camera className="mx-auto text-amber-600 mb-1" size={22} />
                                        <p className="text-xs font-bold text-slate-700">Tap to upload photos of work done today</p>
                                    </div>

                                    {previewUrls.length > 0 && (
                                        <div className="flex items-center gap-2 mt-2 overflow-x-auto">
                                            {previewUrls.map((url, i) => (
                                                <div key={i} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                                                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            ))}
                                            <span className="text-xs font-bold text-amber-700 ml-1">
                                                {previewUrls.length} photo(s)
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Mark Project as Completed */}
                                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={dailyLogForm.markCompleted}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setDailyLogForm({
                                                ...dailyLogForm,
                                                markCompleted: checked,
                                                progressPercentage: checked ? 100 : dailyLogForm.progressPercentage
                                            });
                                        }}
                                        className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                                    />
                                    <span className="text-xs font-bold text-slate-700">
                                        Mark Project as Completed (Final Handover)
                                    </span>
                                </label>

                                <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowDailyLogModal(false)}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingLog}
                                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                                    >
                                        <Check size={14} />
                                        <span>{isSubmittingLog ? 'Saving...' : 'Save Daily Work Log'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* MODAL 3: PROJECT DAILY PROGRESS TIMELINE                  */}
            {/* ========================================================= */}
            <AnimatePresence>
                {timelineAssignment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden my-8"
                        >
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-slate-800 text-base">{timelineAssignment.siteName}</h3>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                            {timelineAssignment.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Carpenter: <strong>{timelineAssignment.carpenterName}</strong> • Progress: <strong>{timelineAssignment.progressPercentage}%</strong>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenDailyLogModal(timelineAssignment)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                                    >
                                        <Plus size={13} />
                                        <span>Add Log</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTimelineAssignment(null)}
                                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                                {/* Scope Summary Banner */}
                                {timelineAssignment.scopeOfWork && (
                                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 font-medium">
                                        <strong>Total Project Scope:</strong> {timelineAssignment.scopeOfWork}
                                    </div>
                                )}

                                {/* Progress Bar Header */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">Completion Status:</span>
                                        <span className="font-black text-slate-900 font-mono text-sm">
                                            {timelineAssignment.progressPercentage}% Complete
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                                        <div
                                            className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${timelineAssignment.progressPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Timeline Step by Step */}
                                <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
                                    {timelineLogs.map((log, index) => {
                                        const photos = Array.isArray(log.photoUrls) ? log.photoUrls : [];

                                        return (
                                            <div key={log.id} className="relative pl-9 space-y-2">
                                                {/* Bullet marker */}
                                                <div className="absolute left-2.5 top-1 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-white" />

                                                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                                                Day {index + 1}
                                                            </span>
                                                            <span className="text-xs font-bold text-slate-800">
                                                                {log.logDate ? new Date(log.logDate).toLocaleDateString('en-IN', {
                                                                    weekday: 'short',
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                }) : '—'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                                                                {log.progressPercentage}% Done
                                                            </span>
                                                            {canManage && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteLog(log.id)}
                                                                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                                                                    title="Delete this log"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                                        {log.workDoneText}
                                                    </p>

                                                    {log.blockersOrIssues && (
                                                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700">
                                                            <strong>Issues:</strong> {log.blockersOrIssues}
                                                        </div>
                                                    )}

                                                    {photos.length > 0 && (
                                                        <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                                                            {photos.map((photoUrl, pIdx) => (
                                                                <div
                                                                    key={pIdx}
                                                                    onClick={() => setLightboxPhotoUrl(photoUrl)}
                                                                    className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
                                                                >
                                                                    <img src={getPhotoUrl(photoUrl)} alt="Work progress" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                                        <span>Logged by: {log.loggedByName || 'Vendor Mgmt'}</span>
                                                        <span>{log.carpentersCount} carpenter(s) • {log.hoursWorked} hrs</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {timelineLogs.length === 0 && (
                                        <div className="py-12 text-center text-slate-400">
                                            <p className="font-bold">No daily logs recorded yet</p>
                                            <p className="text-xs mt-1">Click "Add Log" above to enter today's work progress</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* MODAL 4: PHOTO ZOOM LIGHTBOX                              */}
            {/* ========================================================= */}
            <AnimatePresence>
                {lightboxPhotoUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <button
                                onClick={() => setLightboxPhotoUrl(null)}
                                className="absolute top-4 right-4 z-10 p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="max-h-[80vh] flex items-center justify-center p-2">
                                <img
                                    src={getPhotoUrl(lightboxPhotoUrl)}
                                    alt="Work photo high-res"
                                    className="max-h-[75vh] w-auto object-contain rounded-2xl"
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CarpenterManagement;
