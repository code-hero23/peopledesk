import React, { useEffect, useState } from 'react';
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
    Info
} from 'lucide-react';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';
import { getManageableWfhRequests, getWfhHistory, approveWfhRequest, reset } from '../../features/admin/adminSlice';
import { toast } from 'react-toastify';
import Spinner from '../../components/Spinner';
import { formatDate, formatTime } from '../../utils/dateUtils';

const WFHManagement = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { pendingRequests, requestHistory, isLoading, isError, isSuccess, message } = useSelector((state) => state.admin);

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [cycleRange, setCycleRange] = useState({ startDate: '', endDate: '' });

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
        }
        if (isSuccess && !isLoading) {
            // Success handled by individual thunks if needed
        }
        dispatch(reset());
    }, [isError, isSuccess, message, dispatch]);

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

    const displayRequests = activeTab === 'pending' ? pendingRequests?.wfh : requestHistory?.wfh;

    if (isLoading && (!displayRequests || displayRequests.length === 0)) return <Spinner />;

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                            <Home className="text-blue-600" /> WFH Approvals
                        </h1>
                        <p className="text-gray-500 mt-1">Manage 3-level Work From Home requests for your team.</p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        {activeTab === 'history' && (
                            <MonthCycleSelector onCycleChange={handleCycleChange} />
                        )}

                        <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => { setActiveTab('pending'); setSelectedRequest(null); }}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pending'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => { setActiveTab('history'); setSelectedRequest(null); }}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'history'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                History
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* List View */}
                    <div className="lg:col-span-2 space-y-4">
                        {(!displayRequests || displayRequests.length === 0) ? (
                            <div className="bg-white p-12 rounded-2xl shadow-sm text-center border-2 border-dashed border-gray-200">
                                <CheckCircle2 className="mx-auto text-green-400 mb-4" size={48} />
                                <h3 className="text-xl font-bold text-gray-800">No {activeTab === 'pending' ? 'Pending' : 'History'} Requests</h3>
                                <p className="text-gray-500 mt-2">{activeTab === 'pending' ? 'All caught up! New requests will appear here.' : 'No data found for this period.'}</p>
                            </div>
                        ) : (
                            displayRequests.map((request) => (
                                <motion.div
                                    layoutId={request.id}
                                    key={request.id}
                                    className={`bg-white p-5 rounded-2xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${selectedRequest?.id === request.id ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-100'}`}
                                    onClick={() => setSelectedRequest(request)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <div className="hidden sm:flex h-12 w-12 rounded-full bg-blue-100 text-blue-600 items-center justify-center font-bold text-lg">
                                                {request.employeeName[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">{request.employeeName}</h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded uppercase font-semibold text-[10px] tracking-wider">{request.designation}</span>
                                                    <span>•</span>
                                                    <span>{request.wfhDays} Days</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(request.startDate)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                                                LEVEL {request.currentLevel}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1 font-medium">{formatTime(request.createdAt)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex -space-x-2">
                                                <div title="HR Status" className={`h-6 w-6 rounded-full border-2 border-white flex items-center justify-center ${request.hrStatus === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                    <Check size={12} />
                                                </div>
                                                <div title="BH Status" className={`h-6 w-6 rounded-full border-2 border-white flex items-center justify-center ${request.bhStatus === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                    <Check size={12} />
                                                </div>
                                                <div title="Admin Status" className={`h-6 w-6 rounded-full border-2 border-white flex items-center justify-center ${request.adminStatus === 'APPROVED' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                    <Check size={12} />
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400 font-medium">Approval Chain</span>
                                        </div>
                                        <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-2xl text-base font-extrabold flex items-center gap-2 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.5)] hover:shadow-[0_8px_30px_-4px_rgba(79,70,229,0.7)] transform hover:-translate-y-1.5 hover:scale-[1.03] active:scale-95 transition-all duration-300 relative overflow-hidden group">
                                            <div className="absolute inset-0 w-1/3 h-full bg-white/25 skew-x-12 -translate-x-[250%] group-hover:translate-x-[300%] transition-transform duration-700 ease-in-out" />
                                            <span className="relative flex items-center gap-2">Verify & Approve <Eye size={20} className="group-hover:animate-pulse" /></span>
                                        </button>
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
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-3xl shadow-xl overflow-hidden border border-blue-100 flex flex-col h-[700px]"
                                >
                                    <div className="p-6 bg-gradient-to-br from-gray-900 to-blue-900 text-white">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h2 className="text-xl font-bold">Request Detail</h2>
                                                <p className="text-blue-200 text-xs">#{selectedRequest.id}</p>
                                            </div>
                                            <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                        {/* Core Details */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 border border-gray-100 text-gray-400 rounded-lg"><Info size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Primary Reason</p>
                                                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{selectedRequest.realReason}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="p-2 border border-blue-100 text-blue-500 rounded-lg"><Home size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Necessity</p>
                                                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{selectedRequest.necessityReason}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="p-2 border border-red-100 text-red-500 rounded-lg"><AlertCircle size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Impact if Rejected</p>
                                                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{selectedRequest.impactIfRejected}</p>
                                                </div>
                                            </div>

                                            <hr className="border-gray-100 my-4" />

                                            <div className="flex items-center gap-3">
                                                <div className="p-2 border border-indigo-100 text-indigo-500 rounded-lg"><Briefcase size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Primary Project</p>
                                                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{selectedRequest.primaryProject || "N/A"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="p-2 border border-purple-100 text-purple-500 rounded-lg"><CheckCircle2 size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Deliverables</p>
                                                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{selectedRequest.deliverables}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="p-2 border border-green-100 text-green-500 rounded-lg"><Clock size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Working Hours & Communication</p>
                                                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{selectedRequest.workingHours} | {selectedRequest.communicationPlan}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Response Time: {selectedRequest.responseTime} mins</p>
                                                </div>
                                            </div>

                                            <hr className="border-gray-100 my-4" />

                                            <div className="flex items-center gap-3">
                                                <div className="p-2 border border-orange-100 text-orange-500 rounded-lg"><Shield size={20} /></div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Risk & Failure Plan</p>
                                                    <p className="text-sm font-medium text-gray-800 leading-relaxed"><span className="font-semibold text-xs text-gray-500">Risks:</span> {selectedRequest.risksManagement}</p>
                                                    <p className="text-sm font-medium text-gray-800 leading-relaxed"><span className="font-semibold text-xs text-gray-500">Backup:</span> {selectedRequest.failurePlan}</p>
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                                                <div className="flex justify-between text-xs font-bold text-gray-500">
                                                    <span>Setup Compliance</span>
                                                    <span className="text-green-600">Verified</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                                                    <span className={`px-2 py-1 rounded-md ${selectedRequest.hasStableInternet ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Internet</span>
                                                    <span className={`px-2 py-1 rounded-md ${selectedRequest.hasPowerBackup ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Power</span>
                                                    <span className={`px-2 py-1 rounded-md ${selectedRequest.hasDedicatedWorkspace ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Workspace</span>
                                                    <span className={`px-2 py-1 rounded-md ${selectedRequest.officeVisitCommitment ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Office Visit</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Section */}
                                        <div className="pt-6 border-t border-gray-100">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Remarks / Note</label>
                                            <div className="relative">
                                                <textarea
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 focus:border-blue-500 rounded-2xl outline-none transition-all h-24 text-sm"
                                                    placeholder="Add approval context or rejection reason..."
                                                />
                                                <MessageSquare className="absolute right-4 bottom-4 text-gray-300" size={20} />
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
                                                    className="flex-1 py-3 px-4 bg-white border-2 border-red-100 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <X size={18} /> Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(selectedRequest.id)}
                                                    disabled={isLoading}
                                                    className="flex-[2] py-3 px-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Check size={18} /> Approve Layer
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-full text-center py-3 bg-gray-100 text-gray-500 font-bold rounded-2xl border border-gray-200">
                                                Request Completed ({selectedRequest.status})
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="hidden lg:flex flex-col items-center justify-center h-[600px] border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 p-8 text-center">
                                    <Shield size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold text-lg">Strict Approval System</p>
                                    <p className="text-sm mt-2">Select a request from the list to review the 360-degree justification and take action.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WFHManagement;
