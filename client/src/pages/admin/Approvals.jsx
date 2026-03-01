import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { getPendingRequests, getRequestHistory, updateRequestStatus, deleteRequest, reset } from '../../features/admin/adminSlice';
import { Download, Calendar, X, AlertTriangle } from 'lucide-react';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';
import axios from 'axios';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

const Approvals = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { pendingRequests, requestHistory, isLoading, isError, message } = useSelector(
        (state) => state.admin
    );
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
    const [bhView, setBhView] = useState('mine'); // 'mine' or 'others' — Global BH only
    const [filterDate, setFilterDate] = useState(''); // Specific date if picked
    const [cycleRange, setCycleRange] = useState({ startDate: '', endDate: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const handleCycleChange = (range) => {
        setCycleRange(range);
        // Default to fetching for the whole cycle range
        // If we want to support specific date filtering within cycle, we keep filterDate
    };

    useEffect(() => {
        const params = filterDate ? { date: filterDate } : { startDate: cycleRange.startDate, endDate: cycleRange.endDate };

        if (activeTab === 'pending') {
            dispatch(getPendingRequests(params));
        } else {
            dispatch(getRequestHistory(params));
        }

        return () => { dispatch(reset()); };
    }, [dispatch, activeTab, filterDate, cycleRange]);

    const onUpdateStatus = (type, id, status) => {
        if (window.confirm(`Confirm ${status} action?`)) {
            dispatch(updateRequestStatus({ type, id, status }));
        }
    };

    const onDelete = (type, id) => {
        if (window.confirm('Are you sure you want to DELETE this request? This cannot be undone.')) {
            dispatch(deleteRequest({ type, id }));
        }
    };


    const handleExport = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/export/requests`, config);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `requests_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export requests.");
        }
    };

    const displayData = activeTab === 'pending' ? pendingRequests : requestHistory;


    const canDelete = ['ADMIN', 'HR'].includes(user?.role);
    const canApprove = ['HR', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role);
    const isGlobalBH = user?.role === 'BUSINESS_HEAD' && user?.isGlobalAccess;

    // For Global BH: split requests into Mine vs Others
    let leaves = displayData?.leaves || [];
    let permissions = displayData?.permissions || [];

    if (isGlobalBH && activeTab === 'pending') {
        if (bhView === 'mine') {
            leaves = leaves.filter(r => r.targetBhId === user.id || r.user?.reportingBhId === user.id);
            permissions = permissions.filter(r => r.targetBhId === user.id || r.user?.reportingBhId === user.id);
        } else {
            leaves = leaves.filter(r => r.targetBhId !== user.id && r.user?.reportingBhId !== user.id);
            permissions = permissions.filter(r => r.targetBhId !== user.id && r.user?.reportingBhId !== user.id);
        }
    }

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        leaves = leaves.filter(r => r.user?.name?.toLowerCase().includes(lowerTerm) || r.user?.email?.toLowerCase().includes(lowerTerm));
        permissions = permissions.filter(r => r.user?.name?.toLowerCase().includes(lowerTerm) || r.user?.email?.toLowerCase().includes(lowerTerm));
    }

    if (isLoading && activeTab === 'pending' && !pendingRequests.leaves) return <div className="p-8 text-center text-slate-500">Loading requests...</div>;

    if (isError) {
        return (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl border border-red-200">
                <p className="font-bold">Error loading requests</p>
                <p className="text-sm">{message}</p>
                <button
                    onClick={() => dispatch(activeTab === 'pending' ? getPendingRequests(filterDate) : getRequestHistory(filterDate))}
                    className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    const calculateDuration = (req) => {
        if (req.type === 'HALF_DAY') return 'Half Day ☀️';
        if (req.date) return '1 Day';
        if (req.startDate && req.endDate) {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays > 4 ? `${diffDays} Days (4+)` : `${diffDays} Days`;
        }
        return req.type;
    };

    const renderRequestCard = (req, type, typeLabel, color) => (
        <div key={`${type}-${req.id}`} className={`bg-white p-6 rounded-xl shadow-sm border border-l-4 transition-shadow hover:shadow-md ${req.status === 'PENDING' ? `border-l-${color}-500 border-slate-200` :
            req.status === 'APPROVED' ? 'border-l-green-500 border-slate-200 opacity-90' :
                'border-l-red-500 border-slate-200 opacity-90'
            }`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-bold text-slate-800">{req.user.name}</h4>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">{typeLabel}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`font-bold rounded-lg shadow-sm flex items-center gap-1
                         ${type === 'leave'
                            ? 'text-sm px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white'
                            : type === 'permission'
                                ? 'text-sm px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                                : `text-xs px-2 py-1 ${req.status === 'PENDING' ? `bg-${color}-100 text-${color}-700` :
                                    req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-700'}`
                        }`}>
                        {type === 'leave' ? (
                            <>
                                <span>🗓️</span>
                                {calculateDuration(req)}
                            </>
                        ) : type === 'permission' ? (
                            <>
                                <span>🕑</span>
                                2 HRS
                            </>
                        ) :
                            Object.keys(req).includes('sourceShowroom') ? 'Showroom Visit' : 'Site Visit'}
                        {activeTab === 'history' && type !== 'leave' && type !== 'permission' && ` (${req.status})`}
                    </span>
                    {canDelete && (
                        <button onClick={() => onDelete(type, req.id)} className="text-xs text-red-500 hover:text-red-700 underline">Delete</button>
                    )}
                </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
                {(req.isExceededLimit || (req.startDate && req.endDate && (Math.ceil(Math.abs(new Date(req.endDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24)) + 1) > 4)) && (
                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 animate-pulse shadow-sm">
                        <AlertTriangle size={10} />
                        {type === 'leave' ? 'LEAVE LIMIT EXCEEDED (4+ Days)' : 'PERMISSION LIMIT EXCEEDED (4+)'}
                    </span>
                )}
                {req.bhStatus === 'PENDING' && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-200 flex items-center gap-1">
                        ⏳ Waiting for BH
                    </span>
                )}
                {req.bhStatus === 'APPROVED' && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        ✅ Verified by {req.bhName || 'BH'}
                    </span>
                )}
                {req.bhStatus === 'REJECTED' && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full border border-red-200 flex items-center gap-1">
                        ❌ Rejected by {req.bhName || 'BH'}
                    </span>
                )}
            </div>

            <div className="space-y-2 mb-6">
                <p className="text-sm text-slate-600 flex items-center gap-2">
                    <span>🗓️</span>
                    {req.date ? formatDate(req.date) : `${formatDate(req.startDate)} - ${formatDate(req.endDate)}`}
                    {(req.startTime && req.endTime) && ` (${req.startTime} - ${req.endTime})`}
                </p>
                {req.location && <p className="text-sm text-slate-600">📍 {req.location} ({req.projectName})</p>}
                {req.sourceShowroom && <p className="text-sm text-slate-600">🚚 {req.sourceShowroom} ➡️ {req.destinationShowroom}</p>}

                <div className="mt-3 bg-blue-50/50 p-3 rounded-md border-l-4 border-blue-500">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">Reason</span>
                    <p className="text-sm font-bold text-slate-800 italic">"{req.reason}"</p>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mt-2 border-t border-slate-100 pt-2 bg-slate-50/50 -mx-6 px-6 -mb-6 pb-4 rounded-b-xl">
                    <span className="flex items-center gap-1">📅 Applied: <span className="text-slate-700">{formatDateTime(req.createdAt)}</span></span>
                    {activeTab === 'history' && (
                        <span>Updated: {formatDateTime(req.updatedAt || req.createdAt)}</span>
                    )}
                </div>
            </div>
            {activeTab === 'pending' && canApprove && (
                <div className="grid grid-cols-2 gap-3">
                    {/* For Global BH: In 'others' tab, always show monitoring badge */}
                    {(isGlobalBH && bhView === 'others') ? (
                        <div className="col-span-2 py-2.5 bg-amber-50 rounded-lg text-center text-amber-600 text-[10px] font-bold border border-amber-100 uppercase tracking-widest">
                            🌐 Monitoring — Other BH's Approval
                        </div>
                    ) : (user.role !== 'BUSINESS_HEAD' && user.role !== 'AE_MANAGER' ||
                        (req.targetBhId === user.id || req.user.reportingBhId === user.id)) ? (
                        <>
                            <button onClick={() => onUpdateStatus(type, req.id, 'APPROVED')} className="w-full py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-bold text-sm transition-colors">Approve</button>
                            <button onClick={() => onUpdateStatus(type, req.id, 'REJECTED')} className="w-full py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold text-sm transition-colors">Reject</button>
                        </>
                    ) : (
                        <div className="col-span-2 py-2.5 bg-slate-50 rounded-lg text-center text-slate-400 text-[10px] font-bold border border-slate-100 uppercase tracking-widest">
                            👁️ Monitoring Only
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'pending' && !canApprove && (
                <div className="py-2.5 bg-slate-50 rounded-lg text-center text-slate-400 text-[10px] font-bold border border-slate-100 uppercase tracking-widest">
                    👁️ Monitoring View (Authorization Required)
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Approvals</h2>
                    <p className="text-slate-500">Manage all employee requests.</p>

                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-400">🔍</span>
                        </div>
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 font-medium bg-white"
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export Requests</span>
                    </button>

                    <MonthCycleSelector onCycleChange={handleCycleChange} />

                    <div className="relative flex items-center group gap-2">
                        <motion.button
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                            className="h-10 px-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl font-bold text-xs shadow-[0_4px_15px_-3px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_20px_-4px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 whitespace-nowrap border border-white/10"
                        >
                            <Calendar size={14} strokeWidth={2.5} />
                            TODAY
                        </motion.button>

                        <div className="relative flex items-center group">
                            <div className="absolute left-3.5 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300 transform group-hover:scale-110">
                                <Calendar size={18} strokeWidth={2.5} />
                            </div>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="bg-white/80 backdrop-blur-sm pl-11 pr-10 py-2.5 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-700 font-bold text-sm shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-blue-300 w-[190px] appearance-none"
                            />
                            {filterDate ? (
                                <button
                                    onClick={() => setFilterDate('')}
                                    className="absolute right-3 p-1.5 rounded-xl bg-slate-100/50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90"
                                    title="Clear filter"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>
                            ) : (
                                <div className="absolute right-4 text-[10px] font-black text-slate-300 uppercase tracking-tighter pointer-events-none group-focus-within:opacity-0 transition-opacity">
                                    DATE
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pending'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Second-level tab for Global BH users */}
                {isGlobalBH && activeTab === 'pending' && (
                    <div className="col-span-full">
                        <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1.5 w-fit shadow-sm">
                            <button
                                onClick={() => setBhView('mine')}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${bhView === 'mine'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                ✅ My Approvals
                            </button>
                            <button
                                onClick={() => setBhView('others')}
                                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${bhView === 'others'
                                    ? 'bg-amber-500 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                            >
                                🌐 Other BH Approvals
                            </button>
                        </div>
                        {bhView === 'others' && (
                            <p className="mt-2 text-xs text-amber-600 font-semibold">
                                🔒 Monitoring only — you cannot approve requests assigned to other Business Heads.
                            </p>
                        )}
                    </div>
                )}

                {leaves.map(req => renderRequestCard(req, 'leave', 'Leave Request', 'orange'))}
                {permissions.map(req => renderRequestCard(req, 'permission', 'Permission', 'purple'))}

                {leaves.length === 0 && permissions.length === 0 && (
                    <div className="col-span-full border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                        <p className="text-slate-400 font-medium">
                            {isGlobalBH && activeTab === 'pending' && bhView === 'mine'
                                ? '✨ No pending requests assigned to you.'
                                : isGlobalBH && activeTab === 'pending' && bhView === 'others'
                                    ? '✨ No pending requests for other Business Heads.'
                                    : `✨ No ${activeTab} requests found.`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Approvals;
