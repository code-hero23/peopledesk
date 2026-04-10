import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getMyVouchers, createVoucher, uploadVoucherProof, reset } from '../../features/voucher/voucherSlice';
import { compressImage } from '../../utils/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Receipt, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    FileText, 
    AlertCircle,
    ChevronRight,
    Camera,
    Upload,
    IndianRupee,
    History,
    ExternalLink,
    ArrowUpRight
} from 'lucide-react';
import { toast } from 'react-toastify';

const ExpenseHub = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { vouchers, isLoading, isError, isSuccess, message } = useSelector((state) => state.voucher);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isProofOpen, setIsProofOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [showSuccessTick, setShowSuccessTick] = useState(false);

    const [formData, setFormData] = useState({
        type: 'POSTPAID',
        amount: '',
        purpose: '',
        date: new Date().toISOString().split('T')[0],
        proofFile: null
    });

    useEffect(() => {
        dispatch(getMyVouchers());
    }, [dispatch]);

    useEffect(() => {
        if (isError) toast.error(message);
        if (isSuccess && isFormOpen) {
            setShowSuccessTick(true);
            // Wait 2 seconds before closing
            setTimeout(() => {
                setShowSuccessTick(false);
                setIsFormOpen(false);
                setFormData({ 
                    type: 'POSTPAID', 
                    amount: '', 
                    purpose: '', 
                    date: new Date().toISOString().split('T')[0],
                    proofFile: null
                });
                dispatch(getMyVouchers());
                dispatch(reset());
            }, 2000);
        }
        if (isSuccess && isProofOpen) {
            toast.success('Proof uploaded and voucher completed!');
            setIsProofOpen(false);
            setProofFile(null);
            setSelectedVoucher(null);
            dispatch(getMyVouchers());
        }
    }, [isError, isSuccess, message]);

    const onSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            return toast.error('Please enter a valid amount');
        }
        if (!formData.purpose || formData.purpose.length < 5) {
            return toast.error('Please provide a detailed purpose (min 5 characters)');
        }
        
        if (formData.type === 'POSTPAID' && !formData.proofFile) {
            return toast.error('Bill/Proof is mandatory for Postpaid vouchers');
        }
        
        const data = new FormData();
        data.append('type', formData.type);
        data.append('amount', formData.amount);
        data.append('purpose', formData.purpose);
        data.append('date', formData.date);
        if (formData.proofFile) {
            try {
                const compressed = await compressImage(formData.proofFile);
                data.append('proof', compressed);
            } catch (err) {
                console.error('Compression error:', err);
                data.append('proof', formData.proofFile); // Fallback to original
            }
        }

        dispatch(createVoucher(data));
    };

    const onProofSubmit = async (e) => {
        e.preventDefault();
        if (!proofFile) return toast.error('Please select a proof file');
        
        const data = new FormData();
        try {
            const compressed = await compressImage(proofFile);
            data.append('proof', compressed);
        } catch (err) {
            console.error('Compression error:', err);
            data.append('proof', proofFile); // Fallback to original
        }
        
        dispatch(uploadVoucherProof({ id: selectedVoucher.id, formData: data }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'REJECTED': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'APPROVED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'WAITING': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getFullProofUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
        return `${baseUrl}${url}`;
    };

    const mySpent = vouchers
        .filter(v => v.status === 'COMPLETED')
        .reduce((sum, v) => sum + v.amount, 0);

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20 px-4">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        <IndianRupee size={12} /> Financial Self-Service
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-tight">Expense Hub</h1>
                    <p className="text-slate-500 font-bold text-sm md:text-lg">Manage your business expenditures with ease.</p>
                </div>
                <button
                    onClick={() => {
                        dispatch(reset());
                        setIsFormOpen(true);
                    }}
                    className="w-full md:w-auto flex items-center justify-center gap-3 bg-slate-900 border-b-4 border-slate-700 hover:bg-black hover:border-slate-800 text-white px-8 py-4 md:py-5 rounded-2xl md:rounded-[2rem] font-black text-base md:text-lg shadow-2xl transition-all active:scale-95 active:border-b-0 active:translate-y-1 group"
                >
                    <Plus size={24} className="group-hover:rotate-90 transition-transform" /> Raise New Voucher
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                        <Receipt size={28} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Vouchers</p>
                        <p className="text-4xl font-black text-slate-800">{vouchers.length}</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <FileText size={100} />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group overflow-hidden relative">
                    <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                        <CheckCircle2 size={28} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Personal Spent</p>
                        <p className="text-4xl font-black text-slate-800 tracking-tight">₹{mySpent.toLocaleString()}</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <IndianRupee size={100} />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group relative overflow-hidden">
                    <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-amber-100 group-hover:scale-110 transition-transform">
                        <Clock size={28} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Review</p>
                        <p className="text-4xl font-black text-slate-800">{vouchers.filter(v => ['PENDING', 'APPROVED'].includes(v.status) && v.status !== 'COMPLETED').length}</p>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 backdrop-blur-md">
                        <History size={28} />
                    </div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1 font-black">Success Rate</p>
                    <p className="text-4xl font-black text-white">
                        {vouchers.length > 0 ? Math.round((vouchers.filter(v => v.status === 'COMPLETED').length / vouchers.length) * 100) : 0}%
                    </p>
                    <div className="absolute top-0 right-0 p-4">
                        <ChevronRight className="text-white/20 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>

            {/* Voucher Table */}
            <div className="bg-white rounded-3xl md:rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 md:p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-500">
                            <FileText size={20} />
                        </div>
                        <h3 className="font-black text-slate-800 text-lg md:text-xl tracking-tight">Recent Activity</h3>
                    </div>
                </div>

                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                                <th className="px-10 py-6">ID</th>
                                <th className="px-10 py-6">Voucher Info</th>
                                <th className="px-10 py-6">Amount</th>
                                <th className="px-10 py-6">Current Status</th>
                                <th className="px-10 py-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {vouchers.map((voucher) => (
                                <tr key={voucher.id} className="hover:bg-slate-50/50 transition-all group">
                                    <td className="px-10 py-8 text-sm font-black text-slate-300 group-hover:text-blue-500 transition-colors">#V-{voucher.id}</td>
                                    <td className="px-10 py-8">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black ${['PREPAID', 'ADVANCE'].includes(voucher.type) ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {voucher.type}
                                                </span>
                                                <p className="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{voucher.purpose}</p>
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{new Date(voucher.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <p className="text-lg font-black text-slate-800 tracking-tighter">₹{voucher.amount.toLocaleString()}</p>
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex flex-col gap-2">
                                            <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest w-fit shadow-sm ${getStatusColor(voucher.status)}`}>
                                                {voucher.status}
                                            </span>
                                             {voucher.status === 'WAITING' && ['PREPAID', 'ADVANCE'].includes(voucher.type) && (
                                                <p className="text-[9px] font-black text-blue-500 uppercase flex items-center gap-1 animate-pulse">
                                                    <AlertCircle size={10} /> Needs Settlement Proof
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                         {voucher.status === 'WAITING' && ['PREPAID', 'ADVANCE'].includes(voucher.type) ? (
                                            <button
                                                onClick={() => { setSelectedVoucher(voucher); setIsProofOpen(true); }}
                                                className="bg-blue-600 hover:bg-black text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-100 hover:shadow-none flex items-center bg-blue-600 gap-2 ml-auto"
                                            >
                                                <Camera size={14} /> Upload Proof
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => { setSelectedVoucher(voucher); setIsViewOpen(true); }}
                                                className="p-3 text-slate-300 hover:bg-slate-100 rounded-full transition-all"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-slate-50">
                    {vouchers.map((voucher) => (
                        <div key={voucher.id} className="p-6 space-y-4 active:bg-slate-50 transition-colors" onClick={() => { setSelectedVoucher(voucher); setIsViewOpen(true); }}>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black ${['PREPAID', 'ADVANCE'].includes(voucher.type) ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {voucher.type}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-300">#V-{voucher.id}</span>
                                    </div>
                                    <p className="font-black text-slate-800 text-sm line-clamp-1">{voucher.purpose}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(voucher.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-800 text-lg">₹{voucher.amount.toLocaleString()}</p>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black border uppercase tracking-widest ml-auto mt-1 ${getStatusColor(voucher.status)}`}>
                                        {voucher.status}
                                    </span>
                                </div>
                            </div>
                            
                            {voucher.status === 'WAITING' && ['PREPAID', 'ADVANCE'].includes(voucher.type) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedVoucher(voucher); setIsProofOpen(true); }}
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Camera size={14} /> Upload Proof
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {vouchers.length === 0 && (
                    <div className="px-10 py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-10">
                            <Receipt size={60} />
                            <p className="font-black text-xl uppercase tracking-tighter">No History Found</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Raise Voucher */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFormOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-xl relative overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                            {showSuccessTick ? (
                                <div className="p-10 md:p-16 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px] md:min-h-[500px]">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                        className="w-24 h-24 md:w-32 md:h-32 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-emerald-200"
                                    >
                                        <CheckCircle2 size={60} md:size={80} strokeWidth={3} />
                                    </motion.div>
                                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Request Submitted!</h3>
                                    <p className="text-slate-500 font-bold text-sm">Your financial request has been successfully routed for approval.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-slate-900 px-6 md:px-10 py-6 md:py-8 flex justify-between items-center text-white relative">
                                <Receipt className="absolute -left-4 -bottom-4 text-white/10 w-24 h-24 rotate-12" />
                                <div className="relative z-10">
                                    <h3 className="text-xl md:text-2xl font-black tracking-tight">Financial Request</h3>
                                    <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Voucher Generation</p>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl md:rounded-2xl transition-colors relative z-10">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={onSubmit} className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[70vh] md:max-h-none">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Request Type</label>
                                        <select
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[1.25rem] focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm transition-all focus:bg-white focus:border-blue-200 cursor-pointer"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            required
                                        >
                                            <option value="PREPAID">Voucher (Company Pays First)</option>
                                            <option value="POSTPAID">Bill (Company Pays After)</option>
                                            <option value="ADVANCE">Advance (Cash)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-slate-400">Spending Date</label>
                                        <input type="date" required className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[1.25rem] focus:ring-8 focus:ring-blue-50 outline-none font-black text-xs" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Claim Amount (₹)</label>
                                    <div className="relative">
                                        <input type="number" required placeholder="0.00" className="w-full pl-12 pr-6 py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[1.5rem] focus:ring-8 focus:ring-blue-50 outline-none font-black text-2xl md:text-3xl tracking-tighter" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl md:text-2xl">₹</span>
                                    </div>
                                </div>

                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Justification / Purpose</label>
                                    <textarea required rows="3" placeholder="Detail the business purpose for this expense..." className="w-full px-6 py-4 md:py-5 bg-slate-50 border border-slate-200 rounded-2xl md:rounded-[1.5rem] focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm transition-all focus:bg-white focus:border-blue-200" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                        <span>Proof / Bill Attachment</span>
                                        {formData.type === 'POSTPAID' && <span className="text-rose-500 font-black">MANDATORY</span>}
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            required={formData.type === 'POSTPAID'}
                                            accept="image/*,.pdf"
                                            className="hidden"
                                            id="voucher-proof"
                                            onChange={(e) => setFormData({ ...formData, proofFile: e.target.files[0] })}
                                        />
                                        <label 
                                            htmlFor="voucher-proof"
                                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl md:rounded-[1.25rem] focus-within:ring-8 focus-within:ring-blue-50 outline-none font-bold text-xs flex items-center cursor-pointer hover:border-blue-400 hover:bg-white transition-all overflow-hidden"
                                        >
                                            <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors" size={18} />
                                            <span className="truncate text-slate-500">
                                                {formData.proofFile ? formData.proofFile.name : 'Select Proof (Image or PDF)...'}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="p-5 md:p-6 bg-blue-50 rounded-2xl md:rounded-3xl flex gap-4 items-start border border-blue-100">
                                    <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />
                                    <p className="text-[10px] md:text-[11px] text-blue-700 font-bold leading-relaxed">
                                        This request will follow the hierarchical approval chain via **Accounts Manager** and **COO**.
                                    </p>
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-black text-white py-5 md:py-6 rounded-2xl md:rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none">
                                    {isLoading ? 'Processing Request...' : 'Initialize Approval Chain'}
                                </button>
                            </form>
                            </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Upload Proof */}
            <AnimatePresence>
                {isProofOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProofOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl md:rounded-[3rem] shadow-2xl w-full max-w-sm relative overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 md:p-10 space-y-8">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-2xl md:rounded-3xl flex items-center justify-center text-blue-600 mx-auto border-b-4 border-blue-100 shadow-inner">
                                    <Upload size={28} md:size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Settlement Proof</h3>
                                    <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Upload receipt link for #{selectedVoucher?.id}</p>
                                </div>
                                
                                <form onSubmit={onProofSubmit} className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left ml-2">Select Proof (Image/PDF)</label>
                                        <div className="relative group">
                                            <input 
                                                type="file" 
                                                required 
                                                accept="image/*,.pdf"
                                                className="hidden" 
                                                id="settlement-proof"
                                                onChange={(e) => setProofFile(e.target.files[0])} 
                                            />
                                            <label 
                                                htmlFor="settlement-proof"
                                                className="w-full px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl md:rounded-2xl focus-within:ring-8 focus-within:ring-blue-50 outline-none font-bold text-sm flex items-center justify-between cursor-pointer hover:border-blue-400 hover:bg-white transition-all overflow-hidden"
                                            >
                                                <span className="truncate text-slate-500 text-xs">
                                                    {proofFile ? proofFile.name : 'Choose File...'}
                                                </span>
                                                <Upload size={18} className="text-slate-300 group-hover:text-blue-500" />
                                            </label>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">Complete Voucher</button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: View Details */}
            <AnimatePresence>
                {isViewOpen && selectedVoucher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsViewOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-2xl md:rounded-[3rem] shadow-2xl w-full max-w-lg relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[85vh]">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4 md:gap-5">
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl">
                                            <Receipt size={24} md:size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Voucher Details</h3>
                                            <p className="text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-widest">#V-{selectedVoucher.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsViewOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                        <XCircle size={24} md:size={28} className="text-slate-300" />
                                    </button>
                                </div>

                                <div className="bg-slate-50 p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] space-y-6 border border-slate-100">
                                    <div className="grid grid-cols-2 gap-4 md:gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${getStatusColor(selectedVoucher.status)}`}>
                                                {selectedVoucher.status}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</p>
                                            <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">₹{selectedVoucher.amount.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose</p>
                                        <p className="text-xs md:text-sm text-slate-600 font-bold leading-relaxed">{selectedVoucher.purpose}</p>
                                    </div>

                                    {selectedVoucher.proofUrl && (
                                        <div className="space-y-3 pt-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proof of Expense</p>
                                            <div className="rounded-xl md:rounded-2xl overflow-hidden border border-slate-200 bg-white group">
                                                {selectedVoucher.proofUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                                    <a href={getFullProofUrl(selectedVoucher.proofUrl)} target="_blank" rel="noopener noreferrer" className="block relative">
                                                        <img src={getFullProofUrl(selectedVoucher.proofUrl)} alt="Proof" className="w-full h-40 md:h-48 object-cover transition-all group-hover:scale-105" />
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="bg-white/90 text-slate-900 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">Open Full Image</span>
                                                        </div>
                                                    </a>
                                                ) : (
                                                    <a href={getFullProofUrl(selectedVoucher.proofUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 md:p-5 hover:bg-slate-50 transition-all">
                                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg md:rounded-xl flex items-center justify-center text-blue-600">
                                                            <ExternalLink size={20} md:size={24} />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <p className="text-xs md:text-sm font-black text-slate-800 tracking-tight">View Attachment</p>
                                                            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Opens in new tab</p>
                                                        </div>
                                                        <ArrowUpRight size={18} md:size={20} className="text-slate-300" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Workflow Remarks */}
                                    {(selectedVoucher.amRemarks || selectedVoucher.cooRemarks || selectedVoucher.adminRemarks) && (
                                        <div className="pt-4 border-t border-slate-200/50 space-y-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review Comments</p>
                                            {selectedVoucher.amRemarks && (
                                                <div className="flex gap-2 bg-white/50 p-2 rounded-lg">
                                                    <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded h-fit">AM</span>
                                                    <p className="text-[10px] md:text-xs text-slate-500 italic">"{selectedVoucher.amRemarks}"</p>
                                                </div>
                                            )}
                                            {selectedVoucher.cooRemarks && (
                                                <div className="flex gap-2 bg-white/50 p-2 rounded-lg">
                                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded h-fit">COO</span>
                                                    <p className="text-[10px] md:text-xs text-slate-500 italic">"{selectedVoucher.cooRemarks}"</p>
                                                </div>
                                            )}
                                            {selectedVoucher.adminRemarks && (
                                                <div className="flex gap-2 bg-white/50 p-2 rounded-lg">
                                                    <span className="text-[8px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded h-fit">Admin</span>
                                                    <p className="text-[10px] md:text-xs text-slate-500 italic">"{selectedVoucher.adminRemarks}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setIsViewOpen(false)} className="w-full bg-slate-900 hover:bg-black text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl transition-all active:scale-[0.98]">Close Details</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ExpenseHub;
