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
import { formatDate, formatTime } from '../../utils/dateUtils';
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
        if (window.confirm('Are you sure you want to PERMANENTLY DELETE this WFH request?')) {
            dispatch(deleteRequest({ type: 'wfh', id }));
            setSelectedRequest(null);
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* List View */}
                    <div className="lg:col-span-2 space-y-5">
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
                                            <button className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm border border-slate-100 hover:bg-white transition-all">
                                                REVIEW <Eye size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Detail View / Actions */}
                    <div className="lg:col-span-1">
                        <AnimatePresence mode="wait">
                            {selectedRequest ? (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-blue-100 flex flex-col h-[750px] sticky top-6"
                                >
                                    <div className="p-6 bg-gradient-to-br from-gray-900 to-blue-900 text-white relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                                            <Shield size={120} />
                                        </div>
                                        <div className="relative z-10 flex justify-between items-start">
                                            <div>
                                                <p className="text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase mb-1">Strict Request Protocol</p>
                                                <h2 className="text-2xl font-black">Case File #{selectedRequest.id}</h2>
                                                <p className="text-blue-200/60 text-xs font-medium uppercase tracking-widest mt-1 italic">{selectedRequest.employeeName}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handlePrint} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all" title="Generate PDF">
                                                    <FileDown size={18} />
                                                </button>
                                                <button onClick={() => setSelectedRequest(null)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                                        {/* Deletion Option (Admin/HR Only) */}
                                        {['ADMIN', 'HR'].includes(user?.role) && (
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => onDelete(selectedRequest.id)}
                                                    className="flex items-center gap-1.5 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={12} /> Delete Case
                                                </button>
                                            </div>
                                        )}

                                        {/* Core Details */}
                                        <div className="space-y-5">
                                            <DetailSection icon={<Info size={16} />} title="Primary Reason" content={selectedRequest.realReason} color="slate" />
                                            <DetailSection icon={<Home size={16} />} title="Necessity" content={selectedRequest.necessityReason} color="blue" />
                                            <DetailSection icon={<AlertCircle size={16} />} title="Risk Projection" content={selectedRequest.impactIfRejected} color="red" />

                                            <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent my-4" />

                                            <DetailSection icon={<Briefcase size={16} />} title="Project Focus" content={selectedRequest.primaryProject || "N/A"} color="indigo" />
                                            <DetailSection icon={<CheckCircle2 size={16} />} title="Deliverables" content={selectedRequest.deliverables} color="purple" />

                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Clock size={16} className="text-blue-600" />
                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Availability</p>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 leading-relaxed italic">"{selectedRequest.workingHours}"</p>
                                                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Response Time</span>
                                                    <span className="text-xs font-black text-blue-600">{selectedRequest.responseTime} MINS</span>
                                                </div>
                                            </div>

                                            <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 space-y-4">
                                                <div className="flex justify-between items-center text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">
                                                    <span>Setup Compliance</span>
                                                    <Shield size={14} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <ComplianceBadge label="Internet" active={selectedRequest.hasStableInternet} />
                                                    <ComplianceBadge label="Power" active={selectedRequest.hasPowerBackup} />
                                                    <ComplianceBadge label="Workspace" active={selectedRequest.hasDedicatedWorkspace} />
                                                    <ComplianceBadge label="Office Visit" active={selectedRequest.officeVisitCommitment} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remarks Section */}
                                        <div className="pt-6 border-t border-gray-100">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-3">Decision Remarks</label>
                                            <div className="relative group">
                                                <textarea
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all h-28 text-sm font-medium leading-relaxed"
                                                    placeholder="Provide context for your decision..."
                                                />
                                                <MessageSquare className="absolute right-4 bottom-4 text-gray-300 pointer-events-none group-focus-within:text-blue-400 transition-colors" size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Buttons */}
                                    <div className="p-6 bg-gray-50 border-t flex gap-3">
                                        {activeTab === 'pending' ? (
                                            <>
                                                <button
                                                    onClick={() => handleReject(selectedRequest.id)}
                                                    disabled={isLoading}
                                                    className="flex-1 py-4 px-4 bg-white border-2 border-red-50 text-red-500 font-black rounded-2xl hover:bg-red-50 active:scale-95 transition-all text-xs uppercase tracking-widest shadow-sm"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(selectedRequest.id)}
                                                    disabled={isLoading}
                                                    className="flex-[2] py-4 px-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                                                >
                                                    <Check size={16} /> Approve Layer
                                                </button>
                                            </>
                                        ) : (
                                            <div className={`w-full text-center py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 ${selectedRequest.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                                                }`}>
                                                {selectedRequest.status}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="hidden lg:flex flex-col items-center justify-center h-[750px] border-4 border-dashed border-slate-100 rounded-[40px] text-slate-300 p-12 text-center group transition-all hover:border-blue-50 hover:bg-blue-50/5">
                                    <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all duration-500">
                                        <Shield size={40} className="opacity-40" />
                                    </div>
                                    <p className="font-black text-xl text-slate-400 group-hover:text-blue-900 transition-colors">Case Insight Panel</p>
                                    <p className="text-xs mt-4 font-bold leading-relaxed text-slate-300 group-hover:text-slate-500 transition-colors">Select a request file to begin high-level review of personal justification, infrastructure compliance, and work deliverables.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
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
            {active ? (<><CheckCircle2 size={10} /> VERIFIED</>) : (<><XCircle size={10} /> MISSING</>)}
        </span>
    </div>
);

const XCircle = ({ size, className }) => <X size={size} className={className} />;

export default WFHManagement;
