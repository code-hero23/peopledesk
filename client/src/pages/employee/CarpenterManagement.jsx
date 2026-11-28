import { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    Hammer,
    Plus,
    Search,
    Calendar,
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
    TrendingUp,
    MapPin,
    FileText,
    Eye,
    ChevronRight,
    Clock,
    AlertTriangle,
    Image as ImageIcon
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

    // Modal: Assign / Edit Carpenter to Site
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
    const [assignForm, setAssignForm] = useState({
        clientProjectName: '',
        siteAddress: '',
        carpenterName: '',
        carpenterPhone: '',
        startDate: new Date().toISOString().split('T')[0],
        targetDate: '',
        scopeOfWork: '',
        initialProgress: 0,
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

    // Modal: View Details & Day-by-Day Timeline
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [activeAssignmentDetails, setActiveAssignmentDetails] = useState(null);
    const [detailsLogs, setDetailsLogs] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Lightbox / Zoom Photo Preview
    const [activeLightboxImg, setActiveLightboxImg] = useState(null);

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
            toast.error(error.response?.data?.message || 'Failed to load carpenter projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.token) {
            fetchData();
        }
    }, [user?.token, statusFilter]);

    // Debounced search
    useEffect(() => {
        const handler = setTimeout(() => {
            if (user?.token) fetchData();
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // ==========================================
    // ASSIGNMENT MODAL HANDLERS
    // ==========================================
    const handleOpenAssignModal = (assignment = null) => {
        if (assignment) {
            setEditingAssignment(assignment);
            const name = assignment.siteName || assignment.clientName || '';
            setAssignForm({
                clientProjectName: name,
                siteAddress: assignment.siteAddress || '',
                carpenterName: assignment.carpenterName || '',
                carpenterPhone: assignment.carpenterPhone || '',
                startDate: assignment.startDate ? assignment.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
                targetDate: assignment.targetDate ? assignment.targetDate.split('T')[0] : '',
                scopeOfWork: assignment.scopeOfWork || '',
                initialProgress: assignment.progressPercentage || 0,
                status: assignment.status || 'IN_PROGRESS',
                remarks: assignment.remarks || ''
            });
        } else {
            setEditingAssignment(null);
            setAssignForm({
                clientProjectName: '',
                siteAddress: '',
                carpenterName: '',
                carpenterPhone: '',
                startDate: new Date().toISOString().split('T')[0],
                targetDate: '',
                scopeOfWork: '',
                initialProgress: 0,
                status: 'IN_PROGRESS',
                remarks: ''
            });
        }
        setShowAssignModal(true);
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = assignForm.clientProjectName.trim();
        if (!trimmedName || !assignForm.carpenterName.trim()) {
            toast.error('Client / Project Name and Carpenter Name are required');
            return;
        }

        setIsSubmittingAssign(true);
        try {
            const payload = {
                siteName: trimmedName,
                clientName: trimmedName, // Client Name and Project Name are identical
                siteAddress: assignForm.siteAddress,
                carpenterName: assignForm.carpenterName.trim(),
                carpenterPhone: assignForm.carpenterPhone.trim(),
                startDate: assignForm.startDate,
                targetDate: assignForm.targetDate || null,
                scopeOfWork: assignForm.scopeOfWork,
                initialProgress: assignForm.initialProgress,
                status: assignForm.status,
                remarks: assignForm.remarks
            };

            if (editingAssignment) {
                await axios.put(`${baseUrl}/carpenter-management/assignments/${editingAssignment.id}`, payload, authHeaders);
                toast.success('Carpenter assignment updated successfully');
            } else {
                await axios.post(`${baseUrl}/carpenter-management/assignments`, payload, authHeaders);
                toast.success('Carpenter assigned to site successfully');
            }

            setShowAssignModal(false);
            fetchData();
        } catch (error) {
            console.error('Assignment submit error:', error);
            toast.error(error.response?.data?.message || 'Failed to save carpenter assignment');
        } finally {
            setIsSubmittingAssign(false);
        }
    };

    const handleDeleteAssignment = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete assignment "${name}"? All daily work logs and progress records will be permanently removed.`)) {
            return;
        }
        try {
            await axios.delete(`${baseUrl}/carpenter-management/assignments/${id}`, authHeaders);
            toast.success('Assignment deleted successfully');
            fetchData();
            if (activeAssignmentDetails?.id === id) {
                setShowDetailsModal(false);
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete assignment');
        }
    };

    // ==========================================
    // DAILY WORK LOG MODAL HANDLERS
    // ==========================================
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

    // Add more images (append to existing selection)
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Append new files up to 20 total
        const updatedFiles = [...selectedPhotoFiles, ...files].slice(0, 20);
        setSelectedPhotoFiles(updatedFiles);

        // Generate preview URLs
        const updatedUrls = updatedFiles.map(f => URL.createObjectURL(f));
        setPreviewUrls(updatedUrls);

        if (e.target) e.target.value = ''; // Reset file input so same or more can be selected
    };

    const handleRemoveSelectedPhoto = (index) => {
        const updatedFiles = selectedPhotoFiles.filter((_, i) => i !== index);
        const updatedUrls = previewUrls.filter((_, i) => i !== index);
        setSelectedPhotoFiles(updatedFiles);
        setPreviewUrls(updatedUrls);
    };

    const handleDailyLogSubmit = async (e) => {
        e.preventDefault();
        if (!dailyLogForm.workDoneText.trim()) {
            toast.error('Please describe how much work was completed today');
            return;
        }

        setIsSubmittingLog(true);
        try {
            const formData = new FormData();
            formData.append('logDate', dailyLogForm.logDate);
            formData.append('workDoneText', dailyLogForm.workDoneText.trim());
            formData.append('progressPercentage', dailyLogForm.progressPercentage);
            formData.append('carpentersCount', dailyLogForm.carpentersCount);
            formData.append('hoursWorked', dailyLogForm.hoursWorked);
            formData.append('blockersOrIssues', dailyLogForm.blockersOrIssues);
            formData.append('markCompleted', dailyLogForm.markCompleted);

            selectedPhotoFiles.forEach((file) => {
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

            toast.success(`Today's work logged! Project progress updated to ${dailyLogForm.progressPercentage}%`);
            setShowDailyLogModal(false);
            fetchData();

            // Refresh details modal if open
            if (activeAssignmentDetails?.id === targetAssignmentForLog.id) {
                openDetailsModal(targetAssignmentForLog.id);
            }
        } catch (error) {
            console.error('Daily log submit error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit daily work log');
        } finally {
            setIsSubmittingLog(false);
        }
    };

    // ==========================================
    // VIEW DETAILS & TIMELINE MODAL
    // ==========================================
    const openDetailsModal = async (assignmentId) => {
        setLoadingDetails(true);
        setShowDetailsModal(true);
        try {
            const res = await axios.get(`${baseUrl}/carpenter-management/assignments/${assignmentId}`, authHeaders);
            setActiveAssignmentDetails(res.data.assignment);
            setDetailsLogs(res.data.dailyLogs || []);
        } catch (error) {
            console.error('Details fetch error:', error);
            toast.error(error.response?.data?.message || 'Failed to load details');
            setShowDetailsModal(false);
        } finally {
            setLoadingDetails(false);
        }
    };

    // Helper: Progress color
    const getProgressColor = (progress) => {
        if (progress >= 100) return 'bg-emerald-500';
        if (progress >= 75) return 'bg-teal-500';
        if (progress >= 50) return 'bg-blue-500';
        if (progress >= 25) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    // Helper: Status badge
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'COMPLETED':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">Completed</span>;
            case 'IN_PROGRESS':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">In Progress</span>;
            case 'ASSIGNED':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">Assigned</span>;
            case 'ON_HOLD':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">On Hold</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <Hammer size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Carpenter Management</h1>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Vendor Management
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Assign carpenters to project sites and note daily work done until project completion
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

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Sites</span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{stats.total}</div>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">In Progress</span>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{stats.inProgress}</div>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Completed (100%)</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{stats.completed}</div>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Average Progress</span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 flex items-baseline gap-1">
                        <span>{stats.avgProgress}%</span>
                        <TrendingUp size={18} className="text-amber-500" />
                    </div>
                </div>
            </div>

            {/* Search & Status Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search Client / Project, Carpenter, Address..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>

                {/* Status Tabs Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    {STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatusFilter(opt.value)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                statusFilter === opt.value
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ========================================================= */}
            {/* TABLE VIEW (REQUESTED FORMAT)                            */}
            {/* ========================================================= */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black select-none">
                            <tr>
                                <th className="py-3.5 px-4 w-12 text-center">#</th>
                                <th className="py-3.5 px-4 min-w-[220px]">Client / Project Name</th>
                                <th className="py-3.5 px-4 min-w-[180px]">Assigned Carpenter</th>
                                <th className="py-3.5 px-4 min-w-[140px]">Dates</th>
                                <th className="py-3.5 px-4 min-w-[170px]">Work Progress</th>
                                <th className="py-3.5 px-4 min-w-[240px]">Latest Work Done</th>
                                <th className="py-3.5 px-4 w-28">Status</th>
                                <th className="py-3.5 px-4 min-w-[200px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {assignments.map((item, index) => {
                                const projectName = item.siteName || item.clientName || 'Untitled Project';
                                const progress = item.progressPercentage || 0;
                                const progressColor = getProgressColor(progress);

                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                                        {/* S.No */}
                                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-bold">
                                            {index + 1}
                                        </td>

                                        {/* Client / Project Name & Address */}
                                        <td className="py-3.5 px-4">
                                            <div className="font-black text-slate-900 text-xs tracking-tight">
                                                {projectName}
                                            </div>
                                            {item.siteAddress && (
                                                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                                                    <MapPin size={11} className="flex-shrink-0 text-slate-400" />
                                                    <span className="truncate">{item.siteAddress}</span>
                                                </div>
                                            )}
                                            {item.scopeOfWork && (
                                                <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1 max-w-xs">
                                                    Scope: {item.scopeOfWork}
                                                </div>
                                            )}
                                        </td>

                                        {/* Assigned Carpenter & Phone */}
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold flex-shrink-0">
                                                    <HardHat size={14} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-xs">{item.carpenterName}</div>
                                                    {item.carpenterPhone ? (
                                                        <a
                                                            href={`tel:${item.carpenterPhone}`}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 mt-0.5"
                                                            title="Call Carpenter"
                                                        >
                                                            <Phone size={10} />
                                                            <span>{item.carpenterPhone}</span>
                                                        </a>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">No phone added</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Dates */}
                                        <td className="py-3.5 px-4 text-[11px]">
                                            <div className="text-slate-700 font-medium">
                                                <span className="text-slate-400 text-[10px] font-bold uppercase block">Start:</span>
                                                {item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </div>
                                            {item.targetDate && (
                                                <div className="text-slate-500 mt-1">
                                                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Target:</span>
                                                    {new Date(item.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            )}
                                        </td>

                                        {/* Work Progress Bar */}
                                        <td className="py-3.5 px-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-mono font-black text-slate-800">{progress}%</span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {progress >= 100 ? 'Completed' : 'Overall'}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Latest Work Done */}
                                        <td className="py-3.5 px-4">
                                            {item.latestWorkDone ? (
                                                <div className="space-y-0.5">
                                                    <p className="text-slate-700 text-xs font-medium line-clamp-2 italic">
                                                        "{item.latestWorkDone}"
                                                    </p>
                                                    {item.latestLogDate && (
                                                        <span className="text-[10px] text-slate-400 block font-semibold">
                                                            Logged: {new Date(item.latestLogDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-[11px]">No logs added yet</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3.5 px-4">
                                            {renderStatusBadge(item.status)}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* View Details Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => openDetailsModal(item.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                                    title="View Details & Day-by-Day Timeline"
                                                >
                                                    <Eye size={13} className="text-slate-500" />
                                                    <span>View Details</span>
                                                </button>

                                                {/* Note Daily Work Done */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenDailyLogModal(item)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                    title="Note Daily Work Done"
                                                >
                                                    <Plus size={13} />
                                                    <span>Log Work</span>
                                                </button>

                                                {/* Edit / Delete for Managers */}
                                                {canManage && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenAssignModal(item)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit Project"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAssignment(item.id, projectName)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Delete Project"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {assignments.length === 0 && !loading && (
                        <div className="py-16 text-center text-slate-400 bg-white">
                            <HardHat size={36} className="mx-auto mb-2 opacity-30 text-amber-600" />
                            <p className="font-bold text-slate-700">No Carpenter Site Assignments Found</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Click "+ Assign Carpenter to Site" to assign a project and log daily work progress.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================= */}
            {/* MODAL 1: ASSIGN CARPENTER TO SITE (UNIFIED NAME)          */}
            {/* ========================================================= */}
            <AnimatePresence>
                {showAssignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden my-8"
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
                                {/* Unified Client / Project Name */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                        Client / Project Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={assignForm.clientProjectName}
                                        onChange={(e) => setAssignForm({ ...assignForm, clientProjectName: e.target.value })}
                                        placeholder="e.g. Mr. Rajesh Sharma - Villa 402 / Prestige Lakeview"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                    <span className="text-[10px] text-slate-400 mt-0.5 block">Client name and project name are saved identically</span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Site Address / Location</label>
                                    <input
                                        type="text"
                                        value={assignForm.siteAddress}
                                        onChange={(e) => setAssignForm({ ...assignForm, siteAddress: e.target.value })}
                                        placeholder="e.g. Flat 402, Tower B, Whitefield Main Road, Bangalore"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Carpenter Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={assignForm.carpenterName}
                                            onChange={(e) => setAssignForm({ ...assignForm, carpenterName: e.target.value })}
                                            placeholder="e.g. Ramesh Kumar"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Carpenter Phone Number</label>
                                        <input
                                            type="tel"
                                            value={assignForm.carpenterPhone}
                                            onChange={(e) => setAssignForm({ ...assignForm, carpenterPhone: e.target.value })}
                                            placeholder="e.g. 9876543210"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Work Start Date *</label>
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
                                    <textarea
                                        rows={2}
                                        value={assignForm.scopeOfWork}
                                        onChange={(e) => setAssignForm({ ...assignForm, scopeOfWork: e.target.value })}
                                        placeholder="e.g. Full modular kitchen carcass installation, wardrobe framework in Master & Kids bedroom"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Status</label>
                                        <select
                                            value={assignForm.status}
                                            onChange={(e) => setAssignForm({ ...assignForm, status: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="ASSIGNED">Assigned</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="ON_HOLD">On Hold</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Initial Progress (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={assignForm.initialProgress}
                                            onChange={(e) => setAssignForm({ ...assignForm, initialProgress: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Remarks / Special Instructions</label>
                                    <input
                                        type="text"
                                        value={assignForm.remarks}
                                        onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
                                        placeholder="e.g. Tools delivered, client keys handed over"
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white outline-none"
                                    />
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
            {/* MODAL 2: NOTE DAILY WORK PROGRESS (MULTI-IMAGE UPLOAD)    */}
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
                                        {targetAssignmentForLog.siteName || targetAssignmentForLog.clientName} • Carpenter: <strong>{targetAssignmentForLog.carpenterName}</strong>
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
                                        placeholder="e.g. Assembled 4 kitchen carcass units, leveled shutters. Cut and fixed ply framework for master wardrobe."
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                                    />
                                </div>

                                {/* Updated Overall Progress Slider */}
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
                                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                        <span>0% Start</span>
                                        <span>25%</span>
                                        <span>50% Mid</span>
                                        <span>75%</span>
                                        <span>100% Complete</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">Carpenters Present</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={dailyLogForm.carpentersCount}
                                            onChange={(e) => setDailyLogForm({ ...dailyLogForm, carpentersCount: parseInt(e.target.value, 10) || 1 })}
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
                                        placeholder="e.g. Edge banding tape ran out, waiting for laminate delivery"
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white outline-none"
                                    />
                                </div>

                                {/* Work Photos Attachment (Add More Images Support) */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[11px] font-black uppercase text-slate-500">
                                            Attach Work Photos
                                        </label>
                                        <span className="text-[10px] font-bold text-amber-600">
                                            {selectedPhotoFiles.length > 0 ? `${selectedPhotoFiles.length} photo(s) selected` : 'Max 20 photos'}
                                        </span>
                                    </div>

                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/30 hover:bg-amber-50/60 rounded-2xl p-4 text-center cursor-pointer transition-all"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <Camera className="mx-auto text-amber-600 mb-1.5" size={24} />
                                        <p className="text-xs font-bold text-slate-800">
                                            {selectedPhotoFiles.length > 0 ? '+ Tap to Add More Photos' : 'Tap to upload photos of work done today'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Select multiple images from camera or gallery</p>
                                    </div>

                                    {/* Preview Thumbnails with Remove Button */}
                                    {previewUrls.length > 0 && (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
                                            {previewUrls.map((url, i) => (
                                                <div key={i} className="relative group w-full aspect-square rounded-lg overflow-hidden border border-slate-300 bg-black">
                                                    <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveSelectedPhoto(i);
                                                        }}
                                                        className="absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md transition-all"
                                                        title="Remove photo"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
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
                                        className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                    />
                                    <span className="text-xs font-bold text-slate-700">
                                        Mark Project 100% Completed Today
                                    </span>
                                </label>

                                <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowDailyLogModal(false)}
                                        className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingLog}
                                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                                    >
                                        {isSubmittingLog ? 'Saving Progress...' : "Save Today's Work"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* MODAL 3: VIEW DETAILS & DAY-BY-DAY TIMELINE               */}
            {/* ========================================================= */}
            <AnimatePresence>
                {showDetailsModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden my-8 max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 text-white flex-shrink-0">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black text-lg">
                                            {activeAssignmentDetails?.siteName || activeAssignmentDetails?.clientName || 'Project Details'}
                                        </h3>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/20 border border-white/30 text-white">
                                            {activeAssignmentDetails?.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-100 font-medium mt-0.5">
                                        Carpenter: <strong>{activeAssignmentDetails?.carpenterName}</strong>
                                        {activeAssignmentDetails?.carpenterPhone && ` • ${activeAssignmentDetails.carpenterPhone}`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                {loadingDetails ? (
                                    <div className="py-16 text-center text-slate-400">
                                        <RefreshCw size={28} className="animate-spin mx-auto mb-2 text-amber-600" />
                                        <p className="text-xs font-bold">Loading project details & daily logs...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Project Summary Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Overall Progress</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xl font-black text-slate-800">
                                                        {activeAssignmentDetails?.progressPercentage || 0}%
                                                    </span>
                                                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${getProgressColor(activeAssignmentDetails?.progressPercentage || 0)}`}
                                                            style={{ width: `${activeAssignmentDetails?.progressPercentage || 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Start Date</span>
                                                <span className="text-xs font-bold text-slate-800 mt-1 block">
                                                    {activeAssignmentDetails?.startDate ? new Date(activeAssignmentDetails.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Completion</span>
                                                <span className="text-xs font-bold text-slate-800 mt-1 block">
                                                    {activeAssignmentDetails?.targetDate ? new Date(activeAssignmentDetails.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Open-ended'}
                                                </span>
                                            </div>

                                            {activeAssignmentDetails?.siteAddress && (
                                                <div className="sm:col-span-3 pt-2 border-t border-slate-200/60 text-xs text-slate-600 flex items-center gap-1.5">
                                                    <MapPin size={13} className="text-amber-600 flex-shrink-0" />
                                                    <span>{activeAssignmentDetails.siteAddress}</span>
                                                </div>
                                            )}

                                            {activeAssignmentDetails?.scopeOfWork && (
                                                <div className="sm:col-span-3 text-xs text-slate-600">
                                                    <strong className="text-slate-700">Scope of Work:</strong> {activeAssignmentDetails.scopeOfWork}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Bar inside Details */}
                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black text-slate-800">Day-by-Day Work Progress</h4>
                                                <span className="text-[11px] font-bold text-slate-400">
                                                    ({detailsLogs.length} updates logged)
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowDetailsModal(false);
                                                    handleOpenDailyLogModal(activeAssignmentDetails);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                                            >
                                                <Plus size={14} />
                                                <span>Note Today's Work</span>
                                            </button>
                                        </div>

                                        {/* Day-by-Day Timeline List */}
                                        <div className="space-y-4">
                                            {detailsLogs.map((log, index) => {
                                                const photos = Array.isArray(log.photoUrls) ? log.photoUrls : [];

                                                return (
                                                    <div
                                                        key={log.id}
                                                        className="relative pl-6 pb-4 border-l-2 border-amber-200 last:border-transparent last:pb-0"
                                                    >
                                                        {/* Timeline Dot */}
                                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm" />

                                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-xs text-slate-900">
                                                                        {new Date(log.logDate).toLocaleDateString('en-IN', {
                                                                            weekday: 'short',
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </span>
                                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono">
                                                                        Progress: {log.progressPercentage}%
                                                                    </span>
                                                                </div>

                                                                <div className="text-[11px] text-slate-400 font-medium">
                                                                    {log.carpentersCount} carpenter(s) • {log.hoursWorked} hrs worked
                                                                </div>
                                                            </div>

                                                            {/* Work Completed Description */}
                                                            <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-xl border border-slate-100">
                                                                {log.workDoneText}
                                                            </p>

                                                            {/* Blockers */}
                                                            {log.blockersOrIssues && (
                                                                <div className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                                                                    <AlertTriangle size={13} className="flex-shrink-0" />
                                                                    <span><strong>Issue/Blocker:</strong> {log.blockersOrIssues}</span>
                                                                </div>
                                                            )}

                                                            {/* Attached Photos Gallery */}
                                                            {photos.length > 0 && (
                                                                <div className="pt-2">
                                                                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                                                                        Site Photos ({photos.length}):
                                                                    </span>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {photos.map((url, pIdx) => (
                                                                            <div
                                                                                key={pIdx}
                                                                                onClick={() => setActiveLightboxImg(url)}
                                                                                className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                                                                            >
                                                                                <img src={url} alt="Work site photo" className="w-full h-full object-cover" />
                                                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                                                    <ZoomIn size={14} />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {detailsLogs.length === 0 && (
                                                <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                    <Clock size={28} className="mx-auto mb-2 text-slate-300" />
                                                    <p className="text-xs font-bold text-slate-600">No daily logs recorded yet</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Note Today's Work" to add Day 1 progress</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
                                >
                                    Close Details
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Lightbox Modal for Photo Zoom */}
            <AnimatePresence>
                {activeLightboxImg && (
                    <div
                        onClick={() => setActiveLightboxImg(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
                    >
                        <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
                            <img src={activeLightboxImg} alt="Enlarged site work" className="w-full h-full object-contain" />
                            <button
                                type="button"
                                onClick={() => setActiveLightboxImg(null)}
                                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CarpenterManagement;
