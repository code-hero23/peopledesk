import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
    MapPin,
    Calendar,
    Clock,
    UserCheck,
    Search,
    Filter,
    Plus,
    Upload,
    Download,
    RefreshCw,
    Trash2,
    Edit3,
    CheckCircle2,
    AlertCircle,
    FileSpreadsheet,
    X,
    ChevronLeft,
    ChevronRight,
    Building,
    User,
    Clipboard,
    HardHat,
    Layers,
    FileText,
    ArrowUpDown,
    Check,
    HelpCircle
} from 'lucide-react';
import Modal from '../../components/Modal';

const WORK_TYPES = [
    'Site Inspection',
    'Measurement',
    'Installation',
    'Rectification',
    'Client Meeting',
    'Vendor Coordination',
    'Handover',
    'Other'
];

const STATUS_CONFIG = {
    SCHEDULED: {
        label: 'Scheduled',
        bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        dot: 'bg-blue-500'
    },
    IN_PROGRESS: {
        label: 'In Progress',
        bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        dot: 'bg-amber-500'
    },
    COMPLETED: {
        label: 'Completed',
        bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        dot: 'bg-emerald-500'
    },
    CANCELLED: {
        label: 'Cancelled',
        bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        dot: 'bg-rose-500'
    }
};

const SiteAssignments = () => {
    const { user } = useSelector((state) => state.auth);
    const [assignments, setAssignments] = useState([]);
    const [aeList, setAeList] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Summary KPIs
    const [summary, setSummary] = useState({
        total: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        today: 0
    });

    // Pagination & Filters State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAeFilter, setSelectedAeFilter] = useState('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
    const [selectedDateFilter, setSelectedDateFilter] = useState('');
    const [selectedWorkTypeFilter, setSelectedWorkTypeFilter] = useState('ALL');

    // Create / Edit Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        siteName: '',
        clientName: '',
        location: '',
        aeId: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '10:00 AM',
        workType: 'Site Inspection',
        remarks: '',
        status: 'SCHEDULED'
    });

    // Import Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Delete confirmation state
    const [deleteModalConfig, setDeleteModalConfig] = useState({
        isOpen: false,
        id: null,
        siteName: ''
    });

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const authHeaders = useMemo(() => ({
        headers: { Authorization: `Bearer ${user?.token}` }
    }), [user?.token]);

    // Fetch AE list & Projects
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                const [aeRes, projRes] = await Promise.all([
                    axios.get(`${baseUrl}/site-assignments/ae-list`, authHeaders),
                    axios.get(`${baseUrl}/projects`, authHeaders).catch(() => ({ data: [] }))
                ]);
                setAeList(aeRes.data || []);
                setProjects(projRes.data || []);
            } catch (err) {
                console.error('Failed to load AE dropdown:', err);
            }
        };

        if (user?.token) {
            fetchDropdownData();
        }
    }, [baseUrl, authHeaders, user?.token]);

    // Fetch Assignments list
    const fetchAssignments = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                sortBy: 'scheduledDate',
                sortOrder: 'desc'
            });

            if (searchTerm.trim()) params.append('search', searchTerm.trim());
            if (selectedAeFilter !== 'ALL') params.append('aeId', selectedAeFilter);
            if (selectedStatusFilter !== 'ALL') params.append('status', selectedStatusFilter);
            if (selectedWorkTypeFilter !== 'ALL') params.append('workType', selectedWorkTypeFilter);
            if (selectedDateFilter) params.append('date', selectedDateFilter);

            const res = await axios.get(`${baseUrl}/site-assignments?${params.toString()}`, authHeaders);
            setAssignments(res.data.data || []);
            setTotalPages(res.data.pagination?.totalPages || 1);
            setTotalRecords(res.data.pagination?.total || 0);
            if (res.data.summary) {
                setSummary(res.data.summary);
            }
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch site assignments');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [page, limit, selectedAeFilter, selectedStatusFilter, selectedDateFilter, selectedWorkTypeFilter]);

    // Handle Search with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchAssignments();
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Handle Form Submit (Create / Edit)
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.siteName || !formData.aeId || !formData.scheduledDate || !formData.scheduledTime) {
            return toast.error('Please fill all required fields (Site Name, AE, Date, Time)');
        }

        setIsSubmitting(true);
        try {
            if (editingItem) {
                await axios.put(`${baseUrl}/site-assignments/${editingItem.id}`, formData, authHeaders);
                toast.success('Site assignment updated successfully');
            } else {
                await axios.post(`${baseUrl}/site-assignments`, formData, authHeaders);
                toast.success('Site successfully assigned to AE!');
            }
            resetForm();
            fetchAssignments();
        } catch (error) {
            console.error('Error saving site assignment:', error);
            toast.error(error.response?.data?.message || 'Failed to save site assignment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            siteName: '',
            clientName: '',
            location: '',
            aeId: '',
            scheduledDate: new Date().toISOString().split('T')[0],
            scheduledTime: '10:00 AM',
            workType: 'Site Inspection',
            remarks: '',
            status: 'SCHEDULED'
        });
        setEditingItem(null);
        setIsFormOpen(false);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            siteName: item.siteName || '',
            clientName: item.clientName || '',
            location: item.location || '',
            aeId: item.aeId || '',
            scheduledDate: item.scheduledDate ? new Date(item.scheduledDate).toISOString().split('T')[0] : '',
            scheduledTime: item.scheduledTime || '10:00 AM',
            workType: item.workType || 'Site Inspection',
            remarks: item.remarks || '',
            status: item.status || 'SCHEDULED'
        });
        setIsFormOpen(true);
    };

    // Quick Status Update
    const handleStatusChange = async (id, newStatus) => {
        try {
            await axios.put(`${baseUrl}/site-assignments/${id}`, { status: newStatus }, authHeaders);
            toast.success(`Status updated to ${newStatus}`);
            setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
            fetchAssignments();
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error(error.response?.data?.message || 'Failed to update status');
        }
    };

    // Delete Assignment
    const handleDeleteConfirm = async () => {
        if (!deleteModalConfig.id) return;
        try {
            await axios.delete(`${baseUrl}/site-assignments/${deleteModalConfig.id}`, authHeaders);
            toast.success('Site assignment deleted successfully');
            setDeleteModalConfig({ isOpen: false, id: null, siteName: '' });
            fetchAssignments();
        } catch (error) {
            console.error('Failed to delete assignment:', error);
            toast.error(error.response?.data?.message || 'Failed to delete assignment');
        }
    };

    // Export to Excel / CSV
    const handleExport = (format = 'xlsx') => {
        try {
            const params = new URLSearchParams({
                format,
                search: searchTerm,
                aeId: selectedAeFilter,
                status: selectedStatusFilter
            });
            if (selectedDateFilter) params.append('startDate', selectedDateFilter);

            window.open(`${baseUrl}/site-assignments/export?${params.toString()}&token=${user?.token}`, '_blank');
            toast.info(`Generating ${format.toUpperCase()} export...`);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export assignments');
        }
    };

    // Download Sample Template
    const handleDownloadTemplate = () => {
        const sampleData = [
            {
                'Site Name': 'Villa 402 - Green Valley',
                'Client Name': 'Rajesh Kumar',
                'Location': 'OMR, Chennai',
                'AE Email': aeList[0]?.email || 'ae.engineer@cookscape.com',
                'Scheduled Date': '2026-08-30',
                'Scheduled Time': '10:30 AM',
                'Work Type': 'Measurement',
                'Remarks': 'Take living room & kitchen measurements',
                'Status': 'SCHEDULED'
            },
            {
                'Site Name': 'Plot 18 - Orchid Heights',
                'Client Name': 'Ananya Sen',
                'Location': 'Anna Nagar, Chennai',
                'AE Email': aeList[1]?.email || 'ae2@cookscape.com',
                'Scheduled Date': '2026-08-31',
                'Scheduled Time': '02:30 PM',
                'Work Type': 'Installation',
                'Remarks': 'Verify carcass and modular shutter alignment',
                'Status': 'SCHEDULED'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData);
        ws['!cols'] = [
            { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 28 },
            { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 35 }, { wch: 14 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'site_assignments_template.xlsx');
        toast.success('Sample template downloaded');
    };

    // Handle File Selection for Bulk Import
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportFile(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
                setImportPreview(data.slice(0, 10)); // preview first 10
            } catch (err) {
                console.error('Error reading spreadsheet:', err);
                toast.error('Failed to parse selected file');
            }
        };
        reader.readAsBinaryString(file);
    };

    // Upload & Import Bulk File
    const handleBulkImport = async () => {
        if (!importFile) return toast.error('Please select an Excel or CSV file');

        setImportLoading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', importFile);

            const res = await axios.post(`${baseUrl}/site-assignments/import`, formDataUpload, {
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success(`Imported ${res.data.importedCount} site assignments successfully!`);
            if (res.data.errorCount > 0) {
                toast.warn(`${res.data.errorCount} rows had errors and were skipped.`);
            }

            setIsImportModalOpen(false);
            setImportFile(null);
            setImportPreview([]);
            fetchAssignments();
        } catch (error) {
            console.error('Import failed:', error);
            toast.error(error.response?.data?.message || 'Failed to import site assignments');
        } finally {
            setImportLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen text-slate-100">
            {/* 1. Header Banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-[#0d1527] to-slate-950 p-8 md:p-10 border border-white/10 shadow-2xl shadow-blue-950/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-3">
                            <MapPin size={13} className="text-blue-400" />
                            Field Operations & Logistics
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                            Assign Sites
                            <span className="text-xs bg-white/10 text-slate-300 font-bold px-3 py-1 rounded-full border border-white/10">
                                AE Management
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium">
                            Allocate customer project sites to Application Engineers, schedule on-site visit slots, track execution stages, and bulk manage assignments.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-200 hover:text-white transition-all shadow-md active:scale-95"
                        >
                            <Upload size={16} className="text-blue-400" />
                            Upload XLS / CSV
                        </button>

                        <button
                            onClick={() => handleExport('xlsx')}
                            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-all shadow-md active:scale-95"
                        >
                            <Download size={16} className="text-emerald-400" />
                            Export Excel
                        </button>

                        <button
                            onClick={() => {
                                resetForm();
                                setIsFormOpen(true);
                            }}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-primary/25 active:scale-95"
                        >
                            <Plus size={18} />
                            Assign New Site
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-[#0e131f] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-lg group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Allocations</span>
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                            <Layers size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-white">{summary.total || 0}</p>
                    <span className="text-xs text-slate-500 font-bold mt-1 block">All registered site tasks</span>
                </div>

                <div className="bg-[#0e131f] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-lg group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scheduled Today</span>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Calendar size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-emerald-400">{summary.today || 0}</p>
                    <span className="text-xs text-slate-500 font-bold mt-1 block">Visits planned for today</span>
                </div>

                <div className="bg-[#0e131f] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-lg group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Progress</span>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                            <Clock size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-amber-400">{summary.inProgress || 0}</p>
                    <span className="text-xs text-slate-500 font-bold mt-1 block">Field visits active</span>
                </div>

                <div className="bg-[#0e131f] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-lg group hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed</span>
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-purple-400">{summary.completed || 0}</p>
                    <span className="text-xs text-slate-500 font-bold mt-1 block">Successfully executed</span>
                </div>
            </div>

            {/* 3. Assign Site Form (Inline Collapsible or Top Section) */}
            <AnimatePresence>
                {isFormOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-[#0d121e] border border-blue-500/20 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative">
                            <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl">
                                        <HardHat size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">
                                            {editingItem ? 'Edit Site Assignment' : 'Assign New Site to AE Employee'}
                                        </h3>
                                        <p className="text-slate-400 text-xs font-bold">
                                            Configure site location, select the responsible engineer, and set time slot.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Site Name */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Site Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Building className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Villa 402 - Green Valley"
                                                value={formData.siteName}
                                                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                                                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                                list="projects-datalist"
                                            />
                                            <datalist id="projects-datalist">
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.name} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>

                                    {/* AE Employee List Dropdown */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            AE Employee <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <UserCheck className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                                            <select
                                                required
                                                value={formData.aeId}
                                                onChange={(e) => setFormData({ ...formData, aeId: e.target.value })}
                                                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled className="bg-slate-900">-- Select AE Employee --</option>
                                                {aeList.map(ae => (
                                                    <option key={ae.id} value={ae.id} className="bg-slate-900 text-white">
                                                        {ae.name} ({ae.designation || 'AE'}) - {ae.email}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Scheduled Date */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Scheduled Date <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                                            <input
                                                type="date"
                                                required
                                                value={formData.scheduledDate}
                                                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Scheduled Time */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Scheduled Time <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. 10:30 AM or 02:00 PM"
                                                value={formData.scheduledTime}
                                                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {['09:30 AM', '11:00 AM', '02:00 PM', '04:30 PM'].map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, scheduledTime: t })}
                                                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Work Type */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Work Type / Purpose
                                        </label>
                                        <select
                                            value={formData.workType}
                                            onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                                            className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                                        >
                                            {WORK_TYPES.map(w => (
                                                <option key={w} value={w} className="bg-slate-900">{w}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Initial Status (if editing) */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Assignment Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                                        >
                                            {Object.keys(STATUS_CONFIG).map(s => (
                                                <option key={s} value={s} className="bg-slate-900">
                                                    {STATUS_CONFIG[s].label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Client Name */}
                                    <div className="space-y-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Client Name (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Mr. Rajesh / Mrs. Ananya"
                                            value={formData.clientName}
                                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                            className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        />
                                    </div>

                                    {/* Location / Area */}
                                    <div className="space-y-2 lg:col-span-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Location / Full Address (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Plot 18, 4th Cross St, Sholinganallur, Chennai"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Remarks / Notes */}
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                        Remarks & Instructions for AE
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Add instructions, key site focus areas, contractor contacts, etc..."
                                        value={formData.remarks}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                        className="w-full bg-slate-900/90 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                                    />
                                </div>

                                {/* Submit & Cancel Buttons */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider shadow-xl shadow-primary/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <RefreshCw size={15} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} />
                                                {editingItem ? 'Update Assignment' : 'Assign Site'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. Filter & Search Action Bar */}
            <div className="bg-[#0e131f] border border-white/5 rounded-3xl p-5 md:p-6 shadow-xl space-y-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search by site, client, AE name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/80 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* AE Filter */}
                        <div className="flex-1 sm:flex-none">
                            <select
                                value={selectedAeFilter}
                                onChange={(e) => { setSelectedAeFilter(e.target.value); setPage(1); }}
                                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="ALL">All AE Employees</option>
                                {aeList.map(ae => (
                                    <option key={ae.id} value={ae.id}>{ae.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="flex-1 sm:flex-none">
                            <select
                                value={selectedStatusFilter}
                                onChange={(e) => { setSelectedStatusFilter(e.target.value); setPage(1); }}
                                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="ALL">All Statuses</option>
                                {Object.keys(STATUS_CONFIG).map(s => (
                                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Work Type Filter */}
                        <div className="flex-1 sm:flex-none">
                            <select
                                value={selectedWorkTypeFilter}
                                onChange={(e) => { setSelectedWorkTypeFilter(e.target.value); setPage(1); }}
                                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="ALL">All Work Types</option>
                                {WORK_TYPES.map(w => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Filter */}
                        <div className="flex-1 sm:flex-none relative">
                            <input
                                type="date"
                                value={selectedDateFilter}
                                onChange={(e) => { setSelectedDateFilter(e.target.value); setPage(1); }}
                                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Reset Filter Button */}
                        {(searchTerm || selectedAeFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || selectedDateFilter || selectedWorkTypeFilter !== 'ALL') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedAeFilter('ALL');
                                    setSelectedStatusFilter('ALL');
                                    setSelectedDateFilter('');
                                    setSelectedWorkTypeFilter('ALL');
                                    setPage(1);
                                }}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors"
                                title="Reset Filters"
                            >
                                <RefreshCw size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. Assignments Data Table */}
            <div className="bg-[#0e131f] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="p-5 pl-6">Site & Location</th>
                                <th className="p-5">Assigned AE</th>
                                <th className="p-5">Date & Time</th>
                                <th className="p-5">Work Type</th>
                                <th className="p-5">Status</th>
                                <th className="p-5">Remarks</th>
                                <th className="p-5 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500 font-bold">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                                        Loading site assignments...
                                    </td>
                                </tr>
                            ) : assignments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-16 text-center text-slate-500">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-400">
                                                <MapPin size={24} />
                                            </div>
                                            <p className="font-black text-slate-300 text-base">No Site Assignments Found</p>
                                            <p className="text-xs text-slate-500">
                                                No site assignments match the current filter criteria. Assign a new site or import via Excel.
                                            </p>
                                            <button
                                                onClick={() => { resetForm(); setIsFormOpen(true); }}
                                                className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                            >
                                                <Plus size={14} /> Add First Assignment
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                assignments.map((item) => {
                                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.SCHEDULED;
                                    const isToday = item.scheduledDate && new Date(item.scheduledDate).toDateString() === new Date().toDateString();

                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                            {/* Site Name & Location */}
                                            <td className="p-5 pl-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-extrabold text-white text-base tracking-tight">
                                                            {item.siteName}
                                                        </span>
                                                        {isToday && (
                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
                                                                Today
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.clientName && (
                                                        <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                                            <User size={12} className="text-slate-500" />
                                                            Client: <span className="text-slate-300">{item.clientName}</span>
                                                        </p>
                                                    )}
                                                    {item.location && (
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <MapPin size={12} className="text-slate-500 flex-shrink-0" />
                                                            <span className="truncate max-w-xs">{item.location}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Assigned AE */}
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-black text-sm">
                                                        {item.ae?.name?.charAt(0)?.toUpperCase() || 'A'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-200 leading-tight">
                                                            {item.ae?.name || 'Unassigned'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {item.ae?.email || item.ae?.phone || 'No Contact Info'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date & Time */}
                                            <td className="p-5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-200">
                                                        <Calendar size={13} className="text-blue-400" />
                                                        {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                        <Clock size={13} className="text-slate-500" />
                                                        {item.scheduledTime || '--:--'}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Work Type */}
                                            <td className="p-5">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                                                    <HardHat size={12} className="text-blue-400" />
                                                    {item.workType || 'Site Inspection'}
                                                </span>
                                            </td>

                                            {/* Status Dropdown */}
                                            <td className="p-5">
                                                <select
                                                    value={item.status || 'SCHEDULED'}
                                                    onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border outline-none cursor-pointer transition-all ${statusCfg.bg}`}
                                                >
                                                    {Object.keys(STATUS_CONFIG).map(s => (
                                                        <option key={s} value={s} className="bg-slate-900 text-white">
                                                            {STATUS_CONFIG[s].label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Remarks */}
                                            <td className="p-5 max-w-xs">
                                                <p className="text-xs text-slate-400 line-clamp-2 italic">
                                                    {item.remarks || <span className="text-slate-600 not-italic">-</span>}
                                                </p>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-5 pr-6 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-blue-400 transition-colors"
                                                        title="Edit Assignment"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModalConfig({
                                                            isOpen: true,
                                                            id: item.id,
                                                            siteName: item.siteName
                                                        })}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                                        title="Delete Assignment"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 6. Pagination Footer */}
                <div className="p-5 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                        <span>
                            Showing <b className="text-white">{assignments.length > 0 ? (page - 1) * limit + 1 : 0}</b> to{' '}
                            <b className="text-white">{Math.min(page * limit, totalRecords)}</b> of{' '}
                            <b className="text-white">{totalRecords}</b> assignments
                        </span>

                        <div className="flex items-center gap-1.5 ml-4">
                            <span className="text-xs text-slate-500">Rows per page:</span>
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            disabled={page <= 1 || isLoading}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const pNum = i + 1;
                                return (
                                    <button
                                        key={pNum}
                                        onClick={() => setPage(pNum)}
                                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${page === pNum
                                            ? 'bg-primary text-white shadow-md'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {pNum}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="text-slate-500 px-1">...</span>}
                        </div>

                        <button
                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={page >= totalPages || isLoading}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 7. Bulk Upload Modal */}
            {isImportModalOpen && (
                <Modal
                    title="Bulk Import Site Assignments (Excel / CSV)"
                    onClose={() => {
                        setIsImportModalOpen(false);
                        setImportFile(null);
                        setImportPreview([]);
                    }}
                    maxWidth="max-w-4xl"
                >
                    <div className="space-y-6">
                        {/* Download Template Banner */}
                        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="text-blue-400" size={24} />
                                <div>
                                    <h4 className="font-bold text-white text-sm">Need the spreadsheet template?</h4>
                                    <p className="text-xs text-slate-400">Download the formatted Excel file with sample columns.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDownloadTemplate}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
                            >
                                <Download size={14} /> Download Template
                            </button>
                        </div>

                        {/* Drag & Drop Upload Zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/20 hover:border-blue-500 rounded-3xl p-8 text-center cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all group"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <Upload size={28} />
                            </div>
                            <p className="font-black text-white text-base">
                                {importFile ? importFile.name : 'Click to select or drag & drop spreadsheet'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Supports .XLSX, .XLS, and .CSV files up to 15MB</p>
                        </div>

                        {/* Preview Table */}
                        {importPreview.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                                    <span>Preview Data (First {importPreview.length} rows)</span>
                                    <span className="text-emerald-400 font-bold">{importPreview.length} records ready</span>
                                </h4>
                                <div className="max-h-60 overflow-y-auto border border-white/10 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-slate-800 text-slate-400 sticky top-0">
                                            <tr>
                                                <th className="p-3">Site Name</th>
                                                <th className="p-3">AE Email/Name</th>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Time</th>
                                                <th className="p-3">Work Type</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-slate-300">
                                            {importPreview.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-white/[0.02]">
                                                    <td className="p-3 font-bold text-white">{row['Site Name'] || row.Site || row.siteName || '-'}</td>
                                                    <td className="p-3">{row['AE Email'] || row.Email || row['AE Name'] || row.aeEmail || '-'}</td>
                                                    <td className="p-3">{row['Scheduled Date'] || row.Date || row.scheduledDate || '-'}</td>
                                                    <td className="p-3">{row['Scheduled Time'] || row.Time || row.scheduledTime || '-'}</td>
                                                    <td className="p-3">{row['Work Type'] || row.Type || row.workType || 'Site Inspection'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsImportModalOpen(false);
                                    setImportFile(null);
                                    setImportPreview([]);
                                }}
                                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkImport}
                                disabled={!importFile || importLoading}
                                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
                            >
                                {importLoading ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> Confirm & Import
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* 8. Delete Confirmation Modal */}
            {deleteModalConfig.isOpen && (
                <Modal
                    title="Confirm Deletion"
                    onClose={() => setDeleteModalConfig({ isOpen: false, id: null, siteName: '' })}
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                            <AlertCircle size={30} />
                        </div>
                        <h4 className="text-lg font-black text-white">Delete Site Assignment?</h4>
                        <p className="text-xs text-slate-400">
                            Are you sure you want to remove the assignment for site{' '}
                            <b className="text-white">"{deleteModalConfig.siteName}"</b>? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-4">
                            <button
                                onClick={() => setDeleteModalConfig({ isOpen: false, id: null, siteName: '' })}
                                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SiteAssignments;
