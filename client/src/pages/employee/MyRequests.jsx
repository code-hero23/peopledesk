import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMyRequests, reset } from '../../features/employee/employeeSlice';
import { formatDate } from '../../utils/dateUtils';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';

const MyRequests = () => {
    const dispatch = useDispatch();
    const { requests } = useSelector((state) => state.employee);

    useEffect(() => {
        // Initial fetch handled by CycleSelector
        return () => { dispatch(reset()); };
    }, [dispatch]);

    const handleCycleChange = (range) => {
        dispatch(getMyRequests({
            startDate: range.startDate,
            endDate: range.endDate
        }));
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">My Requests</h2>
                    <p className="text-slate-500">History of your leave and permission requests.</p>
                </div>
                <MonthCycleSelector onCycleChange={handleCycleChange} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <h3 className="font-bold text-lg text-slate-700 mb-4">Leave Requests</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-slate-400 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="pb-3 pl-2">Dates</th>
                                    <th className="pb-3">Type</th>
                                    <th className="pb-3">Reason</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests.leaves.map(req => (
                                    <tr key={req.id}>
                                        <td className="py-3 pl-2 font-medium text-slate-700">
                                            {formatDate(req.startDate)} - {formatDate(req.endDate)}
                                            <div className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">🕒 Applied: {formatDate(req.createdAt)}</div>
                                        </td>
                                        <td className="py-3">{req.type}</td>
                                        <td className="py-3 text-slate-500 italic">
                                            "{req.reason}"
                                            {(req.isExceededLimit || (req.startDate && req.endDate && (Math.ceil(Math.abs(new Date(req.endDate) - new Date(req.startDate)) / (1000 * 60 * 60 * 24)) + 1) > 4)) && (
                                                <div className="mt-1">
                                                    <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
                                                        ⚠️ LIMIT EXCEEDED (4+)
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3">
                                            {req.status === 'APPROVED' ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">APPROVED</span>
                                            ) : req.status === 'REJECTED' ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">REJECTED</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700">
                                                    {req.bhStatus === 'PENDING' ? 'Waiting for BH' : req.hrStatus === 'PENDING' ? 'Waiting for HR' : 'PENDING'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {requests.leaves.length === 0 && <p className="text-slate-400 italic mt-4 text-center">No leave requests found.</p>}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <h3 className="font-bold text-lg text-slate-700 mb-4">Permission Requests</h3>
                    <div className="space-y-4">
                        {requests.permissions.map(req => (
                            <div key={req.id} className="p-4 rounded-lg border border-slate-100 flex justify-between items-center bg-slate-50 hover:bg-white hover:border-blue-100 transition-colors">
                                <div>
                                    <p className="font-bold text-slate-800 flex items-center gap-2">
                                        {formatDate(req.date)}
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 font-semibold">
                                            Applied: {formatDate(req.createdAt)}
                                        </span>
                                    </p>
                                    <p className="text-sm text-slate-500">{req.startTime} - {req.endTime}</p>
                                    <p className="text-xs text-slate-400 mt-1 italic">"{req.reason}"</p>
                                    {req.isExceededLimit && (
                                        <div className="mt-1">
                                            <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-200">
                                                ⚠️ LIMIT EXCEEDED
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {req.status === 'APPROVED' ? 'APPROVED' :
                                        req.status === 'REJECTED' ? 'REJECTED' :
                                            req.bhStatus === 'PENDING' ? 'Wait for BH' :
                                                req.hrStatus === 'PENDING' ? 'Wait for HR' : 'PENDING'}
                                </span>
                            </div>
                        ))}
                        {requests.permissions.length === 0 && <p className="text-slate-400 italic text-center">No permission requests found.</p>}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <h3 className="font-bold text-lg text-slate-700 mb-4">Site Visit Requests</h3>
                    <div className="space-y-4">
                        {requests.siteVisits?.map(req => (
                            <div key={req.id} className="p-4 rounded-lg border border-slate-100 flex justify-between items-center bg-slate-50 hover:bg-white hover:border-emerald-100 transition-colors">
                                <div>
                                    <p className="font-bold text-slate-800 flex items-center gap-2">
                                        {formatDate(req.date)} - {req.projectName}
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 font-semibold">
                                            Applied: {formatDate(req.createdAt)}
                                        </span>
                                    </p>
                                    <p className="text-sm text-slate-500">{req.startTime} - {req.endTime} @ {req.location}</p>
                                    <p className="text-xs text-slate-400 mt-1">"{req.reason}"</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {req.status === 'APPROVED' ? 'APPROVED' :
                                        req.status === 'REJECTED' ? 'REJECTED' : 'Wait for HR'}
                                </span>
                            </div>
                        ))}
                        {(!requests.siteVisits || requests.siteVisits.length === 0) && <p className="text-slate-400 italic text-center">No site visit requests found.</p>}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <h3 className="font-bold text-lg text-slate-700 mb-4">Showroom Visit Requests</h3>
                    <div className="space-y-4">
                        {requests.showroomVisits?.map(req => (
                            <div key={req.id} className="p-4 rounded-lg border border-slate-100 flex justify-between items-center bg-slate-50 hover:bg-white hover:border-indigo-100 transition-colors">
                                <div>
                                    <p className="font-bold text-slate-800 flex items-center gap-2">
                                        {formatDate(req.date)}
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 font-semibold">
                                            Applied: {formatDate(req.createdAt)}
                                        </span>
                                    </p>
                                    <p className="text-sm text-slate-500">{req.sourceShowroom} ➔ {req.destinationShowroom}</p>
                                    <p className="text-xs text-slate-500">{req.startTime} - {req.endTime}</p>
                                    <p className="text-xs text-slate-400 mt-1">"{req.reason}"</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {req.status === 'APPROVED' ? 'APPROVED' :
                                        req.status === 'REJECTED' ? 'REJECTED' : 'Wait for HR'}
                                </span>
                            </div>
                        ))}
                        {(!requests.showroomVisits || requests.showroomVisits.length === 0) && <p className="text-slate-400 italic text-center">No showroom visit requests found.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyRequests;
