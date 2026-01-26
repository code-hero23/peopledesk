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
                                            <h4 className="font-bold text-slate-800 truncate">{log.clientName || log.projectName || 'Work Log'}</h4>
                                            <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">{log.hours ? `${log.hours}h` : 'N/A'}</span>
                                        </div>
                                        <p className="text-slate-600 text-sm mt-1 truncate">{log.process || log.tasks || log.cre_callBreakdown || 'Detailed Report'}</p>

                                        {/* Optional details pills */}
                                        <div className="flex gap-2 mt-2">
                                            {log.imageCount && (
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">📸 {log.imageCount} imgs</span>
                                            )}
                                            {log.cre_totalCalls && (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">📞 {log.cre_totalCalls} calls</span>
                                            )}
                                            {log.fa_calls && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">📞 {log.fa_calls} follow-ups</span>
                                            )}
                                        </div>
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
