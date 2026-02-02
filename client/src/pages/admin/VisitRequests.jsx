import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getPendingRequests, getRequestHistory, updateRequestStatus, deleteRequest, reset } from '../../features/admin/adminSlice';
import { Download, MapPin, Building2, Trash2, Calendar, X } from 'lucide-react';
import axios from 'axios';

const VisitRequests = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { pendingRequests, requestHistory, isLoading, isError, message } = useSelector(
        (state) => state.admin
    );
    const [activeTab, setActiveTab] = useState('pending');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        if (activeTab === 'pending') {
            dispatch(getPendingRequests(filterDate));
        } else {
            dispatch(getRequestHistory(filterDate));
        }
        return () => { dispatch(reset()); };
    }, [dispatch, activeTab, filterDate]);

    const onUpdateStatus = (type, id, status) => {
        if (window.confirm(`Confirm ${status} action?`)) {
            dispatch(updateRequestStatus({ type, id, status }));
        }
    };

    const onDelete = (type, id) => {
        if (window.confirm('Are you sure you want to DELETE this visit request?')) {
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
            const response = await axios.get(`${baseUrl}/export/requests?filter=visits`, config);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `visit_requests_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export.");
        }
    };

    const displayData = activeTab === 'pending' ? pendingRequests : requestHistory;
    const siteVisits = displayData?.siteVisits || [];
    const showroomVisits = displayData?.showroomVisits || [];

    const canDelete = ['ADMIN', 'HR'].includes(user?.role);
    const canApprove = ['HR'].includes(user?.role);

    if (isLoading && activeTab === 'pending' && !pendingRequests.siteVisits) {
        return <div className="p-8 text-center text-slate-500 italic">Finding requests...</div>;
    }

    const renderVisitCard = (req, type, typeLabel, icon, color) => (
        <div key={`${type}-${req.id}`} className={`bg-white p-5 rounded-xl shadow-sm border border-l-4 transition-all hover:shadow-md ${req.status === 'PENDING' ? `border-l-${color}-500 border-slate-200` :
            req.status === 'APPROVED' ? 'border-l-green-500 border-slate-200 opacity-90' :
                'border-l-red-500 border-slate-200 opacity-90'
            }`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${color}-50 text-${color}-600 rounded-lg`}>
                        {icon}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 leading-tight">{req.user.name}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{typeLabel}</span>
                    </div>
                </div>
                {canDelete && (
                    <button onClick={() => onDelete(type, req.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Verification Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
                {req.status === 'PENDING' && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded border border-amber-200 uppercase tracking-widest">
                        ⏳ Awaiting HR Final Approval
                    </span>
                )}
                {req.status === 'APPROVED' && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded border border-emerald-200 uppercase tracking-widest">
                        ✅ Approved
                    </span>
                )}
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>📅</span>
                    <span className="font-medium">{new Date(req.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">{req.startTime} - {req.endTime}</span>
                </div>

                {type === 'site-visit' ? (
                    <div className="bg-slate-50 p-2 text-xs rounded border border-slate-100">
                        <p className="flex items-center gap-1.5 font-medium text-slate-700 mb-1">
                            <MapPin size={12} className="text-slate-400" /> {req.location}
                        </p>
                        <p className="text-slate-500 italic pl-5">{req.projectName}</p>
                    </div>
                ) : (
                    <div className="bg-indigo-50/30 p-2 text-xs rounded border border-indigo-100 flex items-center justify-between">
                        <div className="flex-1">
                            <p className="font-bold text-indigo-900">{req.sourceShowroom}</p>
                            <p className="text-[10px] text-indigo-400">Source</p>
                        </div>
                        <div className="px-2 text-indigo-300">➜</div>
                        <div className="flex-1 text-right">
                            <p className="font-bold text-indigo-900">{req.destinationShowroom}</p>
                            <p className="text-[10px] text-indigo-400">Destination</p>
                        </div>
                    </div>
                )}

                <div className="bg-blue-50/50 p-3 rounded-lg border-l-2 border-blue-400">
                    <p className="text-xs font-bold text-blue-900 leading-relaxed italic">"{req.reason}"</p>
                </div>
            </div>

            {activeTab === 'pending' && canApprove && (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onUpdateStatus(type, req.id, 'APPROVED')} className="py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs shadow-sm transition-all">Approve</button>
                    <button onClick={() => onUpdateStatus(type, req.id, 'REJECTED')} className="py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs transition-all">Reject</button>
                </div>
            )}
            {activeTab === 'pending' && !canApprove && (
                <div className="py-2.5 bg-slate-50 rounded-lg text-center text-slate-400 text-[10px] font-bold border border-slate-100 uppercase tracking-widest">
                    👁️ Monitoring View (HR Approval Required)
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Visit Requests</h2>
                    <p className="text-slate-500 font-medium italic">Site inspections & showroom movements.</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={handleExport} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold text-xs hover:bg-emerald-200 flex items-center gap-2 border border-emerald-200 h-9">
                        <Download size={14} /> EXPORT
                    </button>

                    {/* Ultra-Premium Date Picker */}
                    <div className="relative flex items-center group">
                        <div className="absolute left-3 text-slate-400 group-focus-within:text-blue-500 transition-all duration-300 group-hover:scale-110">
                            <Calendar size={14} strokeWidth={2.5} />
                        </div>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-white/80 backdrop-blur-sm pl-9 pr-8 h-10 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-700 font-black text-[11px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.02)] transition-all duration-300 hover:border-blue-300 w-[160px] appearance-none"
                        />
                        {filterDate ? (
                            <button
                                onClick={() => setFilterDate('')}
                                className="absolute right-2.5 p-1 rounded-lg bg-slate-100/50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-300 hover:rotate-90"
                                title="Clear filter"
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                        ) : (
                            <div className="absolute right-3.5 text-[9px] font-black text-slate-300 uppercase tracking-tighter pointer-events-none group-focus-within:opacity-0 transition-opacity">
                                DATE
                            </div>
                        )}
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 h-9">
                        <button onClick={() => setActiveTab('pending')} className={`px-4 text-xs font-black rounded-md transition-all ${activeTab === 'pending' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>PENDING</button>
                        <button onClick={() => setActiveTab('history')} className={`px-4 text-xs font-black rounded-md transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>HISTORY</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {siteVisits.map(req => renderVisitCard(req, 'site-visit', 'Site Visit', <MapPin size={20} />, 'emerald'))}
                {showroomVisits.map(req => renderVisitCard(req, 'showroom-visit', 'Cross-Showroom', <Building2 size={20} />, 'indigo'))}

                {siteVisits.length === 0 && showroomVisits.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <div className="text-4xl mb-2">🌴</div>
                        <p className="text-slate-400 font-bold">No {activeTab} visit requests.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisitRequests;
