import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMyWorkLogs, reset } from '../../features/employee/employeeSlice';

const MyWorkLogs = () => {
    const dispatch = useDispatch();
    const { workLogs } = useSelector((state) => state.employee);

    useEffect(() => {
        dispatch(getMyWorkLogs());
        return () => { dispatch(reset()); };
    }, [dispatch]);

    const renderLogDetails = (log) => {
        // CRE Logs
        if (log.cre_totalCalls !== null || log.cre_showroomVisits !== null) {
            return (
                <div className="text-sm text-slate-600 mt-1">
                    <div className="flex flex-wrap gap-2 text-xs mb-1">
                        {log.cre_totalCalls > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">📞 {log.cre_totalCalls} Calls</span>}
                        {log.cre_showroomVisits > 0 && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">🏢 {log.cre_showroomVisits} Visits</span>}
                    </div>
                    {log.cre_callBreakdown && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                            {log.cre_callBreakdown}
                        </p>
                    )}
                </div>
            );
        }

        // FA Logs
        if (log.fa_calls !== null || log.fa_showroomVisits !== null || log.fa_siteVisits !== null) {
            return (
                <div className="text-sm text-slate-600 mt-1">
                    <div className="flex flex-wrap gap-2 text-xs mb-1">
                        {log.fa_calls > 0 && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">📞 {log.fa_calls} Calls</span>}
                        {log.fa_showroomVisits > 0 && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">🏢 {log.fa_showroomVisits} Showroom</span>}
                        {log.fa_siteVisits > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">🏗️ {log.fa_siteVisits} Site</span>}
                    </div>
                    {log.fa_designPendingClients && <p className="text-xs text-slate-500">Design Pending: {log.fa_designPendingClients}</p>}
                    {log.fa_quotePendingClients && <p className="text-xs text-slate-500">Quote Pending: {log.fa_quotePendingClients}</p>}
                </div>
            );
        }

        // AE Logs
        if (log.ae_siteLocation || log.ae_visitType) {
            return (
                <div className="text-sm text-slate-600 mt-1">
                    {log.ae_siteLocation && <p className="font-semibold text-slate-700">📍 {log.ae_siteLocation}</p>}
                    <div className="flex flex-wrap gap-1 mt-1">
                        {log.ae_visitType && (Array.isArray(log.ae_visitType) ? log.ae_visitType : [log.ae_visitType]).map((type, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{type}</span>
                        ))}
                    </div>
                    {log.ae_workStage && <p className="text-xs text-slate-500 mt-1">Stage: {log.ae_workStage}</p>}
                    {log.ae_measurements && <p className="text-xs text-slate-500">Measurements: {log.ae_measurements}</p>}
                </div>
            );
        }

        // LA / Standard Logs
        // If it has specific LA fields or just standard process
        return (
            <div className="text-sm text-slate-600 mt-1">
                {log.clientName && <p className="font-semibold text-slate-800">{log.clientName}</p>}
                {log.la_projectLocation && <p className="text-xs text-slate-500 mb-1">📍 {log.la_projectLocation}</p>}

                <p className="line-clamp-2">{log.process || log.tasks || log.remarks || 'Daily Work Update'}</p>

                {log.la_siteStatus && (
                    <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">
                        {log.la_siteStatus}
                    </span>
                )}
                {log.imageCount > 0 && (
                    <div className="mt-1">
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            📸 {log.imageCount} Images
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">My Work Logs</h2>
                <p className="text-slate-500">History of your daily submitted reports.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                    <div className="space-y-4">
                        {workLogs.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <p className="text-4xl mb-2">📭</p>
                                <p>No activity logs yet.</p>
                            </div>
                        ) : (
                            workLogs.map((log) => (
                                <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 text-blue-600 flex flex-col items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                                        <span className="text-slate-400 font-normal leading-none mb-0.5">{new Date(log.date).getDate()}</span>
                                        <span className="leading-none">{new Date(log.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 truncate">{log.projectName || 'Work Log'}</h4>
                                            {log.hours && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">{log.hours} HRS</span>}
                                        </div>

                                        {/* Dynamic Content Based on Report Type */}
                                        {renderLogDetails(log)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyWorkLogs;
