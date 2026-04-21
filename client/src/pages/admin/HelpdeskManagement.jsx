import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { getTickets, updateTicketStatus, deleteTicket, reset } from '../../features/helpdesk/helpdeskSlice';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import { 
    LifeBuoy, 
    MessageSquare, 
    Clock, 
    CheckCircle2, 
    AlertCircle,
    ChevronRight,
    Search,
    Filter,
    X,
    User,
    Check,
    Briefcase,
    Activity,
    Layers,
    Trash2
} from 'lucide-react';
import Modal from '../../components/Modal';

const HelpdeskManagement = () => {
    const dispatch = useDispatch();
    const { user: currentUser } = useSelector((state) => state.auth);
    const { tickets, isLoading, isSuccess, isError, message } = useSelector((state) => state.helpdesk);
    
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('OPEN');

    // Access Control Guard
    const canAccess = ['ADMIN', 'HR', 'BUSINESS_HEAD'].includes(currentUser?.role);
    
    useEffect(() => {
        if (canAccess) {
            dispatch(getTickets());
        }
        return () => { dispatch(reset()); };
    }, [dispatch, canAccess]);

    if (!canAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                    <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800">Access Restricted</h2>
                <p className="text-slate-500 max-w-md">Only Admin, HR, and Business Heads are authorized to access the Helpdesk management portal.</p>
            </div>
        );
    }

    useEffect(() => {
        if (isSuccess && selectedTicket) {
            toast.success('Ticket updated successfully');
            setSelectedTicket(null);
            setRemarks('');
            setNewStatus('');
        }
        if (isError && message) {
            toast.error(message);
        }
    }, [isSuccess, isError, message, selectedTicket]);

    const handleUpdate = (e) => {
        e.preventDefault();
        if (!newStatus) return toast.error('Please select a status');
        dispatch(updateTicketStatus({ 
            id: selectedTicket.id, 
            status: newStatus, 
            remarks 
        }));
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            dispatch(deleteTicket(id));
            setSelectedTicket(null);
        }
    };

    const isHrOrCoo = (user) => {
        if (!user) return false;
        if (user.role === 'HR' || user.role === 'ADMIN') return true;
        if (user.role === 'BUSINESS_HEAD' && (user.designation === 'COO' || user.designation === 'Chief Operational Officer')) return true;
        return false;
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = ticket.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'ALL' || ticket.category === filterCategory;
        const matchesStatus = filterStatus === 'ALL' || ticket.status === filterStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className="space-y-8 animate-fade-in pb-20 p-4 md:p-8 max-w-[1600px] mx-auto">
            {/* Management Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl mb-10 border border-white/5">
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-inner">
                            <Layers className="text-white" size={40} />
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Support Hub</h2>
                            <p className="text-indigo-100 font-medium text-lg max-w-md">Orchestrate resolutions and monitor employee engagement across the organization.</p>
                        </div>
                    </div>
                </div>
                
                {/* Quick Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 relative z-10">
                    {[
                        { label: 'Total Tickets', count: tickets.length, icon: Activity, color: 'bg-white/10' },
                        { label: 'Needs Action', count: tickets.filter(t => t.status === 'OPEN').length, icon: AlertCircle, color: 'bg-amber-500/20' },
                        { label: 'In Progress', count: tickets.filter(t => t.status === 'IN_PROGRESS').length, icon: Clock, color: 'bg-blue-500/20' },
                        { label: 'Resolved', count: tickets.filter(t => t.status === 'RESOLVED').length, icon: CheckCircle2, color: 'bg-emerald-500/20' },
                    ].map((stat, i) => (
                        <div key={i} className={`flex flex-col p-6 rounded-[2rem] backdrop-blur-md border border-white/10 ${stat.color} transition-transform hover:scale-105`}>
                            <div className="flex items-center justify-between mb-2">
                                <stat.icon size={20} className="text-indigo-200" />
                                <span className="text-4xl font-black tabular-nums">{stat.count}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/70">{stat.label}</span>
                        </div>
                    ))}
                </div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            </div>

            {/* Unified Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 items-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl p-4 rounded-[2.5rem] border border-white/20 dark:border-slate-800/50 shadow-sm sticky top-4 z-20">
                <div className="flex-1 min-w-[300px] relative group shrink-0 w-full lg:w-auto">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input 
                        type="text"
                        placeholder="Search by employee, subject, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 rounded-2xl border-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white dark:bg-slate-900 shadow-inner"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex-1 lg:flex-none flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl shadow-inner border border-white/20 dark:border-slate-800 shrink-0">
                        <Filter size={18} className="text-slate-400" />
                        <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 cursor-pointer min-w-[120px]"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="SALARY">Salary</option>
                            <option value="TECHNICAL">Technical</option>
                            <option value="POLICY">Policy</option>
                            <option value="WORKPLACE">Workplace</option>
                            <option value="GROWTH">Growth</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div className="flex flex-1 lg:flex-none bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`flex-1 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === status ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xl' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {status === 'ALL' ? 'Total' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                    visible: { transition: { staggerChildren: 0.05 } }
                }}
                className="grid grid-cols-1 gap-6"
            >
                {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                        <motion.div 
                            key={ticket.id} 
                            variants={{
                                hidden: { y: 20, opacity: 0 },
                                visible: { y: 0, opacity: 1 }
                            }}
                            onClick={() => {
                                setSelectedTicket(ticket);
                                setNewStatus(ticket.status);
                                setRemarks(isHrOrCoo(currentUser) ? (ticket.hrRemarks || ticket.cooRemarks || '') : (ticket.bhRemarks || ''));
                            }}
                            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col lg:flex-row items-center justify-between gap-8 hover:shadow-2xl hover:scale-[1.01] hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="flex items-center gap-6 w-full lg:w-1/4">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6 shrink-0 shadow-inner">
                                    <User size={32} />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-lg font-black text-slate-800 dark:text-white truncate tracking-tight">{ticket.user?.name || 'Unknown'}</h4>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] truncate">{ticket.user?.designation || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex-1 w-full space-y-3 border-y lg:border-y-0 lg:border-x border-slate-50 dark:border-slate-800 py-6 lg:py-0 lg:px-10">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(ticket.status)}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                    <span className="px-4 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                                        {ticket.category}
                                    </span>
                                    {ticket.type === 'PROBLEM' && (
                                        <span className="px-3 py-1 bg-rose-500 text-white rounded-full text-[8px] font-black uppercase animate-pulse">Critical</span>
                                    )}
                                </div>
                                <h5 className="text-xl font-black text-slate-700 dark:text-slate-200 tracking-tight leading-snug">{ticket.subject}</h5>
                                <p className="text-slate-400 dark:text-slate-500 text-sm line-clamp-1 italic font-medium">"{ticket.description}"</p>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-12 w-full lg:w-1/4">
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Created</p>
                                    <p className="text-xs font-black text-slate-600 dark:text-slate-400 tabular-nums">{formatDate(ticket.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                        <ChevronRight size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                    ))
                ) : (
                    <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3.5rem] p-32 text-center border-4 border-dashed border-slate-100 dark:border-slate-800">
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                            <Activity className="mx-auto text-slate-200 dark:text-slate-700 mb-8" size={64} />
                        </motion.div>
                        <h3 className="text-3xl font-black text-slate-400 dark:text-slate-600 tracking-tight mb-2">Workspace Clear</h3>
                        <p className="text-slate-400 dark:text-slate-500 font-medium max-w-xs mx-auto">No pending tickets in this category. Your service goals are on track!</p>
                    </div>
                )}
            </motion.div>

            {/* Manage Ticket Modal */}
            <AnimatePresence>
                {selectedTicket && (
                    <Modal
                        onClose={() => setSelectedTicket(null)}
                        title="Manage Helpdesk Ticket"
                    >
                        <div className="space-y-6">
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</p>
                                        <p className="font-bold text-slate-800">{selectedTicket.user?.name || 'N/A'} ({selectedTicket.user?.designation || 'N/A'})</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                                        <p className="font-bold text-slate-800">{selectedTicket.category}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</p>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">
                                        {selectedTicket.description}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Update Status</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setNewStatus(s)}
                                                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${newStatus === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200 hover:text-indigo-600'}`}
                                            >
                                                {s.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                        {isHrOrCoo(currentUser) ? 'HR/COO Remarks' : 'BH Remarks'}
                                    </label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        rows={4}
                                        placeholder="Provide resolution steps or feedback to the employee..."
                                        className="w-full bg-slate-50 border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all outline-none resize-none"
                                    />
                                </div>

                                {/* Show other remarks if present */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {selectedTicket.bhRemarks && (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">BH Remarks</p>
                                            <p className="text-[10px] text-slate-600 line-clamp-2 italic">"{selectedTicket.bhRemarks}"</p>
                                        </div>
                                    )}
                                    {selectedTicket.hrRemarks && (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">HR Remarks</p>
                                            <p className="text-[10px] text-slate-600 line-clamp-2 italic">"{selectedTicket.hrRemarks}"</p>
                                        </div>
                                    )}
                                    {selectedTicket.cooRemarks && (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 font-mono">COO Remarks</p>
                                            <p className="text-[10px] text-slate-600 line-clamp-2 italic">"{selectedTicket.cooRemarks}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTicket(null)}
                                        className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all"
                                    >
                                        Cancel
                                    </button>
                                    {currentUser.role === 'ADMIN' && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(selectedTicket.id)}
                                            className="px-6 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center gap-2"
                                            title="Delete Ticket (Admin Only)"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? 'Updating...' : <><Check size={18} /> Update Ticket</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HelpdeskManagement;
