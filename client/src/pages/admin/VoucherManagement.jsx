import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import ExpenseReportTemplate from '../../components/admin/ExpenseReportTemplate';
import ExpenseCharts from '../../components/admin/ExpenseCharts';
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
    payVoucher,
    disburseVoucher,
    reset
} from '../../features/voucher/voucherSlice';
import { compressImage } from '../../utils/imageUtils';
import VoucherStatusFlow from '../../components/VoucherStatusFlow';
import {
    getCarpenterRecords,
    createCarpenterRecord,
    updateCarpenterRecord,
    deleteCarpenterRecord,
    reset as resetCarpenter
} from '../../features/carpenter/carpenterSlice';
import { getAllEmployees } from '../../features/admin/adminSlice';
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
    Trash2,
    ChevronRight,
    FileText,
    Eye,
    IndianRupee,
    AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import html2pdf from 'html2pdf.js';

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
    const { employees } = useSelector((state) => state.admin);

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
        proofFile: null,
        targetUserId: ''
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

    // Flow & Payment State
    const [payAmount, setPayAmount] = useState('');
    const [payRemarks, setPayRemarks] = useState('');
    const [pendingFilter, setPendingFilter] = useState('ALL'); // 'ALL', 'WAITING_AM', 'WAITING_COO', 'REJECTED'

    // Status helpers
    const isVoucherRejected = useCallback((v) => {
        if (!v) return false;
        return v.status === 'REJECTED' || v.amStatus === 'REJECTED' || v.cooStatus === 'REJECTED';
    }, []);

    const isVoucherPaid = useCallback((v) => {
        if (!v) return false;
        return ['PAID', 'COMPLETED'].includes(v.status);
    }, []);

    const isVoucherUnpaid = useCallback((v) => {
        if (!v) return false;
        return v.cooStatus === 'APPROVED' && !isVoucherPaid(v) && !isVoucherRejected(v);
    }, [isVoucherPaid, isVoucherRejected]);

    const isVoucherPending = useCallback((v) => {
        if (!v) return false;
        return !isVoucherPaid(v) && !isVoucherRejected(v) && !isVoucherUnpaid(v);
    }, [isVoucherPaid, isVoucherRejected, isVoucherUnpaid]);

    // Categorized lists
    const allVouchers = useMemo(() => {
        const map = new Map();
        (spentHistory || []).forEach(v => map.set(v.id, v));
        (manageableVouchers || []).forEach(v => {
            if (!map.has(v.id)) {
                map.set(v.id, v);
            } else {
                map.set(v.id, { ...map.get(v.id), ...v });
            }
        });
        return Array.from(map.values());
    }, [spentHistory, manageableVouchers]);

    const pendingVouchersList = useMemo(() => {
        return allVouchers.filter(v => {
            const rejected = isVoucherRejected(v);
            if (pendingFilter === 'REJECTED') return rejected;
            if (rejected) return false;
            if (pendingFilter === 'WAITING_AM') return v.amStatus === 'PENDING';
            if (pendingFilter === 'WAITING_COO') return v.amStatus === 'APPROVED' && v.cooStatus === 'PENDING';
            return isVoucherPending(v);
        });
    }, [allVouchers, pendingFilter, isVoucherRejected, isVoucherPending]);

    const unpaidVouchersList = useMemo(() => {
        return allVouchers.filter(v => isVoucherUnpaid(v));
    }, [allVouchers, isVoucherUnpaid]);

    const paidVouchersList = useMemo(() => {
        return allVouchers.filter(v => isVoucherPaid(v));
    }, [allVouchers, isVoucherPaid]);

    const pendingCount = useMemo(() => {
        return allVouchers.filter(v => isVoucherPending(v)).length;
    }, [allVouchers, isVoucherPending]);

    const waitingAmCount = useMemo(() => {
        return allVouchers.filter(v => v.amStatus === 'PENDING' && !isVoucherRejected(v)).length;
    }, [allVouchers, isVoucherRejected]);

    const waitingCooCount = useMemo(() => {
        return allVouchers.filter(v => v.amStatus === 'APPROVED' && v.cooStatus === 'PENDING' && !isVoucherRejected(v)).length;
    }, [allVouchers, isVoucherRejected]);

    const unpaidCount = useMemo(() => {
        return unpaidVouchersList.length;
    }, [unpaidVouchersList]);

    const paidCount = useMemo(() => {
        return paidVouchersList.length;
    }, [paidVouchersList]);

    const rejectedCount = useMemo(() => {
        return allVouchers.filter(v => isVoucherRejected(v)).length;
    }, [allVouchers, isVoucherRejected]);

    const pendingAmount = useMemo(() => {
        return allVouchers.filter(v => isVoucherPending(v)).reduce((sum, v) => sum + (v.amount || 0), 0);
    }, [allVouchers, isVoucherPending]);

    const unpaidAmount = useMemo(() => {
        return unpaidVouchersList.reduce((sum, v) => sum + (v.amount || 0), 0);
    }, [unpaidVouchersList]);

    const paidAmount = useMemo(() => {
        return paidVouchersList.reduce((sum, v) => sum + (v.amount || 0), 0);
    }, [paidVouchersList]);

    // PDF Print Reference
    const reportRef = useRef();
    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Expense_Hub_Report_${new Date().toISOString().split('T')[0]}`,
    });

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

    // Lightbox for proof
    const [showLightbox, setShowLightbox] = useState(false);

    // Downloading state
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;

        setIsDownloading(true);
        const toastId = toast.loading('Generating high-quality PDF...');

        try {
            // First, make sure we are in history view so the ref is mounted and visible
            setView('history');

            // Wait for a tick to ensure rendering
            await new Promise(resolve => setTimeout(resolve, 500));

            const element = reportRef.current;
            const opt = {
                margin: 0,
                filename: `Expense_Hub_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    scrollY: 0,
                    scrollX: 0
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().from(element).set(opt).save();
            toast.update(toastId, { render: 'PDF downloaded successfully!', type: 'success', isLoading: false, autoClose: 3000 });
        } catch (error) {
            console.error('PDF Generation failed:', error);
            toast.update(toastId, { render: `Failed to generate PDF: ${error.message || 'Unknown error'}`, type: 'error', isLoading: false, autoClose: 3000 });
        } finally {
            setIsDownloading(false);
        }
    };

    // Role helper functions
    const isCOO = useCallback((u) => {
        if (!u) return false;
        const des = (u.designation || '').toUpperCase();
        return (u.role === 'BUSINESS_HEAD' && (des === 'COO' || des.includes('CHIEF OPERATIONAL OFFICER'))) || u.email === 'designs.cookscape@gmail.com';
    }, []);

    const isAM = useCallback((u) => {
        if (!u) return false;
        return u.role === 'ACCOUNTS_MANAGER';
    }, []);

    const isAdmin = useCallback((u) => {
        if (!u) return false;
        return u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';
    }, []);

    const canViewVouchers = useCallback((u) => {
        return isCOO(u) || isAM(u) || isAdmin(u);
    }, [isCOO, isAM, isAdmin]);

    useEffect(() => {
        if (selectedVoucher) {
            setPayAmount(selectedVoucher.amount !== undefined ? selectedVoucher.amount.toString() : '');
            setPayRemarks('');
        }
    }, [selectedVoucher]);

    const handleConfirmPayment = useCallback(async () => {
        if (!selectedVoucher) return;
        if (!isAM(user)) {
            toast.error('Only Accounts Manager can disburse payments');
            return;
        }
        if (selectedVoucher.cooStatus !== 'APPROVED') {
            toast.error('Voucher must be reviewed and confirmed by COO before marking as PAID');
            return;
        }
        const amountVal = parseFloat(payAmount);
        if (isNaN(amountVal) || amountVal <= 0) {
            toast.error('Please enter a valid disbursement amount');
            return;
        }
        try {
            await dispatch(payVoucher({ 
                id: selectedVoucher.id, 
                amount: amountVal, 
                remarks: payRemarks 
            })).unwrap();
            toast.success(`Payment of ₹${amountVal.toLocaleString()} confirmed. Voucher marked as PAID!`);
            setSelectedVoucher(null);
            setPayAmount('');
            setPayRemarks('');
            dispatch(getManageableVouchers());
            dispatch(getFinanceSummary());
            dispatch(getSpentHistory());
        } catch (err) {
            toast.error(err || 'Failed to process payment');
        }
    }, [dispatch, isAM, payAmount, payRemarks, selectedVoucher, user]);

    const handleAction = useCallback(async (status, voucherOverride = null) => {
        const voucher = voucherOverride || selectedVoucher;
        if (!voucher) return;

        // Admin has view-only access
        if (isAdmin(user)) {
            toast.error('Administrators have view-only access. Actions are reserved for Accounts Manager and COO.');
            return;
        }

        const payload = { id: voucher.id, status, remarks: voucherOverride ? '' : remarks };

        try {
            if (status === 'PAID') {
                if (!isAM(user)) {
                    toast.error('Only Accounts Manager can mark vouchers as paid');
                    return;
                }
                if (voucher.cooStatus !== 'APPROVED') {
                    toast.error('Voucher must be reviewed and confirmed by COO before marking as PAID');
                    return;
                }
                const amountVal = payAmount ? parseFloat(payAmount) : voucher.amount;
                await dispatch(payVoucher({ id: voucher.id, amount: amountVal, remarks: payRemarks || remarks })).unwrap();
                toast.success('Payment confirmed & voucher marked as PAID');
            } else if (status === 'DISBURSE') {
                if (!isAM(user)) {
                    toast.error('Only Accounts Manager can disburse vouchers');
                    return;
                }
                await dispatch(disburseVoucher(voucher.id)).unwrap();
                toast.success('Funds disbursement confirmed');
            } else if (isAM(user)) {
                await dispatch(approveVoucherAM(payload)).unwrap();
                toast.success(`Voucher ${status.toLowerCase()} by Accounts Manager`);
            } else if (isCOO(user)) {
                await dispatch(approveVoucherCOO(payload)).unwrap();
                toast.success(`Voucher ${status.toLowerCase()} by COO`);
            } else {
                toast.error('Not authorized to perform this action');
                return;
            }

            setSelectedVoucher(null);
            setRemarks('');
            setPayRemarks('');
            dispatch(getManageableVouchers());
            dispatch(getFinanceSummary());
            dispatch(getSpentHistory());
            dispatch(getAllEmployees());
        } catch (err) {
            toast.error(err);
        }
    }, [dispatch, isAM, isCOO, isAdmin, remarks, selectedVoucher, user, payAmount, payRemarks]);

    useEffect(() => {
        if (canViewVouchers(user)) {
            dispatch(getManageableVouchers());
            dispatch(getFinanceSummary());
            dispatch(getSpentHistory());
            dispatch(getDepositHistory());
            dispatch(getCarpenterRecords());
        }
    }, [dispatch, user, canViewVouchers]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Escape Key Logic
            if (e.key === 'Escape') {
                if (showLightbox) {
                    setShowLightbox(false);
                    return;
                }

                if (selectedVoucher) setSelectedVoucher(null);
                if (showAddCash) setShowAddCash(false);
                if (showWipeModal) setShowWipeModal(false);
                if (showRaiseModal) setShowRaiseModal(false);
                if (showCarpenterModal) setShowCarpenterModal(false);
            }

            // Enter to Approve (only if Review Modal is open and view is 'pending')
            if (e.key === 'Enter' && selectedVoucher && view === 'pending' && !showLightbox) {
                // If user is in textarea, allow Enter unless Ctrl/Cmd is pressed
                if (document.activeElement.tagName === 'TEXTAREA') {
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        handleAction('APPROVED');
                    }
                    return;
                }

                // Don't trigger if other interactive elements are focused (unless it's the body)
                if (document.activeElement === document.body || !['INPUT', 'SELECT'].includes(document.activeElement.tagName)) {
                    e.preventDefault();
                    handleAction('APPROVED');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedVoucher, view, showAddCash, showWipeModal, showRaiseModal, showCarpenterModal, handleAction, showLightbox]);

    useEffect(() => {
        if (isError) toast.error(message);
    }, [isError, message]);

    const handleCarpenterHubClick = () => {
        setView('carpenter');
    };

    const handleDeleteVoucher = (id) => {
        if (!isAM(user)) {
            toast.error('Only Accounts Manager can delete vouchers. Administrators have view-only access.');
            return;
        }
        if (window.confirm('Are you certain you want to permanently delete this voucher? If it was already approved, the funds will be automatically restored to the budget.')) {
            dispatch(deleteVoucher(id));
            if (selectedVoucher?.id === id) setSelectedVoucher(null);
            toast.success('Voucher deleted and finances adjusted');
        }
    };

    const handleCarpenterSubmit = async (e) => {
        e.preventDefault();
        if (isAdmin(user)) {
            return toast.error('Administrators have view-only access');
        }
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

    const handleCarpenterEdit = (record) => {
        if (isAdmin(user)) {
            return toast.error('Administrators have view-only access');
        }
        setEditingCarpenterRecord(record);
        setCarpenterData({
            aeName: record.aeName || '',
            clientName: record.clientName || '',
            siteName: record.siteName || '',
            carpenterName: record.carpenterName || '',
            workOrderValue: record.workOrderValue || '',
            cookscapeRate: record.cookscapeRate || '',
            advance: record.advance || '',
            remarks: record.remarks || '',
            status: record.status || 'On process-90%'
        });
        setShowCarpenterModal(true);
    };

    const handleCarpenterDelete = (id) => {
        if (isAdmin(user)) {
            return toast.error('Administrators have view-only access');
        }
        if (window.confirm('Are you sure you want to delete this carpenter record?')) {
            dispatch(deleteCarpenterRecord(id));
            toast.success('Record deleted successfully');
        }
    };

    // Derived filtered history
    const filteredHistory = useMemo(() => {
        return (spentHistory || []).filter(item => {
            const matchesSearch =
                (item.user?.name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
                (item.purpose || '').toLowerCase().includes(historySearch.toLowerCase()) ||
                (item.type || '').toLowerCase().includes(historySearch.toLowerCase()) ||
                (item.amount?.toString() || '').includes(historySearch);

            const matchesStatus = historyStatus === 'ALL' ? true :
                historyStatus === 'UNPAID' ? isVoucherUnpaid(item) :
                    historyStatus === 'PAID_SETTLED' ? isVoucherPaid(item) :
                        item.status === historyStatus;

            const itemDate = new Date(item.updatedAt || item.date);
            const matchesStartDate = !historyStartDate || itemDate >= new Date(historyStartDate);
            const matchesEndDate = !historyEndDate || itemDate <= new Date(historyEndDate + 'T23:59:59');

            return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
        });
    }, [spentHistory, historySearch, historyStatus, isVoucherUnpaid, isVoucherPaid, historyStartDate, historyEndDate]);


    const getFullProofUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const baseUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : 'http://localhost:5000';
        return `${baseUrl}${url}`;
    };

    const handleAddCash = async (e) => {
        e.preventDefault();
        if (isAdmin(user)) {
            return toast.error('Administrators have view-only access');
        }
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
        if (!isAM(user)) {
            toast.error('Only Accounts Manager can add notes. Administrators have view-only access.');
            return;
        }
        try {
            await dispatch(addAdminNote({ id: selectedVoucher.id, remarks })).unwrap();
            toast.success('Note added successfully');
            setSelectedVoucher(null);
            setRemarks('');
            dispatch(getManageableVouchers());
        } catch (err) {
            toast.error(err);
        }
    };

    const handleRaiseVoucher = async (e) => {
        e.preventDefault();
        if (isAdmin(user)) {
            return toast.error('Administrators have view-only access');
        }
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
            if (raiseData.targetUserId) {
                data.append('targetUserId', raiseData.targetUserId);
            }
            if (raiseData.proofFile) {
                try {
                    const compressed = await compressImage(raiseData.proofFile);
                    data.append('proof', compressed);
                } catch (err) {
                    console.error('Compression error:', err);
                    data.append('proof', raiseData.proofFile); // Fallback
                }
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
                    proofFile: null,
                    targetUserId: ''
                });
                dispatch(getManageableVouchers());
                dispatch(getSpentHistory());
                dispatch(getFinanceSummary());
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
        if (isAdmin(user)) {
            return toast.error('Administrators have view-only access');
        }
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

                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-slate-200 border border-slate-900 flex items-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            <FileText size={20} className={isDownloading ? 'animate-pulse text-blue-400' : 'text-blue-400'} />
                            <span className="hidden lg:inline">{isDownloading ? 'Generating...' : 'Download PDF Report'}</span>
                        </button>

                        {isAM(user) && (
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

                <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl border border-slate-200 ml-auto gap-1">
                    <button
                        onClick={() => setView('pending')}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${view === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Pending Vouchers
                        {pendingCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setView('unpaid')}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${view === 'unpaid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Unpaid Vouchers
                        {unpaidCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white animate-pulse">
                                {unpaidCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setView('paid'); setHistoryStatus('PAID_SETTLED'); }}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${view === 'paid' || view === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Paid Vouchers
                        {paidCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                                {paidCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setView('deposits')}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${view === 'deposits' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Deposits
                    </button>
                    <button
                        onClick={() => setView('carpenter')}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${view === 'carpenter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Carpenter Hub
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Cash / Budget Card */}
                <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 group relative overflow-hidden transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-all" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-500">
                            <Wallet size={28} />
                        </div>
                        {isCOO(user) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowAddCash(true); }}
                                className="p-3 bg-slate-50 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                                title="Add Funds"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">In Cash / Budget</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{financeSummary?.currentCash?.toLocaleString() || '0'}</p>
                </motion.div>

                {/* Total Spent Card */}
                <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => setView('history')}
                    className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 group cursor-pointer relative overflow-hidden transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-rose-100/50 transition-all" />
                    <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-rose-200 group-hover:scale-110 transition-transform duration-500 relative z-10">
                        <TrendingUp size={28} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Spent</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tighter">₹{financeSummary?.spent?.toLocaleString() || '0'}</p>
                </motion.div>

                {/* Available Balance Card */}
                <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 group relative overflow-hidden transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-100/50 transition-all" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-500">
                            <PieChart size={28} />
                        </div>
                        {isCOO(user) && (
                            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest hidden xl:inline">Impact</span>
                                <button
                                    onClick={() => dispatch(toggleCarpenterImpact())}
                                    className={`w-8 h-4 rounded-full transition-all relative ${financeSummary?.carpenterImpactEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${financeSummary?.carpenterImpactEnabled ? 'left-4.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Available Balance</p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-3xl font-black tracking-tighter ${financeSummary?.balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            ₹{financeSummary?.balance?.toLocaleString() || '0'}
                        </p>
                        {financeSummary?.carpenterImpactEnabled && (
                            <span className="text-[8px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-full shadow-lg shadow-blue-200 animate-pulse">
                                ADJUSTED
                            </span>
                        )}
                    </div>
                </motion.div>

                {/* Pending Vouchers Card */}
                <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => setView('pending')}
                    className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 group cursor-pointer relative overflow-hidden transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-100/50 transition-all" />
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform duration-500 relative z-10">
                        <Clock size={28} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pending Vouchers</p>
                    <div className="flex items-baseline justify-between">
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{pendingCount}</p>
                        <span className="text-[10px] font-black text-amber-600">₹{pendingAmount.toLocaleString()}</span>
                    </div>
                </motion.div>

                {/* Unpaid Vouchers Card */}
                <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => setView('unpaid')}
                    className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 group cursor-pointer relative overflow-hidden transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-all" />
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-500 relative z-10">
                        <IndianRupee size={28} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Unpaid Vouchers</p>
                    <div className="flex items-baseline justify-between">
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{unpaidCount}</p>
                        <span className="text-[10px] font-black text-blue-600">₹{unpaidAmount.toLocaleString()}</span>
                    </div>
                </motion.div>

                {/* Paid Vouchers Card */}
                <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={() => { setView('paid'); setHistoryStatus('PAID_SETTLED'); }}
                    className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 group cursor-pointer relative overflow-hidden transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-100/50 transition-all" />
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform duration-500 relative z-10">
                        <CheckCircle2 size={28} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Paid Vouchers</p>
                    <div className="flex items-baseline justify-between">
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{paidCount}</p>
                        <span className="text-[10px] font-black text-emerald-600">₹{paidAmount.toLocaleString()}</span>
                    </div>
                </motion.div>

                {/* Carpenter Hub Card */}
                <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    onClick={handleCarpenterHubClick}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] shadow-xl group cursor-pointer relative overflow-hidden transition-all duration-500"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500 relative z-10">
                        <Hammer size={28} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Carpenter Hub</p>
                    <p className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                        Manage Records <ArrowUpRight size={20} className="text-blue-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </p>
                </motion.div>
            </div>

            {/* Analytics Section */}
            <ExpenseCharts spentHistory={spentHistory} />

            <AnimatePresence mode="wait">
                {view === 'pending' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        key="pending"
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Clock size={22} className="text-amber-500" />
                                    <h2 className="text-xl font-black text-slate-800">Pending Vouchers</h2>
                                </div>
                                <p className="text-xs text-slate-400 font-bold mt-1">
                                    Vouchers awaiting Accounts Manager review or COO verification
                                </p>
                            </div>

                            {/* Filter Chips */}
                            <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                                <button
                                    onClick={() => setPendingFilter('ALL')}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        pendingFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    All Pending <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[9px]">{pendingCount}</span>
                                </button>
                                <button
                                    onClick={() => setPendingFilter('WAITING_AM')}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        pendingFilter === 'WAITING_AM' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Waiting AM <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[9px]">{waitingAmCount}</span>
                                </button>
                                <button
                                    onClick={() => setPendingFilter('WAITING_COO')}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        pendingFilter === 'WAITING_COO' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Waiting COO <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[9px]">{waitingCooCount}</span>
                                </button>
                                <button
                                    onClick={() => setPendingFilter('REJECTED')}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                        pendingFilter === 'REJECTED' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    Rejected <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[9px]">{rejectedCount}</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {pendingVouchersList.map((voucher) => (
                                <div
                                    key={voucher.id}
                                    className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all p-8 flex flex-col lg:flex-row items-center justify-between gap-8 group"
                                >
                                    <div className="flex items-center gap-6 w-full lg:w-1/4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner">
                                            <User size={32} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{voucher.user?.name}</h3>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{voucher.user?.designation}</p>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{voucher.type.replace(/_/g, ' ')}</p>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                    {new Date(voucher.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                isVoucherRejected(voucher) ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                                voucher.amStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                'bg-blue-50 text-blue-700 border border-blue-200'
                                            }`}>
                                                {isVoucherRejected(voucher) ? 'REJECTED' :
                                                 voucher.amStatus === 'PENDING' ? 'WAITING AM REVIEW' :
                                                 'WAITING COO VERIFY'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full text-center lg:text-left border-y lg:border-y-0 lg:border-x border-slate-100 py-6 lg:py-0 lg:px-12">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Purpose / Workflow</p>
                                        <p className="text-slate-600 font-bold leading-relaxed mb-4">{voucher.purpose}</p>
                                        <div className="w-64 scale-75 origin-left">
                                            <VoucherStatusFlow voucher={voucher} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between lg:justify-end gap-12 w-full lg:w-1/4">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                                            <p className="text-xl font-black text-slate-800 tracking-tight">₹{voucher.amount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isAM(user) && (
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
                                                {isAM(user) && voucher.amStatus === 'PENDING' ? 'Review (AM)' :
                                                 isCOO(user) && voucher.amStatus === 'APPROVED' && voucher.cooStatus === 'PENDING' ? 'Verify (COO)' :
                                                 'View Details'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {pendingVouchersList.length === 0 && (
                                <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-sm mb-2">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <div>
                                        <p className="text-slate-800 font-black text-2xl tracking-tight">Queue Empty</p>
                                        <p className="text-slate-400 font-medium max-w-xs mx-auto">No pending vouchers for this filter.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : view === 'unpaid' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        key="unpaid"
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <IndianRupee size={22} className="text-blue-600" />
                                    <h2 className="text-xl font-black text-slate-800">Unpaid Vouchers</h2>
                                </div>
                                <p className="text-xs text-slate-400 font-bold mt-1">
                                    Approved by COO &bull; Ready for Accounts Manager payment disbursement
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-black rounded-xl border border-blue-200 shadow-sm">
                                    {unpaidCount} Awaiting Payment
                                </span>
                                <span className="px-3.5 py-1.5 bg-slate-900 text-white text-xs font-black rounded-xl shadow-sm">
                                    Total: ₹{unpaidAmount.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {unpaidVouchersList.map((voucher) => (
                                <div
                                    key={voucher.id}
                                    className="bg-white rounded-[2rem] border border-blue-100 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all p-8 flex flex-col lg:flex-row items-center justify-between gap-8 group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/40 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                                    <div className="flex items-center gap-6 w-full lg:w-1/4">
                                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                                            <User size={32} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg">{voucher.user?.name}</h3>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{voucher.user?.designation}</p>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{voucher.type.replace(/_/g, ' ')}</p>
                                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                    {new Date(voucher.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                                                Unpaid &bull; COO Confirmed
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full text-center lg:text-left border-y lg:border-y-0 lg:border-x border-slate-100 py-6 lg:py-0 lg:px-12">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Purpose / Workflow</p>
                                        <p className="text-slate-600 font-bold leading-relaxed mb-3">{voucher.purpose}</p>
                                        {voucher.cooRemarks && (
                                            <p className="text-xs text-slate-500 italic mb-3">
                                                <span className="font-black text-emerald-600">COO Note:</span> "{voucher.cooRemarks}"
                                            </p>
                                        )}
                                        <div className="w-64 scale-75 origin-left">
                                            <VoucherStatusFlow voucher={voucher} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between lg:justify-end gap-8 w-full lg:w-1/3">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Approved Amount</p>
                                            <p className="text-2xl font-black text-blue-600 tracking-tight">₹{voucher.amount.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isAM(user) && (
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
                                            {isAM(user) ? (
                                                <button
                                                    onClick={() => setSelectedVoucher(voucher)}
                                                    className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <IndianRupee size={16} /> Give Amount & Pay
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedVoucher(voucher)}
                                                    className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all active:scale-95"
                                                >
                                                    View Details
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {unpaidVouchersList.length === 0 && (
                                <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-blue-400 shadow-sm mb-2">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <div>
                                        <p className="text-slate-800 font-black text-2xl tracking-tight">No Unpaid Vouchers</p>
                                        <p className="text-slate-400 font-medium max-w-sm mx-auto mt-1">All COO-approved vouchers have been disbursed and settled.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (view === 'history' || view === 'paid') ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        key="history"
                        className="space-y-4"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={22} className="text-emerald-500" />
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">
                                        {view === 'paid' ? 'Paid Vouchers' : 'Spent History'}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-bold">
                                        {view === 'paid' ? 'Settled and disbursed expense records' : 'All historical expense records'}
                                    </p>
                                </div>
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

                                {/* Employee Filter */}
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        className="pl-11 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-50 outline-none appearance-none cursor-pointer min-w-[160px]"
                                        value={historySearch}
                                        onChange={(e) => setHistorySearch(e.target.value)}
                                    >
                                        <option value="">All Employees</option>
                                        {employees && employees.map(emp => (
                                            <option key={emp.id} value={emp.name}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div className="relative">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        className="pl-11 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-4 focus:ring-blue-50 outline-none appearance-none cursor-pointer min-w-[140px]"
                                        value={historyStatus}
                                        onChange={(e) => setHistoryStatus(e.target.value)}
                                    >
                                        <option value="PAID_SETTLED">Paid / Settled</option>
                                        <option value="ALL">All Status</option>
                                        <option value="UNPAID">Unpaid (COO Confirmed)</option>
                                        <option value="PENDING">Pending AM</option>
                                        <option value="APPROVED">Pending COO</option>
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

                                {/* Clear All Filters */}
                                {(historySearch || historyStatus !== 'ALL' || historyStartDate || historyEndDate) && (
                                    <button
                                        onClick={() => {
                                            setHistorySearch('');
                                            setHistoryStatus('ALL');
                                            setHistoryStartDate('');
                                            setHistoryEndDate('');
                                        }}
                                        className="text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 px-3 py-2 rounded-xl transition-all flex items-center gap-2"
                                    >
                                        <X size={12} /> Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {filteredHistory.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    onClick={() => setSelectedVoucher(item)}
                                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex flex-col lg:flex-row items-center gap-8">
                                        {/* Left Side: Employee & Basic Info */}
                                        <div className="flex items-center gap-5 w-full lg:w-1/4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner overflow-hidden">
                                                {['LEO_SIR_BH', 'SANGHATAMIZH_MAM_BH', 'RAJKUMAR_SIR_BH', 'PUGAZH_SIR_BH', 'RAMYA_MAM_BH', 'BH_VOUCHER'].includes(item.type) ? (
                                                    <span className="text-xl font-black">
                                                        {item.type === 'LEO_SIR_BH' ? 'L' :
                                                            item.type === 'SANGHATAMIZH_MAM_BH' ? 'S' :
                                                                item.type === 'RAJKUMAR_SIR_BH' ? 'R' :
                                                                    item.type === 'PUGAZH_SIR_BH' ? 'P' :
                                                                        item.type === 'RAMYA_MAM_BH' ? 'R' : 'B'}
                                                    </span>
                                                ) : item.user?.profileImage ? (
                                                    <img src={item.user.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xl font-black">{item.user?.name ? item.user.name[0] : '?'}</span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 text-lg">
                                                    {item.type === 'LEO_SIR_BH' ? 'LEO SIR' :
                                                        item.type === 'SANGHATAMIZH_MAM_BH' ? 'SANGHATAMIZH MAM' :
                                                            item.type === 'RAJKUMAR_SIR_BH' ? 'RAJKUMAR SIR' :
                                                                item.type === 'PUGAZH_SIR_BH' ? 'PUGAZH SIR' :
                                                                    item.type === 'RAMYA_MAM_BH' ? 'RAMYA MAM' :
                                                                        item.type === 'BH_VOUCHER' ? 'BUSINESS HEAD' :
                                                                            item.user?.name}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.user?.designation}</p>
                                                    <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{item.type.replace(/_/g, ' ')}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">
                                                    Raised: {new Date(item.date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Center: Purpose & Workflow Detail */}
                                        <div className="flex-1 w-full border-y lg:border-y-0 lg:border-x border-slate-50 py-6 lg:py-0 lg:px-12">
                                            <div className="flex flex-col gap-5">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Purpose</p>
                                                    <p className="text-slate-600 font-bold leading-relaxed line-clamp-2">{item.purpose}</p>
                                                </div>

                                                {/* Detailed Status Grid */}
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AM Status</span>
                                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${item.amStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                item.amStatus === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                    'bg-slate-50 text-slate-400 border-slate-100'
                                                            }`}>
                                                            {item.amStatus}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">COO Status</span>
                                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${item.cooStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                item.cooStatus === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                    'bg-slate-50 text-slate-400 border-slate-100'
                                                            }`}>
                                                            {item.cooStatus || 'PENDING'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Status</span>
                                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${
                                                            item.status === 'COMPLETED' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100' :
                                                            item.status === 'WAITING' ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-100' :
                                                            item.status === 'PAID' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100' :
                                                            item.status === 'REJECTED' ? 'bg-rose-600 text-white border-rose-600' :
                                                            'bg-amber-50 text-amber-600 border-amber-200'
                                                        }`}>
                                                            {['PENDING', 'APPROVED'].includes(item.status) ? 'UNPAID' : item.status}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="w-full scale-90 lg:scale-100 origin-left">
                                                    <VoucherStatusFlow voucher={item} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Amount & Action */}
                                        <div className="flex items-center justify-between lg:justify-end gap-12 w-full lg:w-1/4">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                                                <p className="text-3xl font-black text-slate-800 tracking-tighter group-hover:text-emerald-600 transition-colors">₹{item.amount.toLocaleString()}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Processed: {new Date(item.updatedAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {isAM(user) && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteVoucher(item.id);
                                                        }}
                                                        className="p-4 bg-rose-50 text-rose-500 rounded-[1.25rem] hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-90"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={22} />
                                                    </button>
                                                )}
                                                <div className="w-12 h-12 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-emerald-600 transition-all border border-transparent group-hover:border-emerald-100 shadow-inner">
                                                    <ChevronRight size={28} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inline Quick Actions for History */}
                                        {isVoucherUnpaid(item) && isAM(user) && (
                                            <div className="absolute right-24 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedVoucher(item);
                                                    }}
                                                    className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 flex items-center gap-2 hover:bg-black transition-all"
                                                >
                                                    <IndianRupee size={14} /> Pay Voucher
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {filteredHistory.length === 0 && (
                                <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3.5rem] p-24 text-center flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-slate-200 shadow-sm mb-2 border border-slate-100">
                                        <History size={48} />
                                    </div>
                                    <div>
                                        <p className="text-slate-800 font-black text-3xl tracking-tight">Empty Archive</p>
                                        <p className="text-slate-400 font-medium max-w-xs mx-auto">No records found matching your current filters.</p>
                                    </div>
                                </div>
                            )}
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
                                {!isAdmin(user) && (
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
                                )}
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
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.aeName?.toLowerCase() === 'balaji' ? 'bg-orange-100 text-orange-600' :
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
                                                    {!isAdmin(user) ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleCarpenterEdit(item)}
                                                                className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                                                                title="Edit Record"
                                                            >
                                                                <PlusCircle size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleCarpenterDelete(item.id)}
                                                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                                                                title="Delete Record"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-300 uppercase">View Only</span>
                                                    )}
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
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
                            className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col relative z-10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Sticky Header */}
                            <div className="p-5 sm:p-7 md:p-8 pb-4 sm:pb-5 border-b border-slate-100 flex justify-between items-center flex-shrink-0 bg-white">
                                <div className="flex items-center gap-4 sm:gap-5">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 flex-shrink-0">
                                        <Receipt className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Review Request</h3>
                                        <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">Voucher #V-{selectedVoucher.id}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedVoucher(null)} 
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                    title="Close"
                                >
                                    <XCircle size={26} />
                                </button>
                            </div>

                            {/* Scrollable Content Body */}
                            <div className="p-5 sm:p-7 md:p-8 space-y-6 overflow-y-auto flex-1">
                                <div className="space-y-4 bg-slate-50 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-100 relative overflow-hidden">
                                    <VoucherStatusFlow voucher={selectedVoucher} />
                                    <div className="relative z-10 space-y-5 sm:space-y-6 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 border-b sm:border-b-0 pb-4 sm:pb-0 border-slate-200/60">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested By</p>
                                                <p className="font-black text-slate-800 text-sm sm:text-base">{selectedVoucher.user?.name || 'N/A'}</p>
                                                {selectedVoucher.user?.designation && (
                                                    <p className="text-[10px] text-slate-400 font-bold">{selectedVoucher.user.designation}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1 sm:text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exp. Date</p>
                                                <p className="font-black text-slate-800 text-sm sm:text-base">{new Date(selectedVoucher.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                                            </div>
                                            <div className="space-y-1 sm:text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposed Amount</p>
                                                <p className="text-xl sm:text-2xl font-black text-blue-600">₹{selectedVoucher.amount.toLocaleString()}</p>
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mt-1 ${
                                                    isVoucherPaid(selectedVoucher) ? 'bg-emerald-100 text-emerald-700' :
                                                    isVoucherRejected(selectedVoucher) ? 'bg-rose-100 text-rose-700' :
                                                    isVoucherUnpaid(selectedVoucher) ? 'bg-blue-100 text-blue-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {isVoucherPaid(selectedVoucher) ? 'PAID' :
                                                     isVoucherRejected(selectedVoucher) ? 'REJECTED' :
                                                     isVoucherUnpaid(selectedVoucher) ? 'UNPAID (COO CONFIRMED)' :
                                                     selectedVoucher.amStatus === 'PENDING' ? 'PENDING AM' : 'PENDING COO'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose of Expense</p>
                                            <p className="text-xs sm:text-sm text-slate-600 font-bold leading-relaxed bg-white/70 p-3 sm:p-4 rounded-xl border border-slate-100">{selectedVoucher.purpose}</p>
                                        </div>

                                        {selectedVoucher.proofUrl && (
                                            <div className="space-y-2 pt-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attachment / Proof</p>
                                                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                                                    {selectedVoucher.proofUrl.match(/\.(jpeg|jpg|gif|png|webp|pdf)$/i) ? (
                                                        <div
                                                            onClick={() => setShowLightbox(true)}
                                                            className="block group relative cursor-zoom-in"
                                                        >
                                                            {selectedVoucher.proofUrl.match(/\.pdf$/i) ? (
                                                                <div className="w-full h-32 bg-slate-50 flex flex-col items-center justify-center gap-2 group-hover:bg-slate-100 transition-all">
                                                                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                                                        <Receipt size={24} />
                                                                    </div>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4">PDF Document (Click to view)</p>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <img
                                                                        src={getFullProofUrl(selectedVoucher.proofUrl)}
                                                                        alt="Proof"
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                            if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                                                                        }}
                                                                        className="w-full max-h-48 sm:max-h-60 object-contain bg-slate-100/60 transition-all group-hover:scale-105"
                                                                    />
                                                                    <div className="hidden w-full py-8 bg-slate-50 flex-col items-center justify-center gap-2 text-slate-400">
                                                                        <Receipt size={28} className="text-slate-300" />
                                                                        <span className="text-[10px] font-bold">Proof attachment preview unavailable (Click to inspect)</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <span className="bg-white/90 text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">View Proof (Esc to close)</span>
                                                            </div>
                                                        </div>
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
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded h-fit">AM</span>
                                                        <p className="text-xs text-slate-500 italic">"{selectedVoucher.amRemarks}"</p>
                                                    </div>
                                                )}
                                                {selectedVoucher.cooRemarks && (
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded h-fit">COO</span>
                                                        <p className="text-xs text-slate-500 italic">"{selectedVoucher.cooRemarks}"</p>
                                                    </div>
                                                )}
                                                {selectedVoucher.adminRemarks && (
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded h-fit">Note</span>
                                                        <p className="text-xs text-slate-500 italic">"{selectedVoucher.adminRemarks}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {!isAdmin(user) && ((isAM(user) && selectedVoucher.amStatus === 'PENDING') ||
                                    (isCOO(user) && selectedVoucher.amStatus === 'APPROVED' && selectedVoucher.cooStatus === 'PENDING')) && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <MessageSquare size={12} /> Approval Remarks
                                        </label>
                                        <textarea
                                            rows="3"
                                            placeholder="Add context for your decision..."
                                            className="w-full px-5 sm:px-6 py-4 sm:py-5 bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-xs sm:text-sm transition-all focus:bg-white focus:border-blue-200"
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                        />
                                    </div>
                                )}

                                {isAdmin(user) && (
                                    <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider">
                                        <Eye size={16} className="text-blue-600" /> View Only Mode (Administrator)
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 pt-2">
                                    {/* Approval Buttons for AM and COO (Admin is view-only) */}
                                    {((isAM(user) && selectedVoucher.amStatus === 'PENDING') ||
                                        (isCOO(user) && selectedVoucher.amStatus === 'APPROVED' && selectedVoucher.cooStatus === 'PENDING')) && (
                                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                                <button
                                                    onClick={() => handleAction('REJECTED')}
                                                    className="w-full sm:flex-1 py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-rose-500 border-2 border-rose-100 hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-[0.98]"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleAction('APPROVED')}
                                                    className="w-full sm:flex-[1.5] py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                    {selectedVoucher.amStatus === 'PENDING' ? 'AM Approval' : 'COO Confirm'} <ArrowUpRight size={18} />
                                                </button>
                                            </div>
                                        )}

                                    {/* AM Payment Disbursement when voucher is UNPAID (COO has approved) */}
                                    {isAM(user) && isVoucherUnpaid(selectedVoucher) && (
                                        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-2xl sm:rounded-[2rem] space-y-4 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
                                                    <IndianRupee size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-sm sm:text-base">AM Payment Disbursement</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold">Approved by COO &bull; Enter disbursement amount and mark as PAID</p>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                    Disbursement Amount (₹) <span className="text-emerald-600">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">₹</span>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={payAmount}
                                                        onChange={(e) => setPayAmount(e.target.value)}
                                                        placeholder="Enter amount to pay..."
                                                        className="w-full pl-9 pr-4 py-3 bg-white border-2 border-emerald-200 focus:border-emerald-500 rounded-xl font-black text-lg text-slate-800 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                                                    />
                                                </div>
                                                <p className="text-[9px] text-slate-400 font-bold ml-1">
                                                    Proposed claim: ₹{selectedVoucher.amount?.toLocaleString()} (confirm or edit the disbursement amount)
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                    Payment Reference / Remarks (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={payRemarks}
                                                    onChange={(e) => setPayRemarks(e.target.value)}
                                                    placeholder="e.g. Bank Ref #, GPay Txn ID, or Cash Handover note"
                                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                                />
                                            </div>

                                            <button
                                                onClick={handleConfirmPayment}
                                                className="w-full py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={18} /> Give Amount & Mark as Paid
                                            </button>
                                        </div>
                                    )}

                                    {!isAM(user) && isVoucherUnpaid(selectedVoucher) && (
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-blue-700 font-bold text-xs">
                                            <AlertCircle size={18} className="flex-shrink-0" />
                                            <span>Approved by COO. Awaiting Accounts Manager payment disbursement.</span>
                                        </div>
                                    )}

                                    {isVoucherPaid(selectedVoucher) && (
                                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold text-xs">
                                            <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-600" />
                                            <span>This voucher has been settled and marked as PAID.</span>
                                        </div>
                                    )}

                                    {isVoucherRejected(selectedVoucher) && (
                                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 font-bold text-xs">
                                            <AlertCircle size={18} className="flex-shrink-0 text-rose-600" />
                                            <span>This voucher has been REJECTED in the workflow.</span>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                                        {/* Notes & Delete for AM */}
                                        {isAM(user) && (
                                            <div className="w-full sm:flex-1 flex gap-3 sm:gap-4">
                                                <button
                                                    onClick={() => handleDeleteVoucher(selectedVoucher.id)}
                                                    className="p-4 sm:p-5 border-2 border-rose-100 text-rose-500 hover:bg-rose-50 rounded-2xl sm:rounded-[1.5rem] transition-all flex items-center justify-center"
                                                    title="Delete Voucher"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                                <button
                                                    onClick={handleAdminNote}
                                                    className="flex-1 py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                >
                                                    {selectedVoucher.amStatus !== 'PENDING' && selectedVoucher.cooStatus !== 'PENDING' ? 'Update Note' : 'Add Note'}
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setSelectedVoucher(null)}
                                            className={`w-full py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black uppercase tracking-widest text-xs text-white bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-[0.98] ${isAM(user) ? 'sm:flex-1' : 'w-full'}`}
                                        >
                                            Close Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showAddCash && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
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
                            className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto relative z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <form onSubmit={handleAddCash} className="p-6 sm:p-8 space-y-5 sm:space-y-6 text-center">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto shadow-inner">
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
                                        className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-black text-xl sm:text-2xl tracking-tighter"
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
                                        className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm transition-all focus:bg-white"
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
                                        className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm transition-all focus:bg-white"
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
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWipeModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative z-10" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                <ShieldAlert size={36} />
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Danger Zone</h3>
                                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2">This will permanently delete all Vouchers and Deposits, and reset the current balance to zero. This action cannot be undone.</p>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left ml-2">Type "RESET" to confirm</p>
                                <input
                                    type="text"
                                    placeholder="RESET"
                                    className="w-full px-6 sm:px-8 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-rose-300 focus:bg-white outline-none font-black text-center text-rose-600 transition-all text-sm sm:text-base"
                                    value={wipeConfirmText}
                                    onChange={(e) => setWipeConfirmText(e.target.value.toUpperCase())}
                                />
                            </div>

                            <div className="flex gap-3 sm:gap-4 pt-2 sm:pt-4">
                                <button
                                    onClick={() => setShowWipeModal(false)}
                                    className="flex-1 px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleWipe}
                                    disabled={wipeConfirmText !== 'RESET' || isWiping}
                                    className={`flex-1 px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-xl transition-all active:scale-95 ${wipeConfirmText === 'RESET' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-200 cursor-not-allowed text-slate-400 opacity-50'}`}
                                >
                                    {isWiping ? 'Resetting...' : 'Reset Now'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {showRaiseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRaiseModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col relative z-10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {showSuccessTick ? (
                            <div className="p-8 sm:p-16 flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
                                <motion.div
                                    initial={{ scale: 0, rotate: -45 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-emerald-200"
                                >
                                    <CheckCircle2 size={64} strokeWidth={3} />
                                </motion.div>
                                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Request Submitted!</h3>
                                <p className="text-slate-500 font-bold text-sm">Your financial request has been successfully routed for approval.</p>
                            </div>
                        ) : (
                            <>
                                {/* Sticky Modal Header */}
                                <div className="p-5 sm:p-7 border-b border-slate-100 flex justify-between items-center flex-shrink-0 bg-white">
                                    <div className="flex items-center gap-4 sm:gap-5">
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl flex-shrink-0">
                                            <Receipt className="w-6 h-6 sm:w-7 sm:h-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Raise New Request</h3>
                                            <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">Submit for COO Review</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setShowRaiseModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                        <XCircle size={26} />
                                    </button>
                                </div>

                                {/* Scrollable Form Body */}
                                <form onSubmit={handleRaiseVoucher} className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">On Behalf Of (Employee)</label>
                                        <select
                                            className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-xs cursor-pointer"
                                            value={raiseData.targetUserId}
                                            onChange={(e) => setRaiseData({ ...raiseData, targetUserId: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select Employee --</option>
                                            <option value={user.id}>Self ({user.name})</option>
                                            {employees && employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                                            <select
                                                className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-xs cursor-pointer"
                                                value={raiseData.type}
                                                onChange={(e) => setRaiseData({ ...raiseData, type: e.target.value })}
                                            >
                                                <option value="COMPANY_PAYS_FIRST">1. Company Pays First</option>
                                                <option value="COMPANY_PAY_AFTER">2. Company Pay After</option>
                                                <option value="CLIENT_REFUND">3. Client Refund</option>
                                                <option value="VENDOR_PAYMENT">4. Vendor Payment</option>
                                                <option value="BH_VOUCHER">5. BH Vouchers</option>
                                                <option value="LEO_SIR_BH">6. Leo Sir BH</option>
                                                <option value="SANGHATAMIZH_MAM_BH">7. Sanghatamizh Mam BH</option>
                                                <option value="RAJKUMAR_SIR_BH">8. Rajkumar Sir BH</option>
                                                <option value="PUGAZH_SIR_BH">9. Pugazh Sir BH</option>
                                                <option value="RAMYA_MAM_BH">10. Ramya Mam BH</option>
                                                <option value="OFFICE_EXPENSES">11. Office Expenses</option>
                                                <option value="SALARY_ADVANCE">12. Salary Advance</option>
                                                <option value="CUSTOM">13. Custom Field</option>
                                                <option value="PREPAID">Prepaid (Legacy)</option>
                                                <option value="POSTPAID">Bill (Legacy)</option>
                                                <option value="ADVANCE">Advance (Legacy)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Spending Date</label>
                                            <input type="date" required className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-black text-xs" value={raiseData.date} onChange={(e) => setRaiseData({ ...raiseData, date: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                                            <input type="number" required placeholder="₹ 0.00" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-black text-xs" value={raiseData.amount} onChange={(e) => setRaiseData({ ...raiseData, amount: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose / Reason</label>
                                        <textarea required rows="3" placeholder="Explain the business need..." className="w-full px-5 sm:px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-xs sm:text-sm" value={raiseData.purpose} onChange={(e) => setRaiseData({ ...raiseData, purpose: e.target.value })} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                            <span>Proof / Bill Attachment</span>
                                            {['POSTPAID', 'COMPANY_PAY_AFTER'].includes(raiseData.type) && <span className="text-rose-500 font-black">MANDATORY</span>}
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                required={['POSTPAID', 'COMPANY_PAY_AFTER'].includes(raiseData.type)}
                                                accept="image/*,.pdf"
                                                className="hidden"
                                                id="am-voucher-proof"
                                                onChange={(e) => setRaiseData({ ...raiseData, proofFile: e.target.files[0] })}
                                            />
                                            <label
                                                htmlFor="am-voucher-proof"
                                                className="w-full pl-12 pr-6 py-3.5 sm:py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl focus-within:ring-8 focus-within:ring-blue-50 outline-none font-bold text-xs flex items-center cursor-pointer hover:border-blue-400 hover:bg-white transition-all overflow-hidden"
                                            >
                                                <Camera className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors" size={18} />
                                                <span className="truncate text-slate-500">
                                                    {raiseData.proofFile ? raiseData.proofFile.name : 'Select Proof (Image or PDF)...'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 mt-2">
                                        Submit for Approval
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
            {/* Carpenter Hub Modal */}
            <AnimatePresence>
                {showCarpenterModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
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
                            className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col relative z-10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Sticky Modal Header */}
                            <div className="p-5 sm:p-7 border-b border-slate-100 flex justify-between items-center flex-shrink-0 bg-white">
                                <div className="flex items-center gap-4 sm:gap-5">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl flex-shrink-0">
                                        <Hammer className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                            {editingCarpenterRecord ? 'Edit Carpenter Record' : 'Add Carpenter Record'}
                                        </h3>
                                        <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-widest">Project & Payment Details</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowCarpenterModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                    <XCircle size={26} />
                                </button>
                            </div>

                            {/* Scrollable Form Body */}
                            <form onSubmit={handleCarpenterSubmit} className="p-5 sm:p-7 md:p-8 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AE Name</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Balaji, Rajesh"
                                            className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
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
                                            className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
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
                                            className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
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
                                            className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
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
                                            className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
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
                                            className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
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
                                            className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
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
                                            className="w-full px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
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
                                        className="w-full px-5 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-8 focus:ring-blue-50 outline-none font-bold text-sm"
                                        value={carpenterData.remarks}
                                        onChange={(e) => setCarpenterData({ ...carpenterData, remarks: e.target.value })}
                                    />
                                </div>

                                <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">
                                    {editingCarpenterRecord ? 'Update Record' : 'Create Record'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Lightbox for Fullscreen Proof */}
            <AnimatePresence>
                {showLightbox && selectedVoucher?.proofUrl && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-8 lg:p-16">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLightbox(false)}
                            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md cursor-zoom-out"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full h-full flex items-center justify-center z-10 pointer-events-none"
                        >
                            {selectedVoucher.proofUrl.match(/\.pdf$/i) ? (
                                <iframe
                                    src={getFullProofUrl(selectedVoucher.proofUrl)}
                                    className="w-full h-full rounded-2xl shadow-2xl border-none pointer-events-auto bg-white"
                                    title="PDF Proof Viewer"
                                />
                            ) : (
                                <img
                                    src={getFullProofUrl(selectedVoucher.proofUrl)}
                                    alt="Full Proof"
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg pointer-events-auto"
                                />
                            )}
                            <button
                                onClick={() => setShowLightbox(false)}
                                className="absolute top-2 right-2 sm:top-0 sm:right-0 lg:-right-12 lg:-top-12 p-3 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all pointer-events-auto"
                                title="Close (Esc)"
                            >
                                <X size={32} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Hidden Report Template for PDF Export - Must be rendered but off-screen for html2pdf */}
            <div style={{
                position: 'fixed',
                top: '0',
                left: '0',
                width: '210mm', // A4 width
                opacity: '0',
                pointerEvents: 'none',
                zIndex: '-1000',
                backgroundColor: 'white'
            }}>
                <ExpenseReportTemplate
                    ref={reportRef}
                    data={spentHistory}
                    summary={financeSummary}
                    filters={{
                        search: historySearch,
                        status: historyStatus,
                        startDate: historyStartDate,
                        endDate: historyEndDate
                    }}
                />
            </div>
        </div>
    );
};

export default VoucherManagement;
