import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWalkins, fetchBHs, createWalkin, updateWalkin, deleteWalkin, reset } from '../../features/walkin/walkinSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Users, 
    Calendar, 
    Clock, 
    MapPin, 
    MessageSquare, 
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    X,
    CheckCircle,
    UserCircle2,
    LayoutGrid,
    ChevronDown,
    Building2,
    Briefcase,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    AlertTriangle,
    Phone,
    Timer,
    Monitor
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import ShowroomMonitor from '../../components/ShowroomMonitor';


const format12hTo24h = (time12h) => {
    if (!time12h || typeof time12h !== 'string') return '';
    // Handle formats like "10:30 AM", "3.14pm", "2:00PM"
    const cleaned = time12h.toLowerCase().replace(/\./g, ':').trim();
    const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
    if (!match) {
        // Handle simple hour like "10 AM"
        const simpleMatch = cleaned.match(/(\d{1,2})\s*(am|pm)/);
        if (simpleMatch) {
            let h = parseInt(simpleMatch[1]);
            const p = simpleMatch[2];
            if (p === 'pm' && h < 12) h += 12;
            if (p === 'am' && h === 12) h = 0;
            return `${h.toString().padStart(2, '0')}:00`;
        }
        return '';
    }
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const ampm = match[3];

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

const format24hTo12h = (time24h) => {
    if (!time24h) return '';
    const [h, m] = time24h.split(':');
    let hours = parseInt(h);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${m} ${suffix}`;
};

const WalkinHub = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { entries, bhs, isLoading, isError, isSuccess, message } = useSelector((state) => state.walkin);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBH, setFilterBH] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showConfirmDuplicate, setShowConfirmDuplicate] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [sortField, setSortField] = useState('dateOfVisit'); // default sort
    const [sortOrder, setSortOrder] = useState('desc'); // default order
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [faStaff, setFaStaff] = useState([]);
    const [creStaff, setCreStaff] = useState([]);

    const [formData, setFormData] = useState({
        faId: '',
        faTeam: '',
        architect: '',
        bhId: '',
        clientName: '',
        contactNumber: '',
        project: '',
        status: '',
        dateOfVisit: new Date().toISOString().split('T')[0],
        dayOfVisit: '',
        tentativeTime: '',
        showroom: '',
        inTime: '',
        outTime: '',
        visitStatus: 'PENDING',
        remarks: '',
        creName: '',
        creId: ''
    });

    useEffect(() => {
        dispatch(fetchWalkins());
        dispatch(fetchBHs());
        fetchStaff();
    }, [dispatch]);

    const fetchStaff = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const base = import.meta.env.VITE_API_BASE_URL;
            const resFa = await axios.get(`${base}/walkin/staff?designations=FA,LA`, config);
            const resCre = await axios.get(`${base}/walkin/staff?designations=CRE,CLIENT-FACILITATOR`, config);
            setFaStaff(resFa.data);
            setCreStaff(resCre.data);
        } catch (err) {
            console.error("Error fetching staff:", err);
        }
    };

    useEffect(() => {
        if (isError) toast.error(message);
        if (isSuccess) {
            toast.success(editingEntry ? 'Entry updated successfully' : 'Entry created successfully');
            setIsFormOpen(false);
            setEditingEntry(null);
            clearForm();
            dispatch(reset());
        }
    }, [isError, isSuccess, message, dispatch]);

    const clearForm = () => {
        setFormData({
            faTeam: '',
            architect: '',
            bhId: '',
            clientName: '',
            contactNumber: '',
            project: '',
            status: '',
            dateOfVisit: new Date().toISOString().split('T')[0],
            dayOfVisit: '',
            tentativeTime: '',
            showroom: '',
            inTime: '',
            outTime: '',
            visitStatus: 'PENDING',
            remarks: '',
            creName: '',
            creId: '',
            faId: ''
        });
    };

    const handleEdit = (entry) => {
        setEditingEntry(entry);
        setFormData({
            ...entry,
            dateOfVisit: new Date(entry.dateOfVisit).toISOString().split('T')[0],
            bhId: entry.bhId.toString()
        });
        setIsFormOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            dispatch(deleteWalkin(id));
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const SHOWROOMS = ["MTRS", "OMR", "PORUR", "COIMBATORE"];

    const onSubmit = (e) => {
        e.preventDefault();
        
        if (!editingEntry && !showConfirmDuplicate) {
            // Check for potential duplicate
            const isDuplicate = entries.some(entry => 
                entry.contactNumber === formData.contactNumber && 
                new Date(entry.dateOfVisit).toDateString() === new Date(formData.dateOfVisit).toDateString()
            );

            if (isDuplicate) {
                setShowConfirmDuplicate(true);
                return;
            }
        }

        if (editingEntry) {
            dispatch(updateWalkin({ id: editingEntry.id, data: formData }));
        } else {
            dispatch(createWalkin(formData));
        }
        setShowConfirmDuplicate(false);
    };

    const handleRowClick = (entry) => {
        setSelectedEntry(entry);
        setIsViewModalOpen(true);
    };

    const filteredEntries = entries.filter(entry => {
        const entryDate = new Date(entry.dateOfVisit);
        entryDate.setHours(0, 0, 0, 0);

        const matchesSearch = entry.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (entry.project && entry.project.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesBH = filterBH === '' || entry.bhId.toString() === filterBH;
        const matchesStatus = filterStatus === '' || entry.visitStatus === filterStatus;
        
        const matchesFrom = !fromDate || entryDate >= new Date(fromDate);
        const matchesTo = !toDate || entryDate <= new Date(toDate);

        return matchesSearch && matchesBH && matchesStatus && matchesFrom && matchesTo;
    }).sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Special handling for nested objects or nulls if needed
        if (sortField === 'dateOfVisit') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const getVisitStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CANCELLED': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'RESCHEDULED': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    // Calculate Stats for Admin
    const getStats = () => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const last7Days = new Date(now); last7Days.setDate(now.getDate() - 7);
        const last15Days = new Date(now); last15Days.setDate(now.getDate() - 15);
        const last30Days = new Date(now); last30Days.setDate(now.getDate() - 30);

        return {
            total: entries.length,
            last7: entries.filter(e => new Date(e.dateOfVisit) >= last7Days).length,
            last15: entries.filter(e => new Date(e.dateOfVisit) >= last15Days).length,
            last30: entries.filter(e => new Date(e.dateOfVisit) >= last30Days).length
        };
    };

    const stats = getStats();

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-in fade-in duration-500">
            {/* Header section with modern glassmorphism */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/50">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-2 px-3 py-1 bg-blue-50 rounded-full w-fit">
                        <Users size={12} /> CRM Walkin Management
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">Walkin Hub</h1>
                    <p className="text-slate-500 font-bold">Manage client visits and follow-ups in one place.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => { setEditingEntry(null); clearForm(); setIsFormOpen(true); }}
                        className="flex items-center justify-center gap-3 bg-slate-900 border-b-4 border-slate-700 hover:bg-black hover:border-slate-800 text-white px-8 py-4 rounded-[1.5rem] font-bold shadow-xl transition-all active:scale-95 active:border-b-0 active:translate-y-1 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" /> New Entry
                    </button>
                </div>
            </div>

            {/* Admin Stats Grid */}
            {['ADMIN', 'BUSINESS_HEAD', 'HR', 'AE_MANAGER'].includes(user.role) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                <Users size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stats.total}</h3>
                        <p className="text-slate-400 text-xs font-bold mt-1">Total Walkins Registered</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                <Calendar size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last 7 Days</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stats.last7}</h3>
                        <p className="text-slate-400 text-xs font-bold mt-1">Recent Weekly Activity</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                                <Clock size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last 15 Days</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stats.last15}</h3>
                        <p className="text-slate-400 text-xs font-bold mt-1">Bi-weekly Engagement</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                                <LayoutGrid size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly</span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stats.last30}</h3>
                        <p className="text-slate-400 text-xs font-bold mt-1">30-day Volume</p>
                    </div>
                </div>
            )}

            <ShowroomMonitor showrooms={SHOWROOMS} entries={entries} />

            {/* Filters Bar */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search client or project..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none cursor-pointer"
                            value={filterBH}
                            onChange={(e) => setFilterBH(e.target.value)}
                        >
                            <option value="">All Business Heads</option>
                            {bhs.map(bh => (
                                <option key={bh.id} value={bh.id}>{bh.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="RESCHEDULED">Rescheduled</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none cursor-pointer"
                                value={sortField}
                                onChange={(e) => setSortField(e.target.value)}
                            >
                                <option value="dateOfVisit">Sort: Date</option>
                                <option value="visitStatus">Sort: Status</option>
                                <option value="clientName">Sort: Name</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors text-slate-600"
                            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                        </button>
                    </div>
                    <div className="flex items-center justify-center bg-slate-50 rounded-2xl px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Showing {filteredEntries.length} entries
                    </div>
                </div>

                {/* Date Filter Row */}
                <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-xl text-blue-700 text-xs font-black uppercase tracking-widest">
                        <Filter size={14} /> Date Filter
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">From:</span>
                            <input
                                type="date"
                                className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none cursor-pointer"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">To:</span>
                            <input
                                type="date"
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none cursor-pointer"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>
                    {(fromDate || toDate) && (
                        <button 
                            onClick={() => { setFromDate(''); setToDate(''); }}
                            className="px-4 py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs hover:bg-rose-100 transition-colors"
                        >
                            Clear Date
                        </button>
                    )}
                </div>
            </div>

            {/* Entries Table */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-track-slate-50 scrollbar-thumb-slate-200">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                <th className="px-5 py-6 pl-8">Client & Project</th>
                                <th className="px-5 py-6 cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort('dateOfVisit')}>
                                    <div className="flex items-center gap-2">
                                        Visit Schedule
                                        {sortField === 'dateOfVisit' ? (
                                            sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-slate-300" />}
                                    </div>
                                </th>
                                <th className="px-5 py-6">In/Out Time</th>
                                <th className="px-5 py-6">Business Head</th>
                                <th className="px-5 py-6">Representative</th>
                                <th className="px-5 py-6">CRE</th>
                                <th className="px-5 py-6 cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort('visitStatus')}>
                                    <div className="flex items-center gap-2">
                                        Status
                                        {sortField === 'visitStatus' ? (
                                            sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-slate-300" />}
                                    </div>
                                </th>
                                <th className="px-5 py-6 text-center">Review</th>
                                <th className="px-5 py-6 pr-8 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredEntries.map((entry) => (
                                <tr 
                                    key={entry.id} 
                                    onClick={() => handleRowClick(entry)}
                                    className="hover:bg-slate-50/70 transition-all group cursor-pointer"
                                >
                                    <td className="px-5 py-8 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black shadow-sm group-hover:scale-110 transition-transform">
                                                {entry.clientName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-lg tracking-tight group-hover:text-blue-600 transition-colors uppercase">{entry.clientName}</p>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    <Briefcase size={12} /> {entry.project || 'No Project'} | {entry.contactNumber}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-8">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                                <Calendar size={14} className="text-blue-500" />
                                                {new Date(entry.dateOfVisit).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                                                <Clock size={14} /> {entry.tentativeTime || 'N/A'} | {entry.showroom || 'No Showroom'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-8">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                <Timer size={12} className="text-emerald-500" /> In: {entry.inTime || '--'}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                <Timer size={12} className="text-rose-500" /> Out: {entry.outTime || '--'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shadow-sm">
                                                <UserCircle2 size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700 text-sm">{entry.bh?.name || 'Unassigned'}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Head</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-8">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-700 text-sm">{entry.fa?.name || entry.faTeam || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-8">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-slate-700 text-sm">{entry.cre?.name || entry.creName || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-3 py-6">
                                        <span className={`inline-flex px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm whitespace-nowrap ${getVisitStatusColor(entry.visitStatus)}`}>
                                            {entry.visitStatus || 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-6 text-center">
                                        {entry.reviewSent ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                                                <CheckCircle size={14} /> Sent
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[10px] uppercase tracking-wider">
                                                <Clock size={14} /> Pending
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-8 pr-8 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => handleEdit(entry)}
                                                className="p-3 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-slate-100 shadow-sm"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            {['ADMIN', 'BUSINESS_HEAD'].includes(user.role) && (
                                                <button 
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="p-3 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-slate-100 shadow-sm"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Entry Form Modal */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl relative overflow-hidden h-[90vh] flex flex-col" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-slate-900 px-10 py-8 flex justify-between items-center text-white shrink-0">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">{editingEntry ? 'Edit Visit Entry' : 'New Client Visit'}</h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Walkin Lead Management</p>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-2xl transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={onSubmit} className="p-10 space-y-8 overflow-y-auto scrollbar-hide flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Client Basic Info */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Name *</label>
                                            <input
                                                type="text" required
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm"
                                                value={formData.clientName}
                                                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number *</label>
                                            <input
                                                type="text" required
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm"
                                                value={formData.contactNumber}
                                                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Visit *</label>
                                                <input
                                                    type="date" required
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm"
                                                    value={formData.dateOfVisit}
                                                    onChange={(e) => setFormData({ ...formData, dateOfVisit: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Committed Time</label>
                                                <input
                                                type="time"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm"
                                                value={format12hTo24h(formData.tentativeTime) || ""}
                                                onChange={(e) => setFormData({ ...formData, tentativeTime: format24hTo12h(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Head *</label>
                                            <select
                                                required
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none"
                                                value={formData.bhId}
                                                onChange={(e) => setFormData({ ...formData, bhId: e.target.value })}
                                            >
                                                <option value="">Select BH...</option>
                                                {bhs.map(bh => (
                                                    <option key={bh.id} value={bh.id}>{bh.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Project & Visit Details */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FA / LA Representative *</label>
                                            <select
                                                required
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none"
                                                value={formData.faId}
                                                onChange={(e) => {
                                                    const selected = faStaff.find(s => s.id === parseInt(e.target.value));
                                                    setFormData({ 
                                                        ...formData, 
                                                        faId: e.target.value,
                                                        faTeam: selected ? selected.name : '' 
                                                    });
                                                }}
                                            >
                                                <option value="">Select Representative...</option>
                                                {faStaff.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm"
                                                value={formData.project}
                                                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Showroom</label>
                                                <select
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none"
                                                    value={formData.showroom}
                                                    onChange={(e) => setFormData({ ...formData, showroom: e.target.value })}
                                                >
                                                    <option value="">Select Showroom...</option>
                                                    {SHOWROOMS.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visit Status</label>
                                                <select
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none"
                                                    value={formData.visitStatus}
                                                    onChange={(e) => setFormData({ ...formData, visitStatus: e.target.value })}
                                                >
                                                    <option value="PENDING">Pending</option>
                                                    <option value="COMPLETED">Completed</option>
                                                    <option value="RESCHEDULED">Rescheduled</option>
                                                    <option value="CANCELLED">Cancelled</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">In Time</label>
                                                <div className="relative">
                                                    <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input
                                                        type="time"
                                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm"
                                                        value={format12hTo24h(formData.inTime)}
                                                        onChange={(e) => setFormData({ ...formData, inTime: format24hTo12h(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Out Time</label>
                                                <div className="relative">
                                                    <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                                    <input
                                                        type="time"
                                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm"
                                                        value={format12hTo24h(formData.outTime)}
                                                        onChange={(e) => setFormData({ ...formData, outTime: format24hTo12h(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CRE / Client Facilitator</label>
                                            <select
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm appearance-none"
                                                value={formData.creId}
                                                onChange={(e) => {
                                                    const selected = creStaff.find(s => s.id === parseInt(e.target.value));
                                                    setFormData({ 
                                                        ...formData, 
                                                        creId: e.target.value,
                                                        creName: selected ? selected.name : ''
                                                    });
                                                }}
                                            >
                                                <option value="">Select Staff...</option>
                                                {creStaff.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                                            <textarea
                                                rows="3"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none font-bold text-sm"
                                                value={formData.remarks}
                                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <motion.div 
                                    whileHover={{ scale: 1.01 }} 
                                    whileTap={{ scale: 0.99 }}
                                    className="pt-4"
                                >
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-slate-900 border-b-4 border-slate-700 hover:bg-black hover:border-slate-800 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all disabled:bg-slate-300 disabled:border-slate-200"
                                    >
                                        {isLoading ? 'Saving Entry...' : (editingEntry ? 'Update Visit Record' : 'Create Visit Record')}
                                    </button>
                                </motion.div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Duplicate Confirmation Dialog */}
            <AnimatePresence>
                {showConfirmDuplicate && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }} 
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative overflow-hidden p-10 text-center space-y-6"
                        >
                            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
                                <AlertTriangle size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Duplicate Entry?</h3>
                                <p className="text-slate-500 font-bold text-sm">
                                    An entry with this contact number already exists for the selected date. Do you want to create another one?
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={onSubmit}
                                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
                                >
                                    Yes, Create Duplicate
                                </button>
                                <button 
                                    onClick={() => setShowConfirmDuplicate(false)}
                                    className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    No, Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Entry Detail Modal */}
            <AnimatePresence>
                {isViewModalOpen && selectedEntry && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsViewModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl relative overflow-hidden" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-slate-900 px-10 py-8 flex justify-between items-center text-white">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">Visit Details</h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Client Case File</p>
                                </div>
                                <button onClick={() => setIsViewModalOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-2xl transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                                {/* Client Header Section */}
                                <div className="flex items-start gap-6 pb-8 border-b border-slate-100">
                                    <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-200">
                                        {selectedEntry.clientName.charAt(0)}
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">{selectedEntry.clientName}</h2>
                                        <div className="flex items-center gap-3 text-slate-500 font-bold">
                                            <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs uppercase tracking-widest">
                                                <Phone size={12} /> {selectedEntry.contactNumber}
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-xs uppercase tracking-widest">{selectedEntry.project || 'Untitled Project'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Information Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visit Schedule</label>
                                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <Calendar className="text-blue-500" size={18} />
                                                <span className="font-bold text-slate-700">{new Date(selectedEntry.dateOfVisit).toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">FA Team</label>
                                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <Users className="text-blue-500" size={18} />
                                                <span className="font-bold text-slate-700">{selectedEntry.faTeam}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assigned BH</label>
                                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <UserCircle2 className="text-blue-500" size={18} />
                                                <span className="font-bold text-slate-700">{selectedEntry.bh?.name || 'Unassigned'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visit Status</label>
                                            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${getVisitStatusColor(selectedEntry.visitStatus)} shadow-sm`}>
                                                <CheckCircle size={18} />
                                                <span className="font-black text-xs uppercase tracking-widest">{selectedEntry.visitStatus || 'PENDING'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Extra Details */}
                                <div className="space-y-6 pt-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Showroom</p>
                                            <p className="font-bold text-slate-700">{selectedEntry.showroom || 'Not Specified'}</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Committed Time</p>
                                            <p className="font-bold text-slate-700">{selectedEntry.tentativeTime || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-emerald-50/30 rounded-3xl border border-emerald-100">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">In Time</p>
                                            <p className="font-bold text-emerald-700">{selectedEntry.inTime || 'Not Recorded'}</p>
                                        </div>
                                        <div className="p-5 bg-rose-50/30 rounded-3xl border border-rose-100">
                                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Out Time</p>
                                            <p className="font-bold text-rose-700">{selectedEntry.outTime || 'Not Recorded'}</p>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp Review Status</p>
                                            <p className="font-bold text-slate-700">{selectedEntry.reviewSent ? 'Review Request Sent' : 'Queued / Pending (Sends after 2h)'}</p>
                                        </div>
                                        {selectedEntry.reviewSent ? (
                                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                                                <CheckCircle size={20} />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center animate-pulse">
                                                <Timer size={20} />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <MessageSquare size={12} /> Detailed Remarks
                                        </p>
                                        <p className="text-slate-600 font-medium leading-relaxed italic border-l-4 border-blue-500 pl-4 bg-white/50 py-3 rounded-r-xl">
                                            {selectedEntry.remarks || 'No remarks provided for this visit.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                                >
                                    Close Details
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WalkinHub;
