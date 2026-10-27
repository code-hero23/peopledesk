import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    getMyVouchers, 
    getManageableVouchers,
    createVoucher, 
    uploadVoucherProof, 
    approveVoucherAM,
    approveVoucherCOO,
    settleVoucher,
    reset 
} from '../../features/voucher/voucherSlice';
import { compressImage } from '../../utils/imageUtils';
import VoucherStatusFlow from '../../components/VoucherStatusFlow';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Receipt, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    FileText, 
    Camera,
    Upload,
    IndianRupee,
    ChevronRight,
    ExternalLink,
    Search,
    ShieldCheck,
    CheckCheck,
    Sparkles,
    Calendar,
    Filter,
    X,
    Eye,
    Check,
    AlertCircle,
    User,
    Wallet
} from 'lucide-react';
import { toast } from 'react-toastify';

const ExpenseHubB = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { vouchers, manageableVouchers, isLoading, isError, isSuccess, message } = useSelector((state) => state.voucher);

    // Role checks
    const userRole = (user?.role || '').toUpperCase();
    const userDesignation = (user?.designation || '').toUpperCase();
    const userEmail = (user?.email || '').toLowerCase();

    const isAM = userRole === 'ACCOUNTS_MANAGER';
    const isCOO = userRole === 'BUSINESS_HEAD' || 
                  userRole === 'COO' || 
                  userDesignation === 'COO' || 
                  userDesignation.includes('CHIEF OPERATIONAL OFFICER') || 
                  userDesignation === 'BH' || 
                  userEmail === 'bh@cookscape.com' || 
                  userEmail === 'designs.cookscape@gmail.com';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const isPrivileged = isAM || isCOO || isAdmin;

    // View scope: if privileged, toggle between "All Manageable" and "My Vouchers"
    const [viewScope, setViewScope] = useState(isPrivileged ? 'ALL' : 'MY');

    useEffect(() => {
        if (isPrivileged) {
            setViewScope('ALL');
        }
    }, [isPrivileged]);

    // Active card filter: 'ALL' | 'RAISED' | 'PENDING' | 'PAID' | 'SETTLED'
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isProofOpen, setIsProofOpen] = useState(false);
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [proofFile, setProofFile] = useState(null);
    const [settleProofFile, setSettleProofFile] = useState(null);
    const [settleRemarks, setSettleRemarks] = useState('');
    const [actionRemarks, setActionRemarks] = useState('');
    const [rejectModalData, setRejectModalData] = useState(null); // { id, stage: 'AM' | 'COO' }
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [showSuccessTick, setShowSuccessTick] = useState(false);

    // Form data state
    const [formData, setFormData] = useState({
        type: 'OFFICE_EXPENSES',
        amount: '',
        purpose: '',
        date: new Date().toLocaleDateString('en-CA'),
        proofFile: null
    });

    const refreshData = () => {
        dispatch(getMyVouchers());
        if (isPrivileged) {
            dispatch(getManageableVouchers());
        }
    };

    useEffect(() => {
        refreshData();
    }, [dispatch, isPrivileged]);

    useEffect(() => {
        if (isError) toast.error(message);
        if (isSuccess && isFormOpen) {
            setShowSuccessTick(true);
            setTimeout(() => {
                setShowSuccessTick(false);
                setIsFormOpen(false);
                setFormData({ 
                    type: 'OFFICE_EXPENSES', 
                    amount: '', 
                    purpose: '', 
                    date: new Date().toLocaleDateString('en-CA'),
                    proofFile: null
                });
                refreshData();
                dispatch(reset());
            }, 1800);
        }
    }, [isError, isSuccess, message]);

    // Handle Raise Voucher Form Submit
    const onSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            return toast.error('Please enter a valid amount');
        }
        if (!formData.purpose || formData.purpose.trim().length < 5) {
            return toast.error('Please provide a detailed purpose (min 5 characters)');
        }
        
        if (['POSTPAID', 'COMPANY_PAY_AFTER'].includes(formData.type) && !formData.proofFile) {
            return toast.error('Bill/Proof is mandatory for Postpaid vouchers');
        }
        
        const data = new FormData();
        data.append('type', formData.type);
        data.append('amount', formData.amount);
        data.append('purpose', formData.purpose.trim());
        data.append('date', formData.date);
        
        if (formData.proofFile) {
            try {
                const compressed = await compressImage(formData.proofFile);
                data.append('proof', compressed);
            } catch (err) {
                console.error('Compression error:', err);
                data.append('proof', formData.proofFile);
            }
        }

        dispatch(createVoucher(data));
    };

    // Handle Proof Upload for Paid/Waiting vouchers
    const onProofSubmit = async (e) => {
        e.preventDefault();
        if (!proofFile) return toast.error('Please select a proof file');
        
        const data = new FormData();
        try {
            const compressed = await compressImage(proofFile);
            data.append('proof', compressed);
        } catch (err) {
            console.error('Compression error:', err);
            data.append('proof', proofFile);
        }
        
        try {
            await dispatch(uploadVoucherProof({ id: selectedVoucher.id, formData: data })).unwrap();
            toast.success('Bill proof uploaded successfully! Voucher updated.');
            setIsProofOpen(false);
            setProofFile(null);
            setSelectedVoucher(null);
            refreshData();
        } catch (err) {
            toast.error(err || 'Failed to upload proof');
        }
    };

    // AM Actions
    const handleAMApprove = async (voucherId) => {
        try {
            await dispatch(approveVoucherAM({ id: voucherId, status: 'APPROVED' })).unwrap();
            toast.success('Approved by AM! Voucher forwarded to COO.');
            refreshData();
        } catch (err) {
            toast.error(err || 'AM approval failed');
        }
    };

    const handleAMReject = async () => {
        if (!rejectModalData) return;
        try {
            await dispatch(approveVoucherAM({ id: rejectModalData.id, status: 'REJECTED', remarks: actionRemarks })).unwrap();
            toast.error('Voucher rejected by AM.');
            setRejectModalData(null);
            setActionRemarks('');
            refreshData();
        } catch (err) {
            toast.error(err || 'AM reject failed');
        }
    };

    // COO Actions
    const handleCOOApprove = async (voucherId) => {
        try {
            await dispatch(approveVoucherCOO({ id: voucherId, status: 'APPROVED' })).unwrap();
            toast.success('Approved by COO! Status changed to PAID for all.');
            refreshData();
        } catch (err) {
            toast.error(err || 'COO approval failed');
        }
    };

    const handleCOOReject = async () => {
        if (!rejectModalData) return;
        try {
            await dispatch(approveVoucherCOO({ id: rejectModalData.id, status: 'REJECTED', remarks: actionRemarks })).unwrap();
            toast.error('Voucher rejected by COO.');
            setRejectModalData(null);
            setActionRemarks('');
            refreshData();
        } catch (err) {
            toast.error(err || 'COO reject failed');
        }
    };

    // Settle Action (AM confirms cash given to employee & attaches proof)
    const handleSettleConfirm = async (e) => {
        e.preventDefault();
        if (!selectedVoucher) return;

        const formData = new FormData();
        if (settleRemarks) formData.append('remarks', settleRemarks);
        if (settleProofFile) {
            try {
                const compressed = await compressImage(settleProofFile);
                formData.append('proof', compressed);
            } catch (err) {
                formData.append('proof', settleProofFile);
            }
        }

        try {
            await dispatch(settleVoucher({ id: selectedVoucher.id, formData, remarks: settleRemarks })).unwrap();
            toast.success('Voucher settled! Cash confirmed given to employee.');
            setIsSettleModalOpen(false);
            setSelectedVoucher(null);
            setSettleProofFile(null);
            setSettleRemarks('');
            refreshData();
        } catch (err) {
            toast.error(err || 'Failed to settle voucher');
        }
    };

    // Display status helper adhering strictly to required flow:
    // 1. RAISED
    // 2. APPROVED BY AM (or REJECTED BY AM)
    // 3. PAID (once COO approves or both approve)
    // 4. SETTLED (after cash given to employee and proof reflected)
    const getDisplayStatus = (voucher) => {
        if (!voucher) return '';
        if (voucher.amStatus === 'REJECTED') return 'REJECTED BY AM';
        if (voucher.cooStatus === 'REJECTED') return 'REJECTED BY COO';
        if (voucher.status === 'REJECTED') return 'REJECTED';
        if (voucher.status === 'COMPLETED') return 'SETTLED';
        if (voucher.status === 'PAID') return 'PAID';
        if (voucher.amStatus === 'APPROVED' && voucher.cooStatus === 'PENDING') return 'APPROVED BY AM';
        if (voucher.amStatus === 'PENDING') return 'RAISED';
        return 'PENDING';
    };

    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case 'SETTLED':
            case 'COMPLETED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'PAID':
                return 'bg-teal-100 text-teal-800 border-teal-300';
            case 'APPROVED BY AM':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'RAISED':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'REJECTED BY AM':
            case 'REJECTED BY COO':
            case 'REJECTED': 
                return 'bg-rose-100 text-rose-700 border-rose-300';
            default: 
                return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'OFFICE_EXPENSES':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'PREPAID':
            case 'COMPANY_PAYS_FIRST':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'POSTPAID':
            case 'COMPANY_PAY_AFTER':
                return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'ADVANCE':
            case 'SALARY_ADVANCE':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'CLIENT_REFUND':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'VENDOR_PAYMENT':
                return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            case 'BH_VOUCHER':
                return 'bg-violet-50 text-violet-700 border-violet-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getFullProofUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
        return `${baseUrl}${url}`;
    };

    // Determine working list of vouchers based on scope
    const workingVouchers = useMemo(() => {
        if (isPrivileged && viewScope === 'ALL') {
            return manageableVouchers || [];
        }
        return vouchers || [];
    }, [isPrivileged, viewScope, manageableVouchers, vouchers]);

    // 4 Small Cards Metrics Calculation:
    // 1. Raised Voucher: newly created vouchers awaiting AM review
    // 2. Pending Voucher: approved by AM, pending COO review
    // 3. Paid Voucher: approved by both AM & COO (status PAID)
    // 4. Settled Voucher: amount given to employee & proof verified (status COMPLETED / SETTLED)
    const metrics = useMemo(() => {
        const raisedList = workingVouchers.filter(v => v.amStatus === 'PENDING' && v.status !== 'REJECTED');
        const pendingList = workingVouchers.filter(v => v.amStatus === 'APPROVED' && v.cooStatus === 'PENDING' && v.status !== 'REJECTED');
        const paidList = workingVouchers.filter(v => v.status === 'PAID');
        const settledList = workingVouchers.filter(v => v.status === 'COMPLETED');

        return {
            raised: {
                count: raisedList.length,
                amount: raisedList.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
            },
            pending: {
                count: pendingList.length,
                amount: pendingList.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
            },
            paid: {
                count: paidList.length,
                amount: paidList.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
            },
            settled: {
                count: settledList.length,
                amount: settledList.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
            }
        };
    }, [workingVouchers]);

    // Filtered Vouchers List based on active toggle card and search
    const filteredVouchers = useMemo(() => {
        return workingVouchers.filter((v) => {
            let matchesFilter = true;

            if (activeFilter === 'RAISED') {
                matchesFilter = v.amStatus === 'PENDING' && v.status !== 'REJECTED';
            } else if (activeFilter === 'PENDING') {
                matchesFilter = v.amStatus === 'APPROVED' && v.cooStatus === 'PENDING' && v.status !== 'REJECTED';
            } else if (activeFilter === 'PAID') {
                matchesFilter = v.status === 'PAID';
            } else if (activeFilter === 'SETTLED') {
                matchesFilter = v.status === 'COMPLETED';
            }

            if (!matchesFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const idMatch = `#v-${v.id}`.toLowerCase().includes(q) || String(v.id).includes(q);
                const purposeMatch = (v.purpose || '').toLowerCase().includes(q);
                const typeMatch = (v.type || '').toLowerCase().includes(q);
                const userMatch = (v.user?.name || '').toLowerCase().includes(q);
                const amountMatch = String(v.amount).includes(q);
                return idMatch || purposeMatch || typeMatch || userMatch || amountMatch;
            }

            return true;
        });
    }, [workingVouchers, activeFilter, searchQuery]);

    // Handle toggle switch click on cards
    const handleToggleCard = (filterKey) => {
        if (activeFilter === filterKey) {
            setActiveFilter('ALL'); // Reset if clicked again
        } else {
            setActiveFilter(filterKey);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 px-4 sm:px-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-black uppercase tracking-wider border border-indigo-100">
                        <Sparkles size={13} className="text-indigo-600" /> Expense Hub B
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 tracking-tight">
                        Expense Hub B
                    </h1>
                    <p className="text-slate-500 font-medium text-sm md:text-base">
                        Voucher Lifecycle: Raised ➔ Approved by AM ➔ Paid (COO Approved) ➔ Settled.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Privileged Scope Switch */}
                    {isPrivileged && (
                        <div className="bg-slate-100 p-1 rounded-2xl flex items-center text-xs font-black">
                            <button
                                onClick={() => setViewScope('ALL')}
                                className={`px-4 py-2.5 rounded-xl transition-all ${
                                    viewScope === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                All Vouchers
                            </button>
                            <button
                                onClick={() => setViewScope('MY')}
                                className={`px-4 py-2.5 rounded-xl transition-all ${
                                    viewScope === 'MY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                My Vouchers
                            </button>
                        </div>
                    )}

                    {/* Raise Voucher Button */}
                    <button
                        onClick={() => {
                            dispatch(reset());
                            setIsFormOpen(true);
                        }}
                        className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black text-sm md:text-base shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all active:scale-95 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Raise Voucher</span>
                    </button>
                </div>
            </div>

            {/* 4 Small Cards with Interactive Toggle Button for Each */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* 1. Raised Voucher Card */}
                <div 
                    onClick={() => handleToggleCard('RAISED')}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden group select-none ${
                        activeFilter === 'RAISED'
                            ? 'bg-blue-50/70 border-blue-500 shadow-lg shadow-blue-500/10 ring-2 ring-blue-400'
                            : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                activeFilter === 'RAISED' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-100 text-blue-700'
                            }`}>
                                <Receipt size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                    Raised Voucher
                                </h3>
                            </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div className="flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); handleToggleCard('RAISED'); }}>
                            <span className="text-[10px] font-bold text-slate-400">
                                {activeFilter === 'RAISED' ? 'Active' : 'Filter'}
                            </span>
                            <div 
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    activeFilter === 'RAISED' ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'
                                }`}
                            >
                                <motion.div 
                                    layout 
                                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 mt-2">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                {metrics.raised.count}
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Awaiting AM
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700 font-black text-base sm:text-lg">
                            <IndianRupee size={15} className="text-blue-600" />
                            <span>{metrics.raised.amount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <Receipt size={70} />
                    </div>
                </div>

                {/* 2. Pending Voucher Card (Approved by AM, waiting COO) */}
                <div 
                    onClick={() => handleToggleCard('PENDING')}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden group select-none ${
                        activeFilter === 'PENDING'
                            ? 'bg-purple-50/70 border-purple-500 shadow-lg shadow-purple-500/10 ring-2 ring-purple-400'
                            : 'bg-white border-slate-200/80 hover:border-purple-300 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                activeFilter === 'PENDING' ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-100 text-purple-700'
                            }`}>
                                <Clock size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                    Pending Voucher
                                </h3>
                            </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div className="flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); handleToggleCard('PENDING'); }}>
                            <span className="text-[10px] font-bold text-slate-400">
                                {activeFilter === 'PENDING' ? 'Active' : 'Filter'}
                            </span>
                            <div 
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    activeFilter === 'PENDING' ? 'bg-purple-600 justify-end' : 'bg-slate-200 justify-start'
                                }`}
                            >
                                <motion.div 
                                    layout 
                                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 mt-2">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                {metrics.pending.count}
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Waiting COO
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700 font-black text-base sm:text-lg">
                            <IndianRupee size={15} className="text-purple-600" />
                            <span>{metrics.pending.amount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <Clock size={70} />
                    </div>
                </div>

                {/* 3. Paid Voucher Card (Approved by both AM & COO) */}
                <div 
                    onClick={() => handleToggleCard('PAID')}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden group select-none ${
                        activeFilter === 'PAID'
                            ? 'bg-teal-50/70 border-teal-500 shadow-lg shadow-teal-500/10 ring-2 ring-teal-400'
                            : 'bg-white border-slate-200/80 hover:border-teal-300 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                activeFilter === 'PAID' ? 'bg-teal-600 text-white shadow-md' : 'bg-teal-100 text-teal-700'
                            }`}>
                                <CheckCircle2 size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                    Paid Voucher
                                </h3>
                            </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div className="flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); handleToggleCard('PAID'); }}>
                            <span className="text-[10px] font-bold text-slate-400">
                                {activeFilter === 'PAID' ? 'Active' : 'Filter'}
                            </span>
                            <div 
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    activeFilter === 'PAID' ? 'bg-teal-600 justify-end' : 'bg-slate-200 justify-start'
                                }`}
                            >
                                <motion.div 
                                    layout 
                                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 mt-2">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                {metrics.paid.count}
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Approved For All
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700 font-black text-base sm:text-lg">
                            <IndianRupee size={15} className="text-teal-600" />
                            <span>{metrics.paid.amount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <CheckCircle2 size={70} />
                    </div>
                </div>

                {/* 4. Settled Voucher Card (Amount given & proof verified) */}
                <div 
                    onClick={() => handleToggleCard('SETTLED')}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden group select-none ${
                        activeFilter === 'SETTLED'
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400'
                            : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                                activeFilter === 'SETTLED' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                    Settled Voucher
                                </h3>
                            </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div className="flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); handleToggleCard('SETTLED'); }}>
                            <span className="text-[10px] font-bold text-slate-400">
                                {activeFilter === 'SETTLED' ? 'Active' : 'Filter'}
                            </span>
                            <div 
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    activeFilter === 'SETTLED' ? 'bg-emerald-600 justify-end' : 'bg-slate-200 justify-start'
                                }`}
                            >
                                <motion.div 
                                    layout 
                                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 mt-2">
                        <div className="flex items-baseline justify-between">
                            <span className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                                {metrics.settled.count}
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                Completed
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-700 font-black text-base sm:text-lg">
                            <IndianRupee size={15} className="text-emerald-600" />
                            <span>{metrics.settled.amount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                        <ShieldCheck size={70} />
                    </div>
                </div>
            </div>

            {/* Filter Status Bar & Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Showing:</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-black">
                        {activeFilter === 'ALL' && 'All Vouchers'}
                        {activeFilter === 'RAISED' && 'Raised Vouchers'}
                        {activeFilter === 'PENDING' && 'Pending Vouchers (Waiting COO)'}
                        {activeFilter === 'PAID' && 'Paid Vouchers'}
                        {activeFilter === 'SETTLED' && 'Settled Vouchers'}
                        <span className="text-slate-400">({filteredVouchers.length})</span>
                    </span>
                    {activeFilter !== 'ALL' && (
                        <button
                            onClick={() => setActiveFilter('ALL')}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-2 transition-colors"
                        >
                            <X size={13} /> Reset Filter
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[240px] sm:w-72">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search ID, employee, purpose..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none transition-all"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Vouchers Table Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-base sm:text-lg tracking-tight">
                                Voucher Records
                            </h3>
                            <p className="text-[11px] font-bold text-slate-400">
                                Click any row to view workflow details or take review action
                            </p>
                        </div>
                    </div>
                </div>

                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Employee & Type</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status & Approval Flow</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredVouchers.map((voucher) => {
                                const displayStatus = getDisplayStatus(voucher);
                                const canAMAct = isAM && voucher.amStatus === 'PENDING' && voucher.status !== 'REJECTED';
                                const canCOOAct = isCOO && voucher.amStatus === 'APPROVED' && voucher.cooStatus === 'PENDING' && voucher.status !== 'REJECTED';
                                const canSettle = (isAM || isAdmin) && voucher.status === 'PAID';
                                const canUploadProof = (voucher.status === 'PAID' || voucher.status === 'WAITING') && !voucher.proofUrl;

                                return (
                                    <tr 
                                        key={voucher.id} 
                                        onClick={() => { setSelectedVoucher(voucher); setIsViewOpen(true); }}
                                        className="hover:bg-slate-50/70 transition-all cursor-pointer group"
                                    >
                                        <td className="px-6 py-5 text-sm font-black text-slate-400 group-hover:text-blue-600 transition-colors">
                                            #V-{voucher.id}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1 max-w-md">
                                                <div className="flex items-center gap-2">
                                                    {voucher.user?.name && (
                                                        <span className="font-black text-xs text-slate-900 flex items-center gap-1">
                                                            <User size={12} className="text-slate-400" />
                                                            {voucher.user.name}
                                                        </span>
                                                    )}
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${getTypeColor(voucher.type)}`}>
                                                        {(voucher.type || 'OFFICE_EXPENSES').replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                    {voucher.purpose}
                                                </p>
                                                <p className="text-[11px] text-slate-400 font-medium">
                                                    {new Date(voucher.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-base font-black text-slate-800 tracking-tight">
                                                ₹{Number(voucher.amount).toLocaleString('en-IN')}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="w-56 space-y-1">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(displayStatus)}`}>
                                                    {displayStatus}
                                                </span>
                                                <VoucherStatusFlow voucher={voucher} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {/* AM Approval Actions */}
                                                {canAMAct && (
                                                    <>
                                                        <button
                                                            onClick={() => handleAMApprove(voucher.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1"
                                                        >
                                                            <Check size={12} /> Approve (AM)
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectModalData({ id: voucher.id, stage: 'AM' })}
                                                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border border-rose-200"
                                                        >
                                                            <X size={12} /> Reject
                                                        </button>
                                                    </>
                                                )}

                                                {/* COO Approval Actions */}
                                                {canCOOAct && (
                                                    <>
                                                        <button
                                                            onClick={() => handleCOOApprove(voucher.id)}
                                                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1"
                                                        >
                                                            <Check size={12} /> Approve (COO)
                                                        </button>
                                                        <button
                                                            onClick={() => setRejectModalData({ id: voucher.id, stage: 'COO' })}
                                                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border border-rose-200"
                                                        >
                                                            <X size={12} /> Reject
                                                        </button>
                                                    </>
                                                )}

                                                {/* AM Settle Action on Paid Vouchers */}
                                                {canSettle && (
                                                    <button
                                                        onClick={() => { setSelectedVoucher(voucher); setIsSettleModalOpen(true); }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-md shadow-emerald-200 flex items-center gap-1.5"
                                                    >
                                                        <ShieldCheck size={13} /> Settle Voucher
                                                    </button>
                                                )}

                                                {/* Upload Proof Action if Paid & Missing Proof */}
                                                {canUploadProof && !canSettle && (
                                                    <button
                                                        onClick={() => { setSelectedVoucher(voucher); setIsProofOpen(true); }}
                                                        className="bg-blue-600 hover:bg-black text-white px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5"
                                                    >
                                                        <Camera size={13} /> Upload Proof
                                                    </button>
                                                )}

                                                {/* View Details Eye Button */}
                                                <button 
                                                    onClick={() => { setSelectedVoucher(voucher); setIsViewOpen(true); }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {filteredVouchers.map((voucher) => {
                        const displayStatus = getDisplayStatus(voucher);
                        const canAMAct = isAM && voucher.amStatus === 'PENDING' && voucher.status !== 'REJECTED';
                        const canCOOAct = isCOO && voucher.amStatus === 'APPROVED' && voucher.cooStatus === 'PENDING' && voucher.status !== 'REJECTED';
                        const canSettle = (isAM || isAdmin) && voucher.status === 'PAID';
                        const canUploadProof = (voucher.status === 'PAID' || voucher.status === 'WAITING') && !voucher.proofUrl;

                        return (
                            <div 
                                key={voucher.id} 
                                onClick={() => { setSelectedVoucher(voucher); setIsViewOpen(true); }}
                                className="p-4 sm:p-5 space-y-3 active:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            {voucher.user?.name && (
                                                <span className="font-black text-xs text-slate-800">
                                                    {voucher.user.name}
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${getTypeColor(voucher.type)}`}>
                                                {(voucher.type || 'OFFICE_EXPENSES').replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-400">#V-{voucher.id}</span>
                                        </div>
                                        <p className="font-bold text-slate-800 text-sm line-clamp-1">{voucher.purpose}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">
                                            {new Date(voucher.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-slate-800 text-base">₹{Number(voucher.amount).toLocaleString('en-IN')}</p>
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider mt-1 ${getStatusBadgeStyle(displayStatus)}`}>
                                            {displayStatus}
                                        </span>
                                    </div>
                                </div>

                                {/* Mobile Actions */}
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                                    {canAMAct && (
                                        <>
                                            <button
                                                onClick={() => handleAMApprove(voucher.id)}
                                                className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1"
                                            >
                                                <Check size={12} /> Approve (AM)
                                            </button>
                                            <button
                                                onClick={() => setRejectModalData({ id: voucher.id, stage: 'AM' })}
                                                className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl font-black text-[10px] uppercase border border-rose-200"
                                            >
                                                <X size={12} /> Reject
                                            </button>
                                        </>
                                    )}

                                    {canCOOAct && (
                                        <>
                                            <button
                                                onClick={() => handleCOOApprove(voucher.id)}
                                                className="flex-1 bg-purple-600 text-white py-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1"
                                            >
                                                <Check size={12} /> Approve (COO)
                                            </button>
                                            <button
                                                onClick={() => setRejectModalData({ id: voucher.id, stage: 'COO' })}
                                                className="bg-rose-50 text-rose-700 px-3 py-2 rounded-xl font-black text-[10px] uppercase border border-rose-200"
                                            >
                                                <X size={12} /> Reject
                                            </button>
                                        </>
                                    )}

                                    {canSettle && (
                                        <button
                                            onClick={() => { setSelectedVoucher(voucher); setIsSettleModalOpen(true); }}
                                            className="w-full bg-emerald-600 text-white py-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5"
                                        >
                                            <ShieldCheck size={14} /> Settle Voucher (Give Cash & Proof)
                                        </button>
                                    )}

                                    {canUploadProof && !canSettle && (
                                        <button
                                            onClick={() => { setSelectedVoucher(voucher); setIsProofOpen(true); }}
                                            className="w-full bg-blue-600 text-white py-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5"
                                        >
                                            <Camera size={14} /> Upload Proof
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredVouchers.length === 0 && (
                    <div className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-300">
                            <Receipt size={48} strokeWidth={1.5} />
                            <p className="font-black text-base uppercase tracking-wider text-slate-400">
                                No Vouchers Found
                            </p>
                            <p className="text-xs text-slate-400 max-w-sm">
                                {searchQuery || activeFilter !== 'ALL' 
                                    ? 'No records match your active filter or search query.' 
                                    : 'No financial vouchers recorded yet. Click "Raise Voucher" above to submit a voucher for petty cash.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Raise Voucher Form */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setIsFormOpen(false)} 
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 15 }} 
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-xl relative overflow-hidden max-h-[92vh] flex flex-col z-10" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            {showSuccessTick ? (
                                <div className="p-8 md:p-14 flex flex-col items-center justify-center text-center space-y-5 min-h-[360px]">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", stiffness: 220, damping: 20 }}
                                        className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-100"
                                    >
                                        <CheckCircle2 size={46} strokeWidth={2.5} />
                                    </motion.div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                        Voucher Raised Successfully!
                                    </h3>
                                    <p className="text-slate-500 font-medium text-xs sm:text-sm max-w-sm">
                                        Status: RAISED. Your voucher is now in the review queue for Accounts Manager (AM).
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Modal Header */}
                                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 flex justify-between items-center text-white flex-shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                                                <Receipt size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg sm:text-xl font-black tracking-tight">Raise Voucher</h3>
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                                    Expense Hub B • Petty Cash & Expenses
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setIsFormOpen(false)} 
                                            className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors text-slate-300 hover:text-white"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Modal Body Form */}
                                    <form onSubmit={onSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Voucher Type */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Expense Category
                                                </label>
                                                <select
                                                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none font-bold text-xs transition-all cursor-pointer"
                                                    value={formData.type}
                                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                    required
                                                >
                                                    <option value="OFFICE_EXPENSES">💵 Petty Cash / Office Expenses</option>
                                                    <option value="COMPANY_PAYS_FIRST">1. Company Pays First</option>
                                                    <option value="COMPANY_PAY_AFTER">2. Company Pay After</option>
                                                    <option value="CLIENT_REFUND">3. Client Refund</option>
                                                    <option value="VENDOR_PAYMENT">4. Vendor Payment</option>
                                                    <option value="BH_VOUCHER">5. BH Vouchers</option>
                                                    <option value="SALARY_ADVANCE">6. Salary Advance</option>
                                                    <option value="POSTPAID">POSTPAID (Legacy)</option>
                                                    <option value="PREPAID">PREPAID (Legacy)</option>
                                                </select>
                                            </div>

                                            {/* Spending Date */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Spending Date
                                                </label>
                                                <input 
                                                    type="date" 
                                                    required 
                                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none font-bold text-xs" 
                                                    value={formData.date} 
                                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                                                />
                                            </div>
                                        </div>

                                        {/* Amount Field */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Claim Amount (₹)
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    required 
                                                    step="0.01"
                                                    min="1"
                                                    placeholder="0.00" 
                                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none font-black text-2xl tracking-tight" 
                                                    value={formData.amount} 
                                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
                                                />
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">
                                                    ₹
                                                </span>
                                            </div>
                                        </div>

                                        {/* Purpose / Justification */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Justification / Purpose
                                            </label>
                                            <textarea 
                                                required 
                                                rows="3" 
                                                placeholder="Detail the petty cash purpose or business expense reason..." 
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none font-medium text-xs sm:text-sm transition-all resize-none" 
                                                value={formData.purpose} 
                                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} 
                                            />
                                        </div>

                                        {/* Bill / Proof Attachment */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    Bill / Proof Attachment
                                                </label>
                                                {['POSTPAID', 'COMPANY_PAY_AFTER'].includes(formData.type) && (
                                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                                        Mandatory
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    required={['POSTPAID', 'COMPANY_PAY_AFTER'].includes(formData.type)}
                                                    accept="image/*,.pdf"
                                                    className="hidden"
                                                    id="voucher-proof-b"
                                                    onChange={(e) => setFormData({ ...formData, proofFile: e.target.files[0] })}
                                                />
                                                <label 
                                                    htmlFor="voucher-proof-b"
                                                    className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl focus-within:ring-4 focus-within:ring-blue-50 outline-none text-xs flex items-center justify-between cursor-pointer hover:border-blue-400 hover:bg-white transition-all overflow-hidden"
                                                >
                                                    <div className="flex items-center gap-3 truncate">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                            <Upload size={16} />
                                                        </div>
                                                        <span className="font-bold text-slate-700 truncate">
                                                            {formData.proofFile ? formData.proofFile.name : 'Select or capture bill photo (Images/PDF)'}
                                                        </span>
                                                    </div>
                                                    {formData.proofFile && (
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.preventDefault(); setFormData({ ...formData, proofFile: null }); }}
                                                            className="text-slate-400 hover:text-rose-500 p-1"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    )}
                                                </label>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-black text-sm tracking-wider uppercase shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
                                        >
                                            {isLoading ? 'Submitting Voucher...' : 'Confirm & Raise Voucher'}
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Settle Voucher (AM gives cash & verifies proof) */}
            <AnimatePresence>
                {isSettleModalOpen && selectedVoucher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setIsSettleModalOpen(false)} 
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 15 }} 
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden z-10 p-6 space-y-5" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center border-b pb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <ShieldCheck size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">Settle Voucher</h3>
                                        <p className="text-xs text-slate-400">#V-{selectedVoucher.id} • ₹{Number(selectedVoucher.amount).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsSettleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSettleConfirm} className="space-y-4">
                                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-emerald-900 font-medium leading-relaxed">
                                        <strong>Settlement Confirmation:</strong> Confirm that the amount of <strong>₹{Number(selectedVoucher.amount).toLocaleString('en-IN')}</strong> has been given to the employee and proof is verified. Status will reflect as <strong>SETTLED</strong>.
                                    </div>
                                </div>

                                {selectedVoucher.proofUrl ? (
                                    <div className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600">Existing Proof Attached:</span>
                                        <a 
                                            href={getFullProofUrl(selectedVoucher.proofUrl)} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="text-blue-600 font-bold flex items-center gap-1 hover:underline"
                                        >
                                            <ExternalLink size={13} /> View Bill
                                        </a>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Attach Bill / Settlement Receipt (Optional)
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            className="hidden"
                                            id="settle-proof-input"
                                            onChange={(e) => setSettleProofFile(e.target.files[0])}
                                        />
                                        <label
                                            htmlFor="settle-proof-input"
                                            className="w-full p-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/20 transition-all"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Upload size={16} className="text-emerald-600 flex-shrink-0" />
                                                <span className="font-bold text-slate-700 truncate">
                                                    {settleProofFile ? settleProofFile.name : 'Upload bill or receipt'}
                                                </span>
                                            </div>
                                            {settleProofFile && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setSettleProofFile(null); }}
                                                    className="text-slate-400 hover:text-rose-500"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </label>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Settlement Remarks (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Cash handed over in person, note etc."
                                        value={settleRemarks}
                                        onChange={(e) => setSettleRemarks(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium focus:ring-4 focus:ring-emerald-50 outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                                >
                                    {isLoading ? 'Settling...' : 'Confirm Cash Given & Settle'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Rejection Reason */}
            <AnimatePresence>
                {rejectModalData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setRejectModalData(null)} 
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }} 
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden z-10 p-6 space-y-4" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 text-rose-600">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                                    <XCircle size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800">
                                        Reject Voucher ({rejectModalData.stage})
                                    </h3>
                                    <p className="text-[11px] text-slate-400">#V-{rejectModalData.id}</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Reason for Rejection
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Provide the reason for rejecting this voucher..."
                                    value={actionRemarks}
                                    onChange={(e) => setActionRemarks(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-medium focus:ring-4 focus:ring-rose-50 outline-none resize-none"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setRejectModalData(null)}
                                    className="flex-1 py-2.5 rounded-xl border text-xs font-black text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={rejectModalData.stage === 'AM' ? handleAMReject : handleCOOReject}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider"
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: View Voucher Details */}
            <AnimatePresence>
                {isViewOpen && selectedVoucher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setIsViewOpen(false)} 
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 15 }} 
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative overflow-hidden max-h-[90vh] flex flex-col z-10" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white flex-shrink-0">
                                <div>
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                        Voucher Details
                                    </span>
                                    <h3 className="text-xl font-black">#V-{selectedVoucher.id}</h3>
                                </div>
                                <button 
                                    onClick={() => setIsViewOpen(false)} 
                                    className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/10"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto flex-1">
                                {/* Amount & Status Header */}
                                <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Amount</p>
                                        <p className="text-2xl font-black text-slate-800 tracking-tight">
                                            ₹{Number(selectedVoucher.amount).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(getDisplayStatus(selectedVoucher))}`}>
                                        {getDisplayStatus(selectedVoucher)}
                                    </span>
                                </div>

                                {/* Flow Timeline */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifecycle Flow</p>
                                    <VoucherStatusFlow voucher={selectedVoucher} />
                                </div>

                                {/* Details List */}
                                <div className="space-y-3 text-xs">
                                    {selectedVoucher.user?.name && (
                                        <div className="flex justify-between py-2 border-b border-slate-100">
                                            <span className="text-slate-400 font-bold">Raised By:</span>
                                            <span className="font-black text-slate-800">
                                                {selectedVoucher.user.name} ({selectedVoucher.user.designation || 'Employee'})
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-400 font-bold">Category Type:</span>
                                        <span className="font-black text-slate-800 uppercase">
                                            {(selectedVoucher.type || '').replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <span className="text-slate-400 font-bold">Date of Expense:</span>
                                        <span className="font-bold text-slate-800">
                                            {new Date(selectedVoucher.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                        </span>
                                    </div>
                                    <div className="space-y-1 py-2 border-b border-slate-100">
                                        <span className="text-slate-400 font-bold">Purpose / Details:</span>
                                        <p className="font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl mt-1">
                                            {selectedVoucher.purpose}
                                        </p>
                                    </div>

                                    {/* Remarks if any */}
                                    {selectedVoucher.amRemarks && (
                                        <div className="py-2 border-b border-slate-100">
                                            <span className="text-slate-400 font-bold">AM Remarks:</span>
                                            <p className="font-medium text-slate-700 mt-0.5">{selectedVoucher.amRemarks}</p>
                                        </div>
                                    )}
                                    {selectedVoucher.cooRemarks && (
                                        <div className="py-2 border-b border-slate-100">
                                            <span className="text-slate-400 font-bold">COO Remarks:</span>
                                            <p className="font-medium text-slate-700 mt-0.5">{selectedVoucher.cooRemarks}</p>
                                        </div>
                                    )}
                                    {selectedVoucher.adminRemarks && (
                                        <div className="py-2 border-b border-slate-100">
                                            <span className="text-slate-400 font-bold">Settlement Log:</span>
                                            <p className="font-medium text-slate-700 mt-0.5">{selectedVoucher.adminRemarks}</p>
                                        </div>
                                    )}

                                    {/* Proof Image / Document */}
                                    {selectedVoucher.proofUrl && (
                                        <div className="space-y-2 pt-1">
                                            <span className="text-slate-400 font-bold">Attached Proof:</span>
                                            <div className="rounded-xl overflow-hidden border border-slate-200 relative group">
                                                <img 
                                                    src={getFullProofUrl(selectedVoucher.proofUrl)} 
                                                    alt="Voucher Bill Proof" 
                                                    className="w-full max-h-56 object-cover bg-slate-50" 
                                                />
                                                <a 
                                                    href={getFullProofUrl(selectedVoucher.proofUrl)} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs"
                                                >
                                                    <ExternalLink size={16} /> Open Full Document
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Upload Proof */}
            <AnimatePresence>
                {isProofOpen && selectedVoucher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setIsProofOpen(false)} 
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 15 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 15 }} 
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden z-10 p-6 space-y-5" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">Upload Bill Proof</h3>
                                    <p className="text-xs text-slate-400">#V-{selectedVoucher.id} • ₹{selectedVoucher.amount}</p>
                                </div>
                                <button onClick={() => setIsProofOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={onProofSubmit} className="space-y-4">
                                <input
                                    type="file"
                                    required
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    id="upload-proof-input"
                                    onChange={(e) => setProofFile(e.target.files[0])}
                                />
                                <label
                                    htmlFor="upload-proof-input"
                                    className="w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                                >
                                    <Upload size={24} className="text-blue-600 mb-2" />
                                    <span className="font-bold text-xs text-slate-700">
                                        {proofFile ? proofFile.name : 'Click to select bill photo or receipt'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, or PDF</span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                                >
                                    {isLoading ? 'Uploading...' : 'Submit Proof & Settle'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ExpenseHubB;
