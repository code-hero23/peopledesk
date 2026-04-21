import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { getTickets, createTicket, deleteTicket, reset } from '../../features/helpdesk/helpdeskSlice';
import { formatDate } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import { 
    LifeBuoy, 
    Plus, 
    MessageSquare, 
    Clock, 
    CheckCircle2, 
    AlertCircle,
    ChevronRight,
    Search,
    Filter,
    X,
    Trash2
} from 'lucide-react';
import Modal from '../../components/Modal';

const Helpdesk = () => {
    const dispatch = useDispatch();
    const { tickets, isLoading, isSuccess, isError, message } = useSelector((state) => state.helpdesk);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        type: 'ISSUE',
        category: 'OTHER'
    });

    useEffect(() => {
        dispatch(getTickets());
        return () => { dispatch(reset()); };
    }, [dispatch]);

    useEffect(() => {
        if (isSuccess && isModalOpen) {
            toast.success('Ticket raised successfully');
            setIsModalOpen(false);
            setFormData({
                subject: '',
                description: '',
                type: 'ISSUE',
                category: 'OTHER'
            });
        }
        if (isError && message) {
            toast.error(message);
        }
    }, [isSuccess, isError, message]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(createTicket(formData));
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            dispatch(deleteTicket(id));
        }
    };

    const categories = [
        { value: 'SALARY', label: 'Salary & Benefits' },
        { value: 'TECHNICAL', label: 'Technical Issues' },
        { value: 'POLICY', label: 'Company Policy' },
        { value: 'WORKPLACE', label: 'Workplace & Facilities' },
        { value: 'GROWTH', label: 'Performance & Growth' },
        { value: 'OTHER', label: 'Other / Suggestions' }
    ];

    const types = [
        { value: 'ISSUE', label: 'Issue' },
        { value: 'SUGGESTION', label: 'Suggestion' },
        { value: 'PROBLEM', label: 'Problem' }
    ];

    const getStatusStyle = (status) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CLOSED': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'OPEN': return <AlertCircle size={14} />;
            case 'IN_PROGRESS': return <Clock size={14} />;
            case 'RESOLVED': return <CheckCircle2 size={14} />;
            case 'CLOSED': return <X size={14} />;
            default: return null;
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || ticket.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-8 animate-fade-in pb-20 p-4 md:p-8 max-w-[1600px] mx-auto">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-200 dark:shadow-indigo-950/20 mb-10">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-inner">
                            <LifeBuoy className="text-white" size={40} />
                        </div>
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Helpdesk Support</h2>
                            <p className="text-indigo-100 font-medium text-lg max-w-md">We're here to help. Raise your concerns, suggestions, or technical problems below.</p>
                        </div>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-3 bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black shadow-2xl transition-all text-sm uppercase tracking-widest"
                    >
                        <Plus size={20} />
                        Raise New Ticket
                    </motion.button>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex flex-col sm:flex-row gap-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-3 rounded-[2rem] border border-white/20 dark:border-slate-800/50 shadow-sm sticky top-4 z-20">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input 
                                type="text"
                                placeholder="Search tickets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 rounded-2xl border-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white/80 dark:bg-slate-900 shadow-inner"
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-900 px-6 py-2 rounded-2xl shadow-inner border border-white/20 dark:border-slate-800">
                            <Filter size={18} className="text-slate-400" />
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Status</option>
                                <option value="OPEN">Open</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="CLOSED">Closed</option>
                            </select>
                        </div>
                    </div>

                    <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.1 } }
                        }}
                        className="space-y-6"
                    >
                        {filteredTickets.length > 0 ? (
                            filteredTickets.map((ticket, index) => (
                                <motion.div 
                                    key={ticket.id}
                                    variants={{
                                        hidden: { y: 20, opacity: 0 },
                                        visible: { y: 0, opacity: 1 }
                                    }}
                                    className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:scale-[1.01] transition-all duration-500 overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex flex-wrap gap-3">
                                            <span className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${getStatusStyle(ticket.status)}`}>
                                                {getStatusIcon(ticket.status)}
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                            <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-slate-200 dark:border-slate-700">
                                                {ticket.category}
                                            </span>
                                        </div>
                                        <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 rounded-xl text-[10px] font-black tabular-nums">
                                            #{ticket.id}
                                        </div>
                                    </div>

                                    <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-3 group-hover:text-indigo-600 transition-colors leading-tight">{ticket.subject}</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2 mb-6 font-medium italic">
                                        "{ticket.description}"
                                    </p>

                                    <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            <span className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl">
                                                <Clock size={14} />
                                                {formatDate(ticket.createdAt)}
                                            </span>
                                            <span className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-xl text-indigo-600">
                                                <MessageSquare size={14} />
                                                {ticket.type}
                                            </span>
                                            {user.role === 'ADMIN' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(ticket.id);
                                                    }}
                                                    className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-100 transition-colors"
                                                    title="Delete Ticket (Admin Only)"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                        <div 
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform cursor-pointer"
                                        >
                                            Details
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>

                                    {/* Remarks preview */}
                                    {(ticket.hrRemarks || ticket.bhRemarks || ticket.cooRemarks) && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-6 p-5 bg-indigo-50/30 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/20 relative group/remark"
                                        >
                                            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-indigo-600 text-[8px] text-white font-black uppercase rounded-full">New Response</div>
                                            <p className="text-xs text-indigo-900/70 dark:text-indigo-300/60 leading-relaxed italic">
                                                "{(ticket.hrRemarks || ticket.cooRemarks || ticket.bhRemarks)}"
                                            </p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-24 border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                                <motion.div 
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                    className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-inner"
                                >
                                    <Search size={48} className="text-slate-300 dark:text-slate-600" />
                                </motion.div>
                                <h3 className="text-2xl font-black text-slate-700 dark:text-white mb-2">Workspace Clear</h3>
                                <p className="text-slate-400 max-w-xs mx-auto font-medium">No tickets matching your filters. Your helpdesk queue is looking great!</p>
                            </div>
                        )}
                    </motion.div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                                <Clock size={24} className="text-amber-500" />
                                Support Pulse
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { label: 'Total Raised', count: tickets.length, color: 'bg-indigo-500', icon: MessageSquare },
                                    { label: 'In Progress', count: tickets.filter(t => t.status === 'IN_PROGRESS').length, color: 'bg-amber-500', icon: Clock },
                                    { label: 'Resolved', count: tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length, color: 'bg-emerald-500', icon: CheckCircle2 },
                                ].map((stat, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all group/stat">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${stat.color} text-white shadow-lg shadow-indigo-200 dark:shadow-none`}>
                                                <stat.icon size={18} />
                                            </div>
                                            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.label}</span>
                                        </div>
                                        <span className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{stat.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Raise Ticket Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <Modal
                        onClose={() => setIsModalOpen(false)}
                        title="Raise New Helpdesk Ticket"
                    >
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Ticket Type</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    >
                                        {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Category</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                    >
                                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Subject</label>
                                <input
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    placeholder="Brief summary of your issue..."
                                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows={4}
                                    placeholder="Provide details about your problem or suggestion..."
                                    className="w-full bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] bg-primary hover:bg-primary-dark text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isLoading ? 'Raising Ticket...' : 'Submit Ticket'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}

                {/* View Ticket Details Modal */}
                {selectedTicket && (
                    <Modal
                        onClose={() => setSelectedTicket(null)}
                        title="Ticket Information"
                    >
                        <div className="space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(selectedTicket.status)}`}>
                                        {selectedTicket.status.replace('_', ' ')}
                                    </span>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{selectedTicket.subject}</h3>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Raised on {formatDate(selectedTicket.createdAt)} • #{selectedTicket.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
                                    <p className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-xl">{selectedTicket.category}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Initial Description</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic font-medium">"{selectedTicket.description}"</p>
                            </div>

                            {/* Management Responses */}
                            <div className="space-y-4">
                                <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest pl-1">Management Response</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedTicket.bhRemarks && (
                                        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-950 shadow-sm relative group overflow-hidden">
                                            <div className="absolute top-0 right-0 w-1 p-full bg-indigo-500" />
                                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2">BH Feedback</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{selectedTicket.bhRemarks}"</p>
                                        </div>
                                    )}
                                    {(selectedTicket.hrRemarks || selectedTicket.cooRemarks) && (
                                        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 dark:border-emerald-950 shadow-sm relative group overflow-hidden">
                                            <div className="absolute top-0 right-0 w-1 p-full bg-emerald-500" />
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Internal Resolution (HR/COO)</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{(selectedTicket.hrRemarks || selectedTicket.cooRemarks)}"</p>
                                        </div>
                                    )}
                                    {!selectedTicket.bhRemarks && !selectedTicket.hrRemarks && !selectedTicket.cooRemarks && (
                                        <div className="md:col-span-2 p-10 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                            <Clock className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={32} />
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Awaiting Management Review</p>
                                            <p className="text-[10px] text-slate-400 italic mt-1">Updates will appear here as soon as your ticket is reviewed.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedTicket(null)}
                                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl"
                            >
                                Close Preview
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Helpdesk;
