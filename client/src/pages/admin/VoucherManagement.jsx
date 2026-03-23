import { useEffect, useState } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { 
    getManageableVouchers, 
    approveVoucherAM, 
    approveVoucherCOO, 
    getFinanceSummary, 
    getSpentHistory,
    getDepositHistory,
    addCash,
    addAdminNote,
    createVoucher,
    toggleCarpenterImpact,
    deleteVoucher,
    reset 
} from '../../features/voucher/voucherSlice';
import {
    getCarpenterRecords,
    createCarpenterRecord,
    updateCarpenterRecord,
    deleteCarpenterRecord,
    reset as resetCarpenter
} from '../../features/carpenter/carpenterSlice';
import { 
    CheckCircle2, 
    XCircle, 
    MessageSquare, 
    DollarSign, 
    ArrowUpRight,
    User,
    Receipt,
    History,
    Plus,
    BarChart3,
    Wallet,
    TrendingUp,
    PieChart,
    Clock,
    PlusCircle,
    Camera,
    Download,
    RefreshCcw,
    ShieldAlert,
    Hammer,
    Search,
    Filter,
    Calendar,
    X,
    Trash2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const VoucherManagement = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { 
        manageableVouchers, 
        financeSummary, 
        spentHistory, 
        depositHistory,
        isLoading, 
        isError, 
        message 
    } = useSelector((state) => state.voucher);
    const {
        records: carpenterRecords,
        loading: carpenterLoading,
        error: carpenterError
    } = useSelector((state) => state.carpenter);

    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [view, setView] = useState('pending'); // 'pending', 'history', 'deposits', or 'carpenter'
    const [showAddCash, setShowAddCash] = useState(false);
    const [cashAmount, setCashAmount] = useState('');
    const [cashSource, setCashSource] = useState('');
    const [cashReason, setCashReason] = useState('');
    
    // Raise Voucher for AM
    const [showRaiseModal, setShowRaiseModal] = useState(false);
    const [showSuccessTick, setShowSuccessTick] = useState(false);
    const [raiseData, setRaiseData] = useState({
        type: 'POSTPAID',
        amount: '',
        purpose: '',
        date: new Date().toISOString().split('T')[0],
        proofFile: null
    });

    // Reset Cycle Modal
    const [showWipeModal, setShowWipeModal] = useState(false);
    const [wipeConfirmText, setWipeConfirmText] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isWiping, setIsWiping] = useState(false);
    
    // History Filters State
    const [historySearch, setHistorySearch] = useState('');
    const [historyStatus, setHistoryStatus] = useState('ALL');
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');

    // Carpenter Hub State
    const [showCarpenterModal, setShowCarpenterModal] = useState(false);
    const [editingCarpenterRecord, setEditingCarpenterRecord] = useState(null);
    const [carpenterSearch, setCarpenterSearch] = useState('');
    const [carpenterData, setCarpenterData] = useState({
        aeName: '',
        clientName: '',
        siteName: '',
        carpenterName: '',
        workOrderValue: '',
        cookscapeRate: '',
        advance: '',
        remarks: '',
        status: 'On process-90%'
    });

    // Helper to check for COO designation if role is BUSINESS_HEAD
    const isCOO = (user) => {
        if (!user) return false;
        if (user.role === 'ADMIN' || user.role === 'ACCOUNTS_MANAGER') return true;
        if (user.role === 'BUSINESS_HEAD' && (user.designation === 'COO' || user.designation === 'Chief Operational Officer')) return true;
        return false;
    };

    useEffect(() => {
        if (isCOO(user)) {
            dispatch(getManageableVouchers());
            dispatch(getFinanceSummary());
            dispatch(getSpentHistory());
            dispatch(getDepositHistory());
            dispatch(getCarpenterRecords());
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (isError) toast.error(message);
    }, [isError, message]);

    const handleCarpenterHubClick = () => {
        setView('carpenter');
    };

    const handleDeleteVoucher = (id) => {
        if (window.confirm('Are you certain you want to permanently delete this voucher? If it was already approved, the funds will be automatically restored to the budget.')) {
            dispatch(deleteVoucher(id));
            if (selectedVoucher?.id === id) setSelectedVoucher(null);
            toast.success('Voucher deleted and finances adjusted');
        }
    };

    const handleCarpenterSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCarpenterRecord) {
                await dispatch(updateCarpenterRecord({ id: editingCarpenterRecord.id, data: carpenterData })).unwrap();
                toast.success('Record updated successfully');
            } else {
                await dispatch(createCarpenterRecord(carpenterData)).unwrap();
                toast.success('Record added successfully');
            }
            setShowCarpenterModal(false);
            setEditingCarpenterRecord(null);
            setCarpenterData({
                aeName: '',
                clientName: '',
                siteName: '',
                carpenterName: '',
                workOrderValue: '',
                cookscapeRate: '',
                advance: '',
                remarks: '',
                status: 'On process-90%'
            });
        } catch (err) {
            toast.error(err);
        }
    };

    const handleDeleteCarpenter = async (id) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            try {
                await dispatch(deleteCarpenterRecord(id)).unwrap();
                toast.success('Record deleted successfully');
            } catch (err) {
                toast.error(err);
            }
        }
    };

    const handleEditCarpenter = (record) => {
        setEditingCarpenterRecord(record);
        setCarpenterData({
            aeName: record.aeName,
            clientName: record.clientName,
            siteName: record.siteName,
            carpenterName: record.carpenterName,
            workOrderValue: record.workOrderValue,
            cookscapeRate: record.cookscapeRate,
            advance: record.advance,
            remarks: record.remarks || '',
            status: record.status || 'On process-90%'
        });
        setShowCarpenterModal(true);
    };

    // Derived filtered history
    const filteredHistory = spentHistory.filter(item => {
        const matchesSearch = 
            item.user.name.toLowerCase().includes(historySearch.toLowerCase()) ||
            item.purpose.toLowerCase().includes(historySearch.toLowerCase()) ||
            item.type.toLowerCase().includes(historySearch.toLowerCase()) ||
            item.amount.toString().includes(historySearch);
            
        const matchesStatus = historyStatus === 'ALL' || item.status === historyStatus;
        
        const itemDate = new Date(item.updatedAt);
        const matchesStartDate = !historyStartDate || itemDate >= new Date(historyStartDate);
        const matchesEndDate = !historyEndDate || itemDate <= new Date(historyEndDate + 'T23:59:59');

        return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
    });

    const handleAction = async (status) => {
        const payload = { id: selectedVoucher.id, status, remarks };
        
        try {
            if (user.role === 'ACCOUNTS_MANAGER') {
                await dispatch(approveVoucherAM(payload)).unwrap();
            } else if (user.role === 'BUSINESS_HEAD' && isCOO(user)) {
                await dispatch(approveVoucherCOO(payload)).unwrap();
            } else if (user.role === 'ADMIN') {
                // Admin can act as either AM or COO depending on current status
                if (selectedVoucher.amStatus === 'PENDING') {
                    await dispatch(approveVoucherAM(payload)).unwrap();
                } else {
                    await dispatch(approveVoucherCOO(payload)).unwrap();
                }
            }
            
            toast.success(`Voucher ${status.toLowerCase()} successfully`);
            setSelectedVoucher(null);
            setRemarks('');
            dispatch(getFinanceSummary());
            dispatch(getSpentHistory());
        } catch (err) {
            toast.error(err);
        }
    };

    const getFullProofUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
        return `${baseUrl}${url}`;
    };

    const handleAddCash = async (e) => {
        e.preventDefault();
        if (!cashAmount || !cashSource || !cashReason) {
            return toast.error('Amount, Source and Reason are required');
        }
        try {
            await dispatch(addCash({ amount: cashAmount, source: cashSource, reason: cashReason })).unwrap();
            toast.success('Funds added successfully');
            setShowAddCash(false);
            setCashAmount('');
            setCashSource('');
            setCashReason('');
            dispatch(getFinanceSummary());
            dispatch(getDepositHistory());
        } catch (err) {
            toast.error(err);
        }
    };

    const handleAdminNote = async () => {
        try {
            await dispatch(addAdminNote({ id: selectedVoucher.id, remarks })).unwrap();
            toast.success('Admin note added successfully');
            setSelectedVoucher(null);
            setRemarks('');
            dispatch(getManageableVouchers());
        } catch (err) {
            toast.error(err);
        }
    };

    const handleRaiseVoucher = async (e) => {
        e.preventDefault();
        if (!raiseData.amount || parseFloat(raiseData.amount) <= 0) {
            return toast.error('Please enter a valid amount');
        }
        if (!raiseData.purpose || raiseData.purpose.length < 5) {
            return toast.error('Please provide a detailed purpose (min 5 characters)');
        }
        if (raiseData.type === 'POSTPAID' && !raiseData.proofFile) {
            return toast.error('Bill/Proof is mandatory for Postpaid vouchers');
        }
        
        try {
            const data = new FormData();
            data.append('type', raiseData.type);
            data.append('amount', raiseData.amount);
            data.append('purpose', raiseData.purpose);
            data.append('date', raiseData.date);
            if (raiseData.proofFile) {
                data.append('proof', raiseData.proofFile);
            }

            await dispatch(createVoucher(data)).unwrap();
            setShowSuccessTick(true);
            setTimeout(() => {
                setShowSuccessTick(false);
                setShowRaiseModal(false);
                setRaiseData({
                    type: 'POSTPAID',
                    amount: '',
                    purpose: '',
                    date: new Date().toISOString().split('T')[0],
                    proofFile: null
                });
                dispatch(getManageableVouchers());
            }, 2000);
        } catch (err) {
            toast.error(err);
        }
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const token = user.token;
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/finance/export`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = `Expense_Hub_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Report exported successfully');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleWipe = async () => {
        if (wipeConfirmText !== 'RESET') {
            return toast.error("Please type 'RESET' to confirm");
        }
        
        try {
            setIsWiping(true);
            const token = user.token;
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/finance/wipe`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Wipe failed');
            
            toast.success('Accounting cycle reset successfully');
            setShowWipeModal(false);
            setWipeConfirmText('');
            dispatch(getFinanceSummary());
            dispatch(getSpentHistory());
            dispatch(getDepositHistory());
            dispatch(getManageableVouchers());
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsWiping(false);
        }
    };


    const handleExportCarpenter = async () => {
        try {
            const token = user.token;
            const config = { 
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            };
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/carpenter/export`, config);
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'CarpenterRecords.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export records');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-end justify-between w-full">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight">Financial Oversight</h1>
                        <p className="text-slate-500 font-medium">Manage budgets and approve operational expenses</p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleExport}
                            disabled={isExporting}
                            className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg border border-slate-200 flex items-center gap-3 disabled:opacity-50"
                        >
                            <Download size={20} className={isExporting ? 'animate-bounce' : ''} /> 
                            <span className="hidden lg:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                        </button>

                        {user.role === 'ADMIN' && (
                            <button 
                                onClick={() => setShowWipeModal(true)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg border border-rose-100 flex items-center gap-3"
                            >
                                <RefreshCcw size={20} />
                                <span className="hidden lg:inline">Reset Cycle</span>
                            </button>
                        )}

                        {user.role === 'ACCOUNTS_MANAGER' && (
                            <button 
                                onClick={() => {
                                    dispatch(reset());
                                    setShowRaiseModal(true);
                                }}
                                className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-200 border border-slate-900 flex items-center gap-3 animate-pulse-subtle"
                            >
                                <PlusCircle size={20} /> <span className="hidden lg:inline">Raise Request</span>
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 ml-auto">
                    <button 
                        onClick={() => setView('pending')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Pending Approvals
                    </button>
                    <button 
                        onClick={() => setView('history')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Spent History
                    </button>
                    <button 
                        onClick={() => setView('deposits')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'deposits' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Deposits
                    </button>
                    <button 
                        onClick={() => setView('carpenter')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${view === 'carpenter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Carpenter Hub
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                            <Wallet size={24} />
                        </div>
                        {isCOO(user) && (
                            <button 
                                onClick={() => setShowAddCash(true)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                                title="Add Funds"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Cash / Budget</p>
                    <p className="text-2xl font-black text-slate-800">₹{financeSummary?.currentCash?.toLocaleString() || '0'}</p>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -5 }} 
                    onClick={() => setView('history')}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group cursor-pointer hover:border-rose-200 transition-all"
                >
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-4 transition-colors group-hover:bg-rose-600 group-hover:text-white">
                        <TrendingUp size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spent</p>
                    <p className="text-2xl font-black text-slate-800">₹{financeSummary?.spent?.toLocaleString() || '0'}</p>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                            <PieChart size={24} />
                        </div>
                        {isCOO(user) && (
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Carpenter Hub Impact</span>
                                <button 
                                    onClick={() => dispatch(toggleCarpenterImpact())}
                                    className={`w-10 h-5 rounded-full transition-all relative ${financeSummary?.carpenterImpactEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                                    title={financeSummary?.carpenterImpactEnabled ? 'Click to disable carpenter payments impact' : 'Click to enable carpenter payments impact'}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${financeSummary?.carpenterImpactEnabled ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Balance</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-slate-800">₹{financeSummary?.balance?.toLocaleString() || '0'}</p>
                        {financeSummary?.carpenterImpactEnabled && (
                            <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                                Adjusted
                            </span>
                        )}
                    </div>
                </motion.div>

                <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                        <Clock size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Pipeline</p>
                    <p className="text-2xl font-black text-slate-800">₹{financeSummary?.pending?.toLocaleString() || '0'}</p>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -5 }} 
                    onClick={handleCarpenterHubClick}
                    className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group cursor-pointer hover:border-blue-200 transition-all"
                >
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600 mb-4 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <Hammer size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carpenter Hub</p>
                    <p className="text-sm font-black text-blue-600 mt-1 italic group-hover:text-blue-700 transition-colors">Manage Records</p>
                </motion.div>
            </div>

            <AnimatePresence mode="wait">
                {view === 'pending' ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        key="pending"
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 size={20} className="text-blue-500" />
                            <h2 className="text-xl font-black text-slate-800">Pending Requests</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {manageableVouchers.map((voucher) => (
                                <div 
                                    key={voucher.id}
                                    className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all p-8 flex flex-col lg:flex-row items-center justify-between gap-8 group"
                                >
                                    <div className="flex items-center gap-6 w-full lg:w-1/4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <User size={32} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{voucher.user.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{voucher.user.designation}</p>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{voucher.type}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full text-center lg:text-left border-y lg:border-y-0 lg:border-x border-slate-100 py-6 lg:py-0 lg:px-12">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Purpose of Expense</p>
                                        <p className="text-slate-600 font-bold leading-relaxed">{voucher.purpose}</p>
                                    </div>

                                    <div className="flex items-center justify-between lg:justify-end gap-12 w-full lg:w-1/4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                                            <p className="text-xl font-black text-slate-800 tracking-tight">₹{voucher.amount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {user.role === 'ADMIN' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteVoucher(voucher.id);
                                                    }}
                                                    className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all"
                                                    title="Delete Request"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setSelectedVoucher(voucher)}
                                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 shadow-lg shadow-slate-200 hover:shadow-blue-200 transition-all active:scale-95"
                                            >
                                                Review
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {manageableVouchers.length === 0 && (
                                <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 shadow-sm mb-2">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <div>
                                        <p className="text-slate-800 font-black text-2xl tracking-tight">Queue Empty</p>
                                        <p className="text-slate-400 font-medium max-w-xs mx-auto">You've cleared all pending vouchers for your level.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : view === 'history' ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        key="history"
                        className="space-y-4"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                <History size={20} className="text-emerald-500" />
                                <h2 className="text-xl font-black text-slate-800">Spent History</h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search repairs, names, amounts..."
                                        className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-50 outline-none w-64 transition-all"
                                        value={historySearch}
                                        onChange={(e) => setHistorySearch(e.target.value)}
                                    />
                                    {historySearch && (
                                        <button 
                                            onClick={() => setHistorySearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Status Filter */}
                                <div className="relative">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select 
                                        className="pl-11 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-50 outline-none appearance-none cursor-pointer min-w-[140px]"
                                        value={historyStatus}
                                        onChange={(e) => setHistoryStatus(e.target.value)}
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="WAITING">Waiting</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="REJECTED">Rejected</option>
                                    </select>
                                </div>

                                {/* Date Range */}
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-1.5">
                                    <Calendar size={14} className="text-slate-400" />
                                    <input 
                                        type="date" 
                                        className="text-[10px] font-bold outline-none bg-transparent"
                                        value={historyStartDate}
                                        onChange={(e) => setHistoryStartDate(e.target.value)}
                                    />
                                    <span className="text-slate-300 text-[10px] font-black">TO</span>
                                    <input 
                                        type="date" 
                                        className="text-[10px] font-bold outline-none bg-transparent"
                                        value={historyEndDate}
                                        onChange={(e) => setHistoryEndDate(e.target.value)}
                                    />
                                    {(historyStartDate || historyEndDate) && (
                                        <button 
                                            onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); }}
                                            className="ml-1 text-slate-300 hover:text-rose-500"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-8 py-6">Date</th>
                                        <th className="px-8 py-6">Employee</th>
                                        <th className="px-8 py-6">Type / Purpose</th>
                                        <th className="px-8 py-6">Status</th>
                                        <th className="px-8 py-6 text-right">Amount / Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-5 text-xs font-bold text-slate-400">
                                                {new Date(item.updatedAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                        {item.user.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800">{item.user.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{item.user.designation}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">{item.type}</p>
                                                    <p className="text-sm text-slate-600 font-medium line-clamp-1">{item.purpose}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                    item.status === 'WAITING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                                    item.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    item.status === 'PENDING' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    item.status === 'APPROVED' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                                }`}>
                                                    {item.status === 'WAITING' ? 'Advance Issued' : item.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right flex flex-col items-end gap-2">
                                                <p className="text-sm font-black text-slate-800 group-hover:text-rose-500 transition-colors">
                                                    -₹{item.amount.toLocaleString()}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {user.role === 'ADMIN' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteVoucher(item.id);
                                                            }}
                                                            className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                                                            title="Delete Voucher"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setSelectedVoucher(item)}
                                                        className="bg-white hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200 hover:border-slate-900 px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm w-fit"
                                                    >
                                                        View Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                                                {spentHistory.length === 0 ? 'No spending history recorded yet' : 'No matching records found for active filters'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : view === 'deposits' ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        key="deposits"
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet size={20} className="text-blue-500" />
                            <h2 className="text-xl font-black text-slate-800">Deposit History</h2>
                        </div>
                        
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-8 py-6">Date</th>
                                        <th className="px-8 py-6">Reason / Source</th>
                                        <th className="px-8 py-6">Added By</th>
                                        <th className="px-8 py-6 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {depositHistory.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-5 text-xs font-bold text-slate-400">
                                                {new Date(item.addedAt).toLocaleDateString()} {new Date(item.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <p className="text-sm font-black text-slate-800">{item.reason || 'No reason provided'}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.source}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                                        {item.addedBy.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-800">{item.addedBy.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{item.addedBy.designation}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <p className="text-sm font-black text-emerald-500">
                                                    +₹{item.amount.toLocaleString()}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                    {depositHistory.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                                                No deposit history recorded yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : view === 'carpenter' ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        key="carpenter"
                        className="space-y-4"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                <Hammer size={20} className="text-blue-500" />
                                <h2 className="text-xl font-black text-slate-800">Carpenter Hub</h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search AE, Client, Site..."
                                        className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-50 outline-none w-64 transition-all"
                                        value={carpenterSearch}
                                        onChange={(e) => setCarpenterSearch(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={handleExportCarpenter}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    <Download size={16} /> Export
                                </button>
                                <button 
                                    onClick={() => {
                                        setEditingCarpenterRecord(null);
                                        setCarpenterData({
                                            aeName: '',
                                            clientName: '',
                                            siteName: '',
                                            carpenterName: '',
                                            workOrderValue: '',
                                            cookscapeRate: '',
                                            advance: '',
                                            remarks: '',
                                            status: 'On process-90%'
                                        });
                                        setShowCarpenterModal(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                                >
                                    <Plus size={16} /> Add Record
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-x-auto">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-6">AE Name</th>
                                        <th className="px-6 py-6">Client / Site</th>
                                        <th className="px-6 py-6">Carpenter</th>
                                        <th className="px-6 py-6">WO Value</th>
                                        <th className="px-6 py-6">Leo Sir (10%)</th>
                                        <th className="px-6 py-6">CS Rate</th>
                                        <th className="px-6 py-6">Advance</th>
                                        <th className="px-6 py-6">Balance</th>
                                        <th className="px-6 py-6">Status</th>
                                        <th className="px-6 py-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(carpenterRecords || [])
                                        .filter(r => 
                                            r.aeName?.toLowerCase().includes(carpenterSearch.toLowerCase()) ||
                                            r.clientName?.toLowerCase().includes(carpenterSearch.toLowerCase()) ||
                                            r.siteName?.toLowerCase().includes(carpenterSearch.toLowerCase()) ||
                                            r.carpenterName?.toLowerCase().includes(carpenterSearch.toLowerCase())
                                        )
                                        .map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-6 py-5">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                    item.aeName?.toLowerCase() === 'balaji' ? 'bg-orange-100 text-orange-600' :
                                                    item.aeName?.toLowerCase() === 'rajesh' ? 'bg-purple-100 text-purple-600' :
                                                    item.aeName?.toLowerCase() === 'vijay' ? 'bg-cyan-100 text-cyan-600' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {item.aeName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-xs font-black text-slate-800">{item.clientName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{item.siteName}</p>
                                            </td>
                                            <td className="px-6 py-5 text-xs font-bold text-slate-600">
                                                {item.carpenterName}
                                            </td>
                                            <td className="px-6 py-5 text-xs font-black text-slate-800">
                                                ₹{item.workOrderValue.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-xs font-black text-rose-500">
                                                ₹{item.leoSirRate.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-xs font-black text-slate-800">
                                                ₹{item.cookscapeRate.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-xs font-black text-blue-600">
                                                ₹{item.advance.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-xs font-black text-emerald-600">
                                                ₹{item.balance.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">
                                                {item.status}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEditCarpenter(item)}
                                                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                                                    >
                                                        <PlusCircle size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCarpenter(item.id)}
                                                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(carpenterRecords || []).length === 0 && (
                                        <tr>
                                            <td colSpan="10" className="px-6 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                                                No carpenter records found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <AnimatePresence>
                {selectedVoucher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedVoucher(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-10 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                                            <Receipt size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Review Request</h3>
                                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Voucher #V-{selectedVoucher.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedVoucher(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                        <XCircle size={28} className="text-slate-300" />
                                    </button>
                                </div>

                                <div className="space-y-4 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                                    <DollarSign size={80} className="absolute -right-4 -bottom-4 text-slate-100 -rotate-12" />
                                    <div className="relative z-10 space-y-6">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested By</p>
                                                <p className="font-black text-slate-800">{selectedVoucher.user.name}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Amount</p>
                                                <p className="text-2xl font-black text-blue-600">₹{selectedVoucher.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose of Expense</p>
                                            <p className="text-sm text-slate-600 font-bold leading-relaxed">{selectedVoucher.purpose}</p>
                                        </div>

                                        {selectedVoucher.proofUrl && (
                                            <div className="space-y-2 pt-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attachment / Proof</p>
                                                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                                                    {selectedVoucher.proofUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                                        <a href={getFullProofUrl(selectedVoucher.proofUrl)} target="_blank" rel="noopener noreferrer" className="block group relative">
                                                            <img 
                                                                src={getFullProofUrl(selectedVoucher.proofUrl)} 
                                                                alt="Proof" 
                                                                className="w-full h-32 object-cover transition-all group-hover:scale-105" 
                                                            />
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="bg-white/90 text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">View Full Image</span>
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <a 
                                                            href={getFullProofUrl(selectedVoucher.proofUrl)} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-all group"
                                                        >
                                                            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                                                                <PlusCircle size={20} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-xs font-black text-slate-800">Document Proof (PDF/Other)</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Click to open in new tab</p>
                                                            </div>
                                                            <ArrowUpRight size={16} className="text-slate-300" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {(selectedVoucher.amRemarks || selectedVoucher.cooRemarks || selectedVoucher.adminRemarks) && (
                                            <div className="pt-4 mt-4 border-t border-slate-200/50 space-y-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Comments</p>
                                                {selectedVoucher.amRemarks && (
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">AM</span>
                                                        <p className="text-xs text-slate-500 italic">"{selectedVoucher.amRemarks}"</p>
                                                    </div>
                                                )}
                                                {selectedVoucher.cooRemarks && (
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">COO</span>
                                                        <p className="text-xs text-slate-500 italic">"{selectedVoucher.cooRemarks}"</p>
                                                    </div>
                                                )}
                                                {selectedVoucher.adminRemarks && (
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Admin</span>
                                                        <p className="text-xs text-slate-500 italic">"{selectedVoucher.adminRemarks}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {view === 'pending' ? (
                                    <>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <MessageSquare size={12} /> Approval Remarks
                                            </label>
                                            <textarea
                                                rows="3"
                                                placeholder="Add context for your decision..."
                                                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm transition-all focus:bg-white focus:border-blue-200"
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            {/* Unified Approval Buttons for AM, COO, and ADMIN */}
                                            {((user.role === 'ACCOUNTS_MANAGER' && selectedVoucher.amStatus === 'PENDING') || 
                                              (user.role === 'BUSINESS_HEAD' && isCOO(user) && selectedVoucher.amStatus === 'APPROVED' && selectedVoucher.cooStatus === 'PENDING') ||
                                              (user.role === 'ADMIN' && (selectedVoucher.amStatus === 'PENDING' || selectedVoucher.cooStatus === 'PENDING'))) && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction('REJECTED')}
                                                        className="flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-rose-500 border-2 border-rose-100 hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-[0.98]"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction('APPROVED')}
                                                        className="flex-[1.5] py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                    >
                                                        {selectedVoucher.amStatus === 'PENDING' ? 'AM Approval' : 'COO Approval'} <ArrowUpRight size={18} />
                                                    </button>
                                                </>
                                            )}
                                            
                                            {/* Admin Note - Always show for Admin as an additional action or if already approved */}
                                            {user.role === 'ADMIN' && (
                                                <button
                                                    onClick={handleAdminNote}
                                                    className="flex-1 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                    {selectedVoucher.amStatus !== 'PENDING' && selectedVoucher.cooStatus !== 'PENDING' ? 'Update Admin Note' : 'Add Note Only'}
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        {user.role === 'ADMIN' && (
                                            <button
                                                onClick={() => handleDeleteVoucher(selectedVoucher.id)}
                                                className="p-5 border-2 border-rose-100 text-rose-500 hover:bg-rose-50 rounded-[1.5rem] transition-all"
                                                title="Delete Voucher"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setSelectedVoucher(null)}
                                            className="grow py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
                                        >
                                            Close Details
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {showAddCash && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddCash(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={handleAddCash} className="p-8 space-y-6 text-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto shadow-inner">
                                    <Wallet size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">Add Cash</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Top up operational budget</p>
                                </div>
                                 <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest inline-block ml-1">Funding Amount</label>
                                    <input
                                        type="number"
                                        required
                                        autoFocus
                                        placeholder="₹ 0.00"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-black text-2xl tracking-tighter"
                                        value={cashAmount}
                                        onChange={(e) => setCashAmount(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest inline-block ml-1">Source of Funds</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Bank Transfer, Cash"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm transition-all focus:bg-white"
                                        value={cashSource}
                                        onChange={(e) => setCashSource(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest inline-block ml-1">Reason for Deposit</label>
                                    <textarea 
                                        required 
                                        rows="3"
                                        placeholder="Why are these funds being added?" 
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm transition-all focus:bg-white" 
                                        value={cashReason} 
                                        onChange={(e) => setCashReason(e.target.value)} 
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 mt-4"
                                >
                                    Confirm Deposit
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showWipeModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWipeModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-10 space-y-8 text-center">
                            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                <ShieldAlert size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Danger Zone</h3>
                                <p className="text-slate-500 font-medium mt-2">This will permanently delete all Vouchers and Deposits, and reset the current balance to zero. This action cannot be undone.</p>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left ml-2">Type "RESET" to confirm</p>
                                <input 
                                    type="text" 
                                    placeholder="RESET"
                                    className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-300 focus:bg-white outline-none font-black text-center text-rose-600 transition-all"
                                    value={wipeConfirmText}
                                    onChange={(e) => setWipeConfirmText(e.target.value.toUpperCase())}
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => setShowWipeModal(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleWipe}
                                    disabled={wipeConfirmText !== 'RESET' || isWiping}
                                    className={`flex-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl transition-all active:scale-95 ${wipeConfirmText === 'RESET' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-200 cursor-not-allowed text-slate-400 opacity-50'}`}
                                >
                                    {isWiping ? 'Resetting...' : 'Reset Now'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {showRaiseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRaiseModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {showSuccessTick ? (
                            <div className="p-16 flex flex-col items-center justify-center text-center space-y-6 min-h-[500px]">
                                <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    className="w-32 h-32 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-emerald-200"
                                >
                                    <CheckCircle2 size={80} strokeWidth={3} />
                                </motion.div>
                                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Request Submitted!</h3>
                                <p className="text-slate-500 font-bold">Your financial request has been successfully routed for approval.</p>
                            </div>
                        ) : (
                        <form onSubmit={handleRaiseVoucher} className="p-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                                        <Receipt size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Raise New Request</h3>
                                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Submit for COO Review</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowRaiseModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <XCircle size={28} className="text-slate-300" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Request Type</label>
                                    <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm cursor-pointer" value={raiseData.type} onChange={(e) => setRaiseData({ ...raiseData, type: e.target.value })}>
                                        <option value="PREPAID">Voucher (Company Pays First)</option>
                                        <option value="POSTPAID">Bill (Company Pays After)</option>
                                        <option value="ADVANCE">Advance (Cash)</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                                    <input type="number" required placeholder="₹ 0.00" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-black text-sm" value={raiseData.amount} onChange={(e) => setRaiseData({ ...raiseData, amount: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose / Reason</label>
                                <textarea required rows="3" placeholder="Explain the business need..." className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" value={raiseData.purpose} onChange={(e) => setRaiseData({ ...raiseData, purpose: e.target.value })} />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                    <span>Proof / Bill Attachment</span>
                                    {raiseData.type === 'POSTPAID' && <span className="text-rose-500 font-black">MANDATORY</span>}
                                </label>
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        required={raiseData.type === 'POSTPAID'} 
                                        accept="image/*,.pdf"
                                        className="hidden"
                                        id="am-voucher-proof"
                                        onChange={(e) => setRaiseData({ ...raiseData, proofFile: e.target.files[0] })}
                                    />
                                    <label 
                                        htmlFor="am-voucher-proof"
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl focus-within:ring-8 focus-within:ring-blue-50 outline-none font-bold text-xs flex items-center cursor-pointer hover:border-blue-400 hover:bg-white transition-all overflow-hidden"
                                    >
                                        <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors" size={18} />
                                        <span className="truncate text-slate-500">
                                            {raiseData.proofFile ? raiseData.proofFile.name : 'Select Proof (Image or PDF)...'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">
                                Submit for Approval
                            </button>
                        </form>
                        )}
                    </motion.div>
                </div>
            )}
            {/* Carpenter Hub Modal */}
            <AnimatePresence>
                {showCarpenterModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCarpenterModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={handleCarpenterSubmit} className="p-10 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                                            <Hammer size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                                {editingCarpenterRecord ? 'Edit Carpenter Record' : 'Add Carpenter Record'}
                                            </h3>
                                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Project & Payment Details</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setShowCarpenterModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                        <XCircle size={28} className="text-slate-300" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AE Name</label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="e.g. Balaji, Rajesh" 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                            value={carpenterData.aeName} 
                                            onChange={(e) => setCarpenterData({ ...carpenterData, aeName: e.target.value })} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Client Name</label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="e.g. Senthil Nathan" 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                            value={carpenterData.clientName} 
                                            onChange={(e) => setCarpenterData({ ...carpenterData, clientName: e.target.value })} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Name</label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="e.g. Dindigul, Apt - Besent Nagar" 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                            value={carpenterData.siteName} 
                                            onChange={(e) => setCarpenterData({ ...carpenterData, siteName: e.target.value })} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Carpenter Name</label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="e.g. Vikaas kumar + pandiyan" 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                            value={carpenterData.carpenterName} 
                                            onChange={(e) => setCarpenterData({ ...carpenterData, carpenterName: e.target.value })} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Order Value</label>
                                        <input 
                                            type="number" 
                                            required 
                                            placeholder="₹ 0.00" 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                            value={carpenterData.workOrderValue} 
                                            onChange={(e) => setCarpenterData({ ...carpenterData, workOrderValue: e.target.value })} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cookscape Rate</label>
                                        <input 
                                            type="number" 
                                            required 
                                            placeholder="₹ 0.00" 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                            value={carpenterData.cookscapeRate} 
                                            onChange={(e) => setCarpenterData({ ...carpenterData, cookscapeRate: e.target.value })} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Advance Amount</label>
                                        <input 
                                            type="number" 
                                            required 
                                            placeholder="₹ 0.00" 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                            value={carpenterData.advance} 
                                            onChange={(e) => setCarpenterData({ ...carpenterData, advance: e.target.value })} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="e.g. On process-90%, Completed" 
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                            value={carpenterData.status} 
                                            onChange={(e) => setCarpenterData({ ...carpenterData, status: e.target.value })} 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                                    <textarea 
                                        rows="2" 
                                        placeholder="Add any additional notes here..." 
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm" 
                                        value={carpenterData.remarks} 
                                        onChange={(e) => setCarpenterData({ ...carpenterData, remarks: e.target.value })} 
                                    />
                                </div>

                                <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">
                                    {editingCarpenterRecord ? 'Update Record' : 'Create Record'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VoucherManagement;
