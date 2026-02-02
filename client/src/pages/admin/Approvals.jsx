import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getPendingRequests, getRequestHistory, updateRequestStatus, deleteRequest, reset } from '../../features/admin/adminSlice';
import { Download } from 'lucide-react';
import axios from 'axios';

const Approvals = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { pendingRequests, requestHistory, isLoading, isError, message } = useSelector(
        (state) => state.admin
    );
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

    useEffect(() => {
        if (activeTab === 'pending') {
            dispatch(getPendingRequests());
        } else {
            dispatch(getRequestHistory());
        }

        return () => { dispatch(reset()); };
    }, [dispatch, activeTab]);

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

    const leaves = displayData?.leaves || [];
    const permissions = displayData?.permissions || [];
    const siteVisits = displayData?.siteVisits || [];
    const showroomVisits = displayData?.showroomVisits || [];

    const canDelete = ['ADMIN', 'HR'].includes(user?.role);
    const canApprove = ['HR', 'BUSINESS_HEAD', 'AE_MANAGER'].includes(user?.role);

    if (isLoading && activeTab === 'pending' && !pendingRequests.leaves) return <div className="p-8 text-center text-slate-500">Loading requests...</div>;

    if (isError) {
        return (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl border border-red-200">
                <p className="font-bold">Error loading requests</p>
                <p className="text-sm">{message}</p>
                <button
                    onClick={() => dispatch(activeTab === 'pending' ? getPendingRequests() : getRequestHistory())}
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
            return `${diffDays} Days`;
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
                    {req.date ? new Date(req.date).toLocaleDateString() : `${new Date(req.startDate).toLocaleDateString()} - ${new Date(req.endDate).toLocaleDateString()}`}
                    {(req.startTime && req.endTime) && ` (${req.startTime} - ${req.endTime})`}
                </p>
                {req.location && <p className="text-sm text-slate-600">📍 {req.location} ({req.projectName})</p>}
                {req.sourceShowroom && <p className="text-sm text-slate-600">🚚 {req.sourceShowroom} ➡️ {req.destinationShowroom}</p>}

                <div className="mt-3 bg-blue-50/50 p-3 rounded-md border-l-4 border-blue-500">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">Reason</span>
                    <p className="text-sm font-bold text-slate-800 italic">"{req.reason}"</p>
                </div>

                {activeTab === 'history' && (
                    <p className="text-xs text-slate-400 mt-2">Updated: {new Date(req.updatedAt || req.createdAt).toLocaleString()}</p>
                )}
            </div>
            {activeTab === 'pending' && canApprove && (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => onUpdateStatus(type, req.id, 'APPROVED')} className="w-full py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-bold text-sm transition-colors">Approve</button>
                    <button onClick={() => onUpdateStatus(type, req.id, 'REJECTED')} className="w-full py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold text-sm transition-colors">Reject</button>
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

                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export Requests</span>
                    </button>
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
                {leaves.map(req => renderRequestCard(req, 'leave', 'Leave Request', 'orange'))}
                {permissions.map(req => renderRequestCard(req, 'permission', 'Permission', 'purple'))}

                {leaves.length === 0 && permissions.length === 0 && (
                    <div className="col-span-full border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                        <p className="text-slate-400 font-medium">✨ No {activeTab} requests found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Approvals;
