import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getPendingRequests, getRequestHistory, updateRequestStatus, reset } from '../../features/admin/adminSlice';

const Approvals = () => {
    const dispatch = useDispatch();
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

    const displayData = activeTab === 'pending' ? pendingRequests : requestHistory;
    // Handle potential undefined/null data gracefully
    const leaves = displayData?.leaves || [];
    const permissions = displayData?.permissions || [];

    if (isLoading && activeTab === 'pending' && !pendingRequests.leaves) return <div className="p-8 text-center text-slate-500">Loading requests...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Approvals</h2>
                    <p className="text-slate-500">Manage leave and permission requests.</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Maps for Leaves */}
                {leaves.map((req) => (
                    <div key={`leave-${req.id}`} className={`bg-white p-6 rounded-xl shadow-sm border border-l-4 transition-shadow hover:shadow-md ${req.status === 'PENDING' ? 'border-l-orange-500 border-slate-200' :
                        req.status === 'APPROVED' ? 'border-l-green-500 border-slate-200 opacity-90' :
                            'border-l-red-500 border-slate-200 opacity-90'
                        }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800">{req.user.name}</h4>
                                <span className="text-xs text-slate-500 uppercase tracking-wide">Leave Request</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {req.type}
                                {activeTab === 'history' && ` (${req.status})`}
                            </span>
                            {req.bhStatus === 'APPROVED' && (
                                <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                                    ✅ Verified by {req.bhName || 'BH'}
                                </span>
                            )}
                            {req.bhStatus === 'REJECTED' && (
                                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full border border-red-200 flex items-center gap-1">
                                    ❌ Rejected by {req.bhName || 'BH'}
                                </span>
                            )}
                        </div>
                        <div className="space-y-2 mb-6">
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                                <span>🗓️</span> {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3">"{req.reason}"</p>
                            {activeTab === 'history' && (
                                <p className="text-xs text-slate-400 mt-2">Updated: {new Date(req.updatedAt || req.createdAt).toLocaleString()}</p>
                            )}
                        </div>
                        {activeTab === 'pending' && (
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => onUpdateStatus('leave', req.id, 'APPROVED')} className="w-full py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-bold text-sm transition-colors">Approve</button>
                                <button onClick={() => onUpdateStatus('leave', req.id, 'REJECTED')} className="w-full py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold text-sm transition-colors">Reject</button>
                            </div>
                        )}
                    </div>
                ))}
                {/* Maps for Permissions */}
                {permissions.map((req) => (
                    <div key={`perm-${req.id}`} className={`bg-white p-6 rounded-xl shadow-sm border border-l-4 transition-shadow hover:shadow-md ${req.status === 'PENDING' ? 'border-l-yellow-500 border-slate-200' :
                        req.status === 'APPROVED' ? 'border-l-green-500 border-slate-200 opacity-90' :
                            'border-l-red-500 border-slate-200 opacity-90'
                        }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800">{req.user.name}</h4>
                                <span className="text-xs text-slate-500 uppercase tracking-wide">Permission</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                2 HRS
                                {activeTab === 'history' && ` (${req.status})`}
                            </span>
                            {req.bhStatus === 'APPROVED' && (
                                <span className="ml-2 bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                                    ✅ Verified by {req.bhName || 'BH'}
                                </span>
                            )}
                            {req.bhStatus === 'REJECTED' && (
                                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full border border-red-200 flex items-center gap-1">
                                    ❌ Rejected by {req.bhName || 'BH'}
                                </span>
                            )}
                        </div>
                        <div className="space-y-2 mb-6">
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                                <span>🕒</span> {new Date(req.date).toLocaleDateString()} ({req.startTime} - {req.endTime})
                            </p>
                            <p className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3">"{req.reason}"</p>
                            {activeTab === 'history' && (
                                <p className="text-xs text-slate-400 mt-2">Updated: {new Date(req.updatedAt || req.createdAt).toLocaleString()}</p>
                            )}
                        </div>
                        {activeTab === 'pending' && (
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => onUpdateStatus('permission', req.id, 'APPROVED')} className="w-full py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-bold text-sm transition-colors">Approve</button>
                                <button onClick={() => onUpdateStatus('permission', req.id, 'REJECTED')} className="w-full py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold text-sm transition-colors">Reject</button>
                            </div>
                        )}
                    </div>
                ))}

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
