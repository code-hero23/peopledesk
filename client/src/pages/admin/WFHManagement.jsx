import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check,
    X,
    Eye,
    Clock,
    User,
    MessageSquare,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Briefcase,
    Shield,
    Home,
    Info,
    Trash2,
    FileDown,
    Printer,
    Search
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';
import { getManageableWfhRequests, getWfhHistory, approveWfhRequest, deleteRequest, reset } from '../../features/admin/adminSlice';
import { toast } from 'react-toastify';
import Spinner from '../../components/Spinner';
import { formatDate, formatTime, formatDateTime } from '../../utils/dateUtils';
import { WFHPrintTemplate } from '../../components/admin/WFHPrintTemplate';

const WFHManagement = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { pendingRequests, requestHistory, isLoading, isError, isSuccess, message } = useSelector((state) => state.admin);

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [activeTab, setActiveTab] = useState('pending');
    const [cycleRange, setCycleRange] = useState({ startDate: '', endDate: '' });
    const [filterDate, setFilterDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const componentRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `WFH_Request_${selectedRequest?.employeeName}_${selectedRequest?.id}`,
    });

    const handleCycleChange = (range) => {
        setCycleRange(range);
    };

    useEffect(() => {
        if (activeTab === 'pending') {
            dispatch(getManageableWfhRequests());
        } else {
            if (cycleRange.startDate && cycleRange.endDate) {
                dispatch(getWfhHistory({ startDate: cycleRange.startDate, endDate: cycleRange.endDate }));
            }
        }
    }, [dispatch, activeTab, cycleRange]);

    useEffect(() => {
        if (isError) {
            toast.error(message);
            dispatch(reset());
        }
        if (isSuccess && !isLoading) {
            dispatch(reset());
        }
    }, [isError, isSuccess, message, dispatch, isLoading]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            dispatch(reset());
        };
    }, [dispatch]);

    const handleApprove = (id) => {
        dispatch(approveWfhRequest({ id, status: 'APPROVED', remarks }));
        setSelectedRequest(null);
        setRemarks('');
    };

    const handleReject = (id) => {
        if (!remarks) {
            toast.error('Please provide remarks for rejection');
            return;
        }
        dispatch(approveWfhRequest({ id, status: 'REJECTED', remarks }));
        setSelectedRequest(null);
        setRemarks('');
    };

    const onDelete = (id) => {
        if (window.confirm('Are you sure you want to PERMANENTLY DELETE this WFH request? This action cannot be undone.')) {
            dispatch(deleteRequest({ type: 'wfh', id }))
                .unwrap()
                .then(() => {
                    toast.success('Request deleted successfully');
                    setSelectedRequest(null);
                })
                .catch((err) => {
                    toast.error(err || 'Failed to delete request');
                });
            setRemarks('');
        }
    };

    let displayRequests = activeTab === 'pending' ? (pendingRequests?.wfh || []) : (requestHistory?.wfh || []);

    // Apply Filter Date (Overlap Check)
    if (filterDate) {
        const selected = new Date(filterDate);
        selected.setHours(0, 0, 0, 0);

        displayRequests = displayRequests.filter(req => {
            const start = new Date(req.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(req.endDate);
            end.setHours(23, 59, 59, 999);

            return selected >= start && selected <= end;
        });
    }

    // Apply Search Term
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        displayRequests = displayRequests.filter(req =>
            req.employeeName?.toLowerCase().includes(lowerTerm) ||
            req.id?.toString().includes(lowerTerm)
        );
    }

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Hidden Print Template */}
                <div style={{ display: 'none' }}>
                    <WFHPrintTemplate ref={componentRef} request={selectedRequest} />
                </div>

                {/* Header */}
                <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                                <Home className="text-white" size={24} />
                            </div>
                            WFH Approvals
                        </h1>
                        <p className="text-slate-500 mt-2 font-medium">Review and manage team remote work protocol requests.</p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center w-full xl:w-auto">
                        {/* Tabs */}
                        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                            <button
                                onClick={() => { setActiveTab('pending'); setSelectedRequest(null); }}
                                className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all tracking-widest ${activeTab === 'pending'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                PENDING
                            </button>
                            <button
                                onClick={() => { setActiveTab('history'); setSelectedRequest(null); }}
                                className={`px-6 py-2.5 text-xs font-black rounded-xl transition-all tracking-widest ${activeTab === 'history'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'text-slate-500 hover:text-slate-900'
                                    }`}
                            >
                                HISTORY
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[240px] xl:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name or case ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-4 py-3 w-full bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-medium transition-all shadow-sm"
                            />
                        </div>

                        {/* Enhanced Date Selector */}
                        <div className="relative group min-w-[200px]">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 z-10 pointer-events-none">
                                <Calendar size={18} />
                            </div>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="pl-12 pr-10 py-3 w-full bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 transition-all shadow-sm appearance-none cursor-pointer"
                            />
                            {filterDate ? (
                                <button
                                    onClick={() => setFilterDate('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                >
                                    <X size={16} />
                                </button>
                            ) : (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                                    <span className="text-[10px] font-black uppercase tracking-tighter">Filter</span>
                                </div>
                            )}
                        </div>

                        {activeTab === 'history' && (
                            <div className="w-full xl:w-auto">
                                <MonthCycleSelector onCycleChange={handleCycleChange} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 gap-8">
                    {/* List View */}
                    <div className="space-y-5">
                        {isLoading && (!displayRequests || displayRequests.length === 0) ? (
                            <div className="flex justify-center items-center py-32 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                                <Spinner />
                            </div>
                        ) : (!displayRequests || displayRequests.length === 0) ? (
                            <div className="bg-white p-20 rounded-[2rem] shadow-sm text-center border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="text-slate-300" size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">Clear Desk</h3>
                                <p className="text-slate-500 mt-3 font-medium max-w-xs mx-auto">
                                    {filterDate
                                        ? `No requests found for ${formatDate(filterDate)}.`
                                        : `No ${activeTab} requests to display at the moment.`}
                                </p>
                                {filterDate && (
                                    <button
                                        onClick={() => setFilterDate('')}
                                        className="mt-6 text-blue-600 font-black text-xs uppercase tracking-widest hover:text-blue-700 underline underline-offset-4"
                                    >
                                        Clear Date Filter
                                    </button>
                                )}
                            </div>
                        ) : (
                            displayRequests.map((request) => (
                                <motion.div
                                    layoutId={request.id}
                                    key={request.id}
                                    className={`bg-white p-6 rounded-[2rem] shadow-sm border-2 transition-all cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 group ${selectedRequest?.id === request.id ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-50'}`}
                                    onClick={() => setSelectedRequest(request)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <div className={`hidden sm:flex h-12 w-12 rounded-2xl items-center justify-center font-bold text-lg shadow-inner ${selectedRequest?.id === request.id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                                {request.employeeName[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight">{request.employeeName}</h3>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 font-medium">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] tracking-wider font-extrabold uppercase">{request.designation}</span>
                                                    <span className="h-1 w-1 bg-gray-300 rounded-full" />
                                                    <span className="text-slate-700 font-bold">{request.wfhDays} Days</span>
                                                    <span className="h-1 w-1 bg-gray-300 rounded-full" />
                                                    <span className="flex items-center gap-1 font-bold text-slate-600"><Calendar size={12} className="text-blue-500" /> {formatDate(request.startDate)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black tracking-widest text-blue-600 bg-blue-100 px-3 py-1 rounded-full inline-block uppercase">
                                                LEVEL {request.currentLevel}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tighter">{formatTime(request.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex -space-x-1.5">
                                                <ChainCircle status={request.hrStatus} label="HR" />
                                                <ChainCircle status={request.bhStatus} label="BH" />
                                                <ChainCircle status={request.adminStatus} label="AD" />
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Route</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {['ADMIN', 'HR'].includes(user?.role) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(request.id);
                                                    }}
                                                    className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all border border-rose-100/50"
                                                    title="Delete Request"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <button className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm border border-slate-100 hover:bg-white transition-all">
                                                REVIEW <Eye size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Redesigned Selection Modal (Full Screen Overlay) */}
                    <AnimatePresence>
                        {selectedRequest && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedRequest(null)}
                                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                                />

                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] border border-blue-100"
                                >
                                    {/* Modal Header (Sticky) */}
                                    <div className="p-6 bg-gradient-to-br from-slate-900 to-blue-900 text-white flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-600 rounded-xl shadow-lg ring-4 ring-blue-500/20">
                                                <Shield size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black tracking-tight uppercase">Strategic Case Review</h2>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-blue-300/60">ID #WFH-{selectedRequest.id} • Internal Compliance Audit</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handlePrint} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all" title="Print PDF">
                                                <Printer size={20} />
                                            </button>
                                            <button onClick={() => setSelectedRequest(null)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modal Body (Scrollable) */}
                                    <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-12 bg-slate-50/50 custom-scrollbar">
                                        {/* Employee Profile Header */}
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-8 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] -rotate-12 scale-150 pointer-events-none">
                                                <User size={120} />
                                            </div>
                                            <div className="flex gap-6 items-center relative z-10">
                                                <div className="h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-200">
                                                    {selectedRequest.employeeName[0]}
                                                </div>
                                                <div>
                                                    <h3 className="text-3xl font-black text-slate-900 leading-tight">{selectedRequest.employeeName}</h3>
                                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">{selectedRequest.designation}</span>
                                                        <span className="h-1.5 w-1.5 bg-slate-200 rounded-full" />
                                                        <span className="text-xs font-bold text-slate-400">ID: {selectedRequest.userId}</span>
                                                        <span className="h-1.5 w-1.5 bg-slate-200 rounded-full" />
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <Clock size={12} className="text-blue-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Applied: {formatDateTime(selectedRequest.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 relative z-10">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Duration Requested</p>
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <Calendar size={16} className="text-blue-500" />
                                                        <span className="text-2xl font-black text-slate-800">{selectedRequest.wfhDays} Days</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-500 mt-1">Starting {formatDate(selectedRequest.startDate)}</p>
                                                </div>
                                                <div className="h-12 w-px bg-slate-100 mx-2" />
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Current Approval Status</p>
                                                    <div className="flex -space-x-1.5 mt-2">
                                                        <ChainCircle status={selectedRequest.hrStatus} label="HR" />
                                                        <ChainCircle status={selectedRequest.bhStatus} label="BH" />
                                                        <ChainCircle status={selectedRequest.adminStatus} label="AD" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Left Side: Reasons */}
                                            <div className="space-y-8">
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 bg-blue-600 rounded-full" /> Personal Justification
                                                    </h4>
                                                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                                                        <DetailSection icon={<Info size={20} />} title="Primary Reason" content={selectedRequest.realReason} color="slate" />
                                                        <DetailSection icon={<Home size={20} />} title="Necessity Assessment" content={selectedRequest.necessityReason} color="blue" />
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 bg-rose-500 rounded-full" /> Impact Risk Profile
                                                    </h4>
                                                    <div className="bg-rose-50/50 p-8 rounded-[2rem] border border-rose-100 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-110 transition-transform"><AlertCircle size={60} /></div>
                                                        <p className="text-sm font-black text-rose-900 leading-relaxed italic relative z-10">"{selectedRequest.impactIfRejected}"</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Side: Work Plan */}
                                            <div className="space-y-8">
                                                <div className="space-y-6 h-full flex flex-col">
                                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full" /> Operational Execution
                                                    </h4>
                                                    <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden flex-1 group">
                                                        <div className="absolute -top-10 -right-10 p-20 opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform"><Briefcase size={200} /></div>
                                                        <div className="relative z-10 space-y-6">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Targeted Project Focus</p>
                                                                <p className="text-xl font-black text-blue-400">{selectedRequest.primaryProject || "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Concrete Deliverables</p>
                                                                <p className="text-sm font-medium text-slate-300 leading-relaxed">{selectedRequest.deliverables}</p>
                                                            </div>
                                                            <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-white/5 rounded-lg"><Clock size={16} className="text-blue-400" /></div>
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Availability Window</span>
                                                                    </div>
                                                                    <span className="text-xs font-black text-white italic">{selectedRequest.workingHours}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-white/5 rounded-lg"><MessageSquare size={16} className="text-purple-400" /></div>
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Comm. Strategy</span>
                                                                    </div>
                                                                    <span className="text-xs font-black text-white">{selectedRequest.communicationPlan || "N/A"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Infrastructure Compliance Row */}
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 bg-emerald-600 rounded-full" /> Infrastructure Compliance
                                            </h4>
                                            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6">
                                                <ComplianceBadge label="Internet Integrity" active={selectedRequest.hasStableInternet} />
                                                <ComplianceBadge label="Power Sustenance" active={selectedRequest.hasPowerBackup} />
                                                <ComplianceBadge label="Setup Assessment" active={selectedRequest.hasDedicatedWorkspace} />
                                                <ComplianceBadge label="Protocol Commitment" active={selectedRequest.officeVisitCommitment} />
                                            </div>
                                        </div>

                                        {/* Action Remarks */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Institutional Remarks (Internal)</label>
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Formal Decision Required</span>
                                            </div>
                                            <div className="relative group shadow-xl shadow-slate-200/50 rounded-[2rem]">
                                                <textarea
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    className="w-full p-8 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-[2rem] outline-none transition-all h-32 text-sm font-medium leading-relaxed resize-none"
                                                    placeholder="Provide detailed context for this decision entry..."
                                                />
                                                <MessageSquare className="absolute right-8 bottom-8 text-slate-200 group-focus-within:text-blue-500 transition-colors" size={24} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="p-8 bg-white border-t border-slate-100 shrink-0 flex flex-col items-center">
                                        <div className="w-full flex gap-4 max-w-2xl mx-auto">
                                            {activeTab === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleReject(selectedRequest.id)}
                                                        className="flex-1 py-5 bg-white border-2 border-rose-100 text-rose-500 font-black rounded-[1.5rem] hover:bg-rose-50 transition-all text-xs uppercase tracking-[0.2em] active:scale-95 shadow-sm"
                                                    >
                                                        Deny Request
                                                    </button>
                                                    <button
                                                        onClick={() => handleApprove(selectedRequest.id)}
                                                        className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-[1.5rem] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all text-xs uppercase tracking-[0.2em] active:scale-95 flex items-center justify-center gap-3"
                                                    >
                                                        <Check size={20} strokeWidth={3} /> Approve Protocol Layer
                                                    </button>
                                                    {['ADMIN', 'HR'].includes(user?.role) && (
                                                        <button
                                                            onClick={() => onDelete(selectedRequest.id)}
                                                            className="p-5 bg-rose-50 text-rose-500 font-black rounded-[1.5rem] hover:bg-rose-100 transition-all flex items-center justify-center shadow-sm"
                                                            title="Permanently Delete Request"
                                                        >
                                                            <Trash2 size={24} />
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="w-full flex gap-4">
                                                    <div className={`flex-[3] text-center py-6 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.4em] border-2 shadow-sm ${selectedRequest.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                        VERIFICATION STATUS: {selectedRequest.status}
                                                    </div>
                                                    {['ADMIN', 'HR'].includes(user?.role) && (
                                                        <button
                                                            onClick={() => onDelete(selectedRequest.id)}
                                                            className="flex-1 py-6 bg-rose-50 text-rose-500 font-black rounded-[1.5rem] hover:bg-rose-100 transition-all flex items-center justify-center border-2 border-rose-100 shadow-sm"
                                                            title="Permanently Delete Records"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-4 text-[9px] font-black text-slate-300 uppercase tracking-widest text-center">
                                            Data integrity secured via localized encryption • Case ID #WFH-{selectedRequest.id}
                                        </p>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

// UI Components
const ChainCircle = ({ status, label }) => (
    <div
        title={`${label} Status`}
        className={`h-7 w-7 rounded-xl border-[2.5px] border-white flex items-center justify-center text-[8px] font-black shadow-sm transition-all ${status === 'APPROVED' ? 'bg-emerald-500 text-white' :
            status === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-400'
            }`}
    >
        {status === 'APPROVED' ? <Check size={12} strokeWidth={4} /> : status === 'REJECTED' ? <X size={12} strokeWidth={4} /> : label}
    </div>
);

const DetailSection = ({ icon, title, content, color }) => {
    const colors = {
        slate: 'bg-slate-50 text-slate-500 border-slate-100',
        blue: 'bg-blue-50/50 text-blue-500 border-blue-100',
        red: 'bg-red-50/50 text-red-500 border-red-100',
        indigo: 'bg-indigo-50/50 text-indigo-500 border-indigo-100',
        purple: 'bg-purple-50/50 text-purple-500 border-purple-100',
    };
    return (
        <div className="flex gap-4 group">
            <div className={`mt-1 p-2 rounded-xl border ${colors[color]} shrink-0 transition-transform group-hover:scale-110 shadow-sm`}>{icon}</div>
            <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] mb-1">{title}</p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">{content || "N/A"}</p>
            </div>
        </div>
    );
};

const ComplianceBadge = ({ label, active }) => (
    <div className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${active ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100 opacity-60'
        }`}>
        <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-emerald-700' : 'text-red-700'}`}>{label}</span>
        <span className={`text-[10px] font-extrabold flex items-center gap-1 ${active ? 'text-emerald-600' : 'text-red-500'}`}>
            {active ? (<><CheckCircle2 size={10} /> VERIFIED</>) : (<><X size={10} strokeWidth={2} /> MISSING</>)}
        </span>
    </div>
);

export default WFHManagement;
