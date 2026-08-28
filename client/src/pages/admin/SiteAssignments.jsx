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
    HardHat,
    Layers,
    ShieldAlert,
    Check,
    Sparkles,
    Link2,
    Globe,
    ExternalLink
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

const SiteAssignments = () => {
    const { user } = useSelector((state) => state.auth);
    const isAEManager = user?.role === 'AE_MANAGER' || user?.designation === 'AE MANAGER' || user?.designation === 'AE_MANAGER';

    const [assignments, setAssignments] = useState([]);
    const [aeList, setAeList] = useState([]);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Permanent XLS Link State
    const [savedXlsLink, setSavedXlsLink] = useState(() => localStorage.getItem('peopledesk_assigned_sites_xls_link') || '');
    const [xlsLinkInput, setXlsLinkInput] = useState(() => localStorage.getItem('peopledesk_assigned_sites_xls_link') || '');
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isSyncingLink, setIsSyncingLink] = useState(false);

    // Summary KPIs
    const [summary, setSummary] = useState({
        total: 0,
        today: 0,
        uniqueAECount: 0
    });

    // Pagination & Filters State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAeFilter, setSelectedAeFilter] = useState('ALL');
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
        remarks: ''
    });

    // Connected XLS State for Add Site Form
    const [connectedXlsFile, setConnectedXlsFile] = useState(null);
    const [connectedXlsData, setConnectedXlsData] = useState([]);
    const [selectedXlsIndex, setSelectedXlsIndex] = useState('');
    const [connectedXlsHeaders, setConnectedXlsHeaders] = useState([]);
    const connectXlsInputRef = useRef(null);

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

        if (user?.token && isAEManager) {
            fetchDropdownData();
        }
    }, [baseUrl, authHeaders, user?.token, isAEManager]);

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
        if (isAEManager) {
            fetchAssignments();
        }
    }, [page, limit, selectedAeFilter, selectedDateFilter, selectedWorkTypeFilter, isAEManager]);

    // Handle Search with debounce
    useEffect(() => {
        if (!isAEManager) return;
        const timer = setTimeout(() => {
            setPage(1);
            fetchAssignments();
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, isAEManager]);

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
            remarks: ''
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
            remarks: item.remarks || ''
        });
        setIsFormOpen(true);
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
                aeId: selectedAeFilter
            });
            if (selectedDateFilter) params.append('startDate', selectedDateFilter);

            window.open(`${baseUrl}/site-assignments/export?${params.toString()}&token=${user?.token}`, '_blank');
            toast.info(`Generating ${format.toUpperCase()} export...`);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export assignments');
        }
    };

    // Handle Connecting XLS File in Add Site form
    const handleConnectXlsFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (!data || data.length === 0) {
                    toast.error('The selected spreadsheet has no data rows.');
                    return;
                }

                const headers = Object.keys(data[0] || {});
                setConnectedXlsFile(file);
                setConnectedXlsData(data);
                setConnectedXlsHeaders(headers);
                setSelectedXlsIndex('');
                toast.success(`Connected "${file.name}" - ${data.length} sites loaded!`);
            } catch (err) {
                console.error('Error reading spreadsheet:', err);
                toast.error('Failed to parse selected Excel file.');
            }
        };
        reader.readAsBinaryString(file);
    };

    // Apply selected row from connected XLS into Add Site form
    const handleApplyXlsRow = (indexStr) => {
        if (indexStr === '' || indexStr === null || indexStr === undefined) {
            setSelectedXlsIndex('');
            return;
        }

        const idx = Number(indexStr);
        const row = connectedXlsData[idx];
        if (!row) return;

        setSelectedXlsIndex(String(idx));

        // Extract values using various common header variations
        const site = row['Site Name'] || row['Site'] || row['siteName'] || row['Project'] || row['Project Name'] || row['Name'] || '';
        const client = row['Client Name'] || row['Client'] || row['clientName'] || row['Customer'] || row['Customer Name'] || '';
        const loc = row['Location'] || row['Address'] || row['location'] || row['Site Address'] || row['City'] || '';
        const dateRaw = row['Scheduled Date'] || row['Date'] || row['scheduledDate'] || '';
        const time = row['Scheduled Time'] || row['Time'] || row['scheduledTime'] || '';
        const work = row['Work Type'] || row['Purpose'] || row['workType'] || row['Type'] || '';
        const rem = row['Remarks'] || row['Instructions'] || row['Notes'] || row['remarks'] || row['Description'] || '';
        const aeIdent = (row['AE Email'] || row['Email'] || row['AE Name'] || row['Engineer'] || row['AE'] || '').toString().toLowerCase().trim();

        // Match AE ID from aeList
        let matchedAeId = formData.aeId;
        if (aeIdent && aeList.length > 0) {
            const found = aeList.find(a => 
                (a.email && a.email.toLowerCase().includes(aeIdent)) ||
                (a.name && a.name.toLowerCase().includes(aeIdent)) ||
                (aeIdent.includes(a.name.toLowerCase()))
            );
            if (found) {
                matchedAeId = found.id;
            }
        }

        // Format date if valid
        let formattedDate = formData.scheduledDate;
        if (dateRaw) {
            const d = new Date(dateRaw);
            if (!isNaN(d.getTime())) {
                formattedDate = d.toISOString().split('T')[0];
            }
        }

        // Match work type if in WORK_TYPES
        let matchedWorkType = formData.workType;
        if (work) {
            const foundWork = WORK_TYPES.find(w => w.toLowerCase() === work.toLowerCase().trim());
            if (foundWork) {
                matchedWorkType = foundWork;
            }
        }

        setFormData(prev => ({
            ...prev,
            siteName: site || prev.siteName,
            clientName: client || prev.clientName,
            location: loc || prev.location,
            scheduledDate: formattedDate || prev.scheduledDate,
            scheduledTime: time || prev.scheduledTime,
            workType: matchedWorkType || prev.workType,
            remarks: rem || prev.remarks,
            aeId: matchedAeId || prev.aeId
        }));

        toast.info(`Loaded: ${site || `Row #${idx + 1}`}`);
    };

    // Disconnect XLS
    const handleDisconnectXls = () => {
        setConnectedXlsFile(null);
        setConnectedXlsData([]);
        setSelectedXlsIndex('');
        setConnectedXlsHeaders([]);
        if (connectXlsInputRef.current) {
            connectXlsInputRef.current.value = '';
        }
        toast.info('Disconnected spreadsheet.');
    };

    // Fetch and parse remote spreadsheet from URL / Google Sheets
    const fetchAndApplyRemoteXls = async (url, showToast = true) => {
        if (!url || !url.trim()) return;
        setIsSyncingLink(true);
        try {
            const res = await axios.post(`${baseUrl}/site-assignments/fetch-remote-xls`, { url: url.trim() }, authHeaders);
            if (res.data.success && res.data.data) {
                setConnectedXlsData(res.data.data);
                setConnectedXlsHeaders(res.data.headers || []);
                setConnectedXlsFile({
                    name: res.data.sheetName ? `${res.data.sheetName} (Cloud Link)` : 'Connected Cloud Spreadsheet',
                    isRemote: true,
                    url: url.trim()
                });
                setSelectedXlsIndex('');
                if (showToast) {
                    toast.success(`Connected & loaded ${res.data.totalRows} sites from cloud spreadsheet!`);
                }
            }
        } catch (error) {
            console.error('Failed to sync remote spreadsheet:', error);
            if (showToast) {
                toast.error(error.response?.data?.message || 'Failed to load spreadsheet from link.');
            }
        } finally {
            setIsSyncingLink(false);
        }
    };

    // Auto-connect to saved XLS link on mount
    useEffect(() => {
        if (savedXlsLink && isAEManager && user?.token) {
            fetchAndApplyRemoteXls(savedXlsLink, false);
        }
    }, [savedXlsLink, isAEManager, user?.token]);

    const handleSaveXlsLink = (e) => {
        e?.preventDefault();
        if (!xlsLinkInput.trim()) {
            return toast.error('Please enter a valid spreadsheet URL');
        }
        const link = xlsLinkInput.trim();
        localStorage.setItem('peopledesk_assigned_sites_xls_link', link);
        setSavedXlsLink(link);
        setIsLinkModalOpen(false);
        fetchAndApplyRemoteXls(link, true);
    };

    const handleClearSavedLink = () => {
        localStorage.removeItem('peopledesk_assigned_sites_xls_link');
        setSavedXlsLink('');
        setXlsLinkInput('');
        handleDisconnectXls();
        toast.info('Removed cloud spreadsheet link.');
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
                'Remarks': 'Take living room & kitchen measurements'
            },
            {
                'Site Name': 'Plot 18 - Orchid Heights',
                'Client Name': 'Ananya Sen',
                'Location': 'Anna Nagar, Chennai',
                'AE Email': aeList[1]?.email || 'ae2@cookscape.com',
                'Scheduled Date': '2026-08-31',
                'Scheduled Time': '02:30 PM',
                'Work Type': 'Installation',
                'Remarks': 'Verify carcass and modular shutter alignment'
            },
            {
                'Site Name': 'Prestige Palms - Tower B 504',
                'Client Name': 'Suresh Chandran',
                'Location': 'Whitefield, Bangalore',
                'AE Email': aeList[0]?.email || 'ae.engineer@cookscape.com',
                'Scheduled Date': '2026-09-01',
                'Scheduled Time': '11:00 AM',
                'Work Type': 'Site Inspection',
                'Remarks': 'Check electrical conduits and false ceiling markings'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData);
        ws['!cols'] = [
            { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 28 },
            { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 45 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sites');
        XLSX.writeFile(wb, 'site_assignments_template.xlsx');
        toast.success('Sample sites template downloaded (.xlsx)');
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
                setImportPreview(data.slice(0, 10));
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
            setIsImportLoading(false);
        }
    };

    if (!isAEManager) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                    <ShieldAlert size={32} />
                </div>
                <h2 className="text-2xl font-black text-white">Access Restricted</h2>
                <p className="text-sm text-slate-400 font-medium">
                    Only the <b className="text-slate-200">AE Manager</b> is authorized to allocate and assign site visits to engineers.
                </p>
            </div>
        );
    }

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
                            AE Manager Workspace
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                            Assign Sites
                            <span className="text-xs bg-blue-500/20 text-blue-300 font-bold px-3 py-1 rounded-full border border-blue-500/30">
                                AE Manager
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium">
                            Allocate customer project sites to Application Engineers, schedule on-site visit slots, and manage field allocations.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => {
                                setXlsLinkInput(savedXlsLink);
                                setIsLinkModalOpen(true);
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 border cursor-pointer ${
                                savedXlsLink 
                                    ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/40'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                            }`}
                            title={savedXlsLink ? `Cloud XLS Connected: ${savedXlsLink}` : 'Connect permanent spreadsheet URL'}
                        >
                            <Link2 size={16} className={savedXlsLink ? 'text-blue-400' : 'text-slate-400'} />
                            <span>{savedXlsLink ? 'Cloud XLS Link' : 'Connect XLS Link'}</span>
                            {savedXlsLink && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                        </button>

                        {savedXlsLink && (
                            <button
                                onClick={() => fetchAndApplyRemoteXls(savedXlsLink, true)}
                                disabled={isSyncingLink}
                                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                title="Sync Latest Changes from Cloud XLS"
                            >
                                <RefreshCw size={15} className={isSyncingLink ? 'animate-spin text-blue-400' : ''} />
                            </button>
                        )}

                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-200 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <Upload size={16} className="text-blue-400" />
                            Upload XLS / CSV
                        </button>

                        <button
                            onClick={() => handleExport('xlsx')}
                            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <Download size={16} className="text-emerald-400" />
                            Export Excel
                        </button>

                        <button
                            onClick={() => {
                                resetForm();
                                setIsFormOpen(true);
                            }}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-primary/25 active:scale-95 cursor-pointer"
                        >
                            <Plus size={18} />
                            Assign New Site
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-[#0e131f] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-lg group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Sites Allocated</span>
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                            <Layers size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-white">{summary.total || 0}</p>
                    <span className="text-xs text-slate-500 font-bold mt-1 block">Total site visits assigned</span>
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

                <div className="bg-[#0e131f] border border-white/5 p-6 rounded-3xl relative overflow-hidden shadow-lg group hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Engineers</span>
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                            <UserCheck size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-indigo-400">{summary.uniqueAECount || 0}</p>
                    <span className="text-xs text-slate-500 font-bold mt-1 block">Engineers with allocated sites</span>
                </div>
            </div>

            {/* 3. Assign Site Pop-Up Modal */}
            <AnimatePresence>
                {isFormOpen && (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) resetForm();
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.93, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.93, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-[#0d121e] border border-blue-500/30 w-full max-w-4xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
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
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* XLS Connect & Auto-fill Bar */}
                            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-900/60 to-indigo-900/30 border border-blue-500/30 backdrop-blur-sm">
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
                                            <FileSpreadsheet size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                                    <Sparkles size={13} className="text-amber-400" /> Connect XLS / Spreadsheet
                                                </h4>
                                                {connectedXlsFile && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Connected
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                {connectedXlsFile 
                                                    ? `Loaded "${connectedXlsFile.name}" with ${connectedXlsData.length} site records. Pick any site below to auto-fill form.`
                                                    : savedXlsLink 
                                                        ? 'Using permanent cloud XLS link. You can also upload a local spreadsheet file.' 
                                                        : 'Connect a cloud link or local Excel file to populate site details automatically in dropdown.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                        <input
                                            ref={connectXlsInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleConnectXlsFile}
                                            className="hidden"
                                        />
                                        
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setXlsLinkInput(savedXlsLink);
                                                setIsLinkModalOpen(true);
                                            }}
                                            className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                                            title="Configure permanent Google Sheets / online XLS link"
                                        >
                                            <Link2 size={14} /> {savedXlsLink ? 'Cloud Link' : 'Add Link'}
                                        </button>

                                        {savedXlsLink && (
                                            <button
                                                type="button"
                                                onClick={() => fetchAndApplyRemoteXls(savedXlsLink, true)}
                                                disabled={isSyncingLink}
                                                className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors disabled:opacity-40 cursor-pointer"
                                                title="Sync now from cloud link"
                                            >
                                                <RefreshCw size={14} className={isSyncingLink ? 'animate-spin text-blue-400' : ''} />
                                            </button>
                                        )}

                                        {!connectedXlsFile?.isRemote && !connectedXlsFile ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => connectXlsInputRef.current?.click()}
                                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                                                >
                                                    <Upload size={14} /> Upload File
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleDownloadTemplate}
                                                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                                                    title="Download Sample XLS Template"
                                                >
                                                    <Download size={13} /> Sample XLS
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {!connectedXlsFile.isRemote && (
                                                    <button
                                                        type="button"
                                                        onClick={() => connectXlsInputRef.current?.click()}
                                                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
                                                    >
                                                        <Upload size={13} /> Change File
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleDisconnectXls}
                                                    className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20 cursor-pointer"
                                                    title="Disconnect Loaded Spreadsheet"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* When XLS is Connected: Render Dropdown Selector */}
                                {connectedXlsFile && connectedXlsData.length > 0 && (
                                    <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Select Site from Connected XLS ({connectedXlsData.length} Available)
                                            </label>
                                            <span className="text-[10px] text-slate-400 font-semibold">
                                                Auto-fills Site, Client, Location, AE & Time
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedXlsIndex}
                                                onChange={(e) => handleApplyXlsRow(e.target.value)}
                                                className="flex-1 bg-slate-950 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-inner"
                                            >
                                                <option value="">-- Choose a site from "{connectedXlsFile.name}" --</option>
                                                {connectedXlsData.map((row, idx) => {
                                                    const sName = row['Site Name'] || row['Site'] || row['siteName'] || row['Project'] || `Site #${idx + 1}`;
                                                    const cName = row['Client Name'] || row['Client'] || row['clientName'] || row['Customer'] || '';
                                                    const loc = row['Location'] || row['Address'] || row['location'] || '';
                                                    const time = row['Scheduled Time'] || row['Time'] || '';
                                                    return (
                                                        <option key={idx} value={idx}>
                                                            📍 {sName} {cName ? `| Client: ${cName}` : ''} {loc ? `| ${loc}` : ''} {time ? `| ⏰ ${time}` : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>

                                            {selectedXlsIndex !== '' && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const prev = Math.max(0, Number(selectedXlsIndex) - 1);
                                                            handleApplyXlsRow(String(prev));
                                                        }}
                                                        disabled={Number(selectedXlsIndex) <= 0}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                                        title="Previous site in XLS"
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const next = Math.min(connectedXlsData.length - 1, Number(selectedXlsIndex) + 1);
                                                            handleApplyXlsRow(String(next));
                                                        }}
                                                        disabled={Number(selectedXlsIndex) >= connectedXlsData.length - 1}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                                        title="Next site in XLS"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Site Name */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                                Site Name <span className="text-red-500">*</span>
                                            </label>
                                            {connectedXlsData.length > 0 && (
                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                                                    XLS Ready ({connectedXlsData.length})
                                                </span>
                                            )}
                                        </div>
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
                                                {connectedXlsData.map((row, idx) => {
                                                    const s = row['Site Name'] || row['Site'] || row['siteName'] || row['Project'];
                                                    return s ? <option key={`xls-site-${idx}`} value={s} /> : null;
                                                })}
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
                                            className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                                            list="xls-clients-datalist"
                                        />
                                        <datalist id="xls-clients-datalist">
                                            {connectedXlsData.map((row, idx) => {
                                                const c = row['Client Name'] || row['Client'] || row['clientName'] || row['Customer'];
                                                return c ? <option key={`xls-client-${idx}`} value={c} /> : null;
                                            })}
                                        </datalist>
                                    </div>

                                    {/* Location / Area */}
                                    <div className="space-y-2 lg:col-span-3">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                            Location / Full Address (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Plot 18, 4th Cross St, Sholinganallur, Chennai"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                                            list="xls-locations-datalist"
                                        />
                                        <datalist id="xls-locations-datalist">
                                            {connectedXlsData.map((row, idx) => {
                                                const l = row['Location'] || row['Address'] || row['location'] || row['Site Address'];
                                                return l ? <option key={`xls-loc-${idx}`} value={l} /> : null;
                                            })}
                                        </datalist>
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
                                        className="w-full bg-slate-900/90 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all resize-none"
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
                        </motion.div>
                    </div>
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
                        {(searchTerm || selectedAeFilter !== 'ALL' || selectedDateFilter || selectedWorkTypeFilter !== 'ALL') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedAeFilter('ALL');
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
                                <th className="p-5">Scheduled Date & Time</th>
                                <th className="p-5">Work Type</th>
                                <th className="p-5">Remarks</th>
                                <th className="p-5 pr-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500 font-bold">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                                        Loading site assignments...
                                    </td>
                                </tr>
                            ) : assignments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-slate-500">
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

            {/* 8. Cloud XLS / Google Sheets Permanent Link Modal */}
            {isLinkModalOpen && (
                <Modal
                    title="Connect Cloud XLS / Google Sheets Link"
                    onClose={() => setIsLinkModalOpen(false)}
                    maxWidth="max-w-xl"
                >
                    <form onSubmit={handleSaveXlsLink} className="space-y-5">
                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-300 space-y-2">
                            <div className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-wider">
                                <Sparkles size={14} className="text-amber-400" />
                                Always-Connected Spreadsheet Link
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-300">
                                Paste a public link to your Google Sheet, OneDrive Excel file, or online spreadsheet (<code className="text-blue-300 bg-black/30 px-1 py-0.5 rounded">.xlsx</code> / <code className="text-blue-300 bg-black/30 px-1 py-0.5 rounded">.csv</code>). 
                                PeopleDesk will <b>always connect automatically</b> to this link whenever you assign sites!
                            </p>
                            <div className="text-[10px] text-slate-400 bg-black/20 p-2.5 rounded-xl space-y-1">
                                <div className="font-bold text-slate-300">💡 Google Sheets Tip:</div>
                                <div>1. Open your sheet &gt; Click <b>Share</b> &gt; Set to <b>"Anyone with the link can view"</b>.</div>
                                <div>2. Copy and paste the browser URL below.</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                                Spreadsheet URL / Google Sheet Link <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
                                <input
                                    type="url"
                                    required
                                    placeholder="https://docs.google.com/spreadsheets/d/... or https://example.com/sites.xlsx"
                                    value={xlsLinkInput}
                                    onChange={(e) => setXlsLinkInput(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {savedXlsLink && (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                                <span className="text-slate-400 truncate max-w-[280px]">
                                    Current: <b className="text-emerald-400">{savedXlsLink}</b>
                                </span>
                                <button
                                    type="button"
                                    onClick={handleClearSavedLink}
                                    className="text-red-400 hover:text-red-300 text-[11px] font-bold underline cursor-pointer"
                                >
                                    Disconnect Link
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={() => setIsLinkModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSyncingLink}
                                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {isSyncingLink ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <Link2 size={15} /> Save & Always Connect
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* 9. Delete Confirmation Modal */}
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
