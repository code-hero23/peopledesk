import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMyWorkLogs, reset } from '../../features/employee/employeeSlice';
import { Eye } from 'lucide-react';
import WorkLogDetailModal from '../../components/admin/WorkLogDetailModal';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';

const MyWorkLogs = () => {
    const dispatch = useDispatch();
    const { workLogs } = useSelector((state) => state.employee);
    const { user } = useSelector((state) => state.auth);

    // Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Initial fetch handled by CycleSelector on mount
        return () => { dispatch(reset()); };
    }, [dispatch]);

    const handleCycleChange = (range) => {
        dispatch(getMyWorkLogs({
            startDate: range.startDate,
            endDate: range.endDate
        }));
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setIsModalOpen(true);
    };

    const renderLogSummary = (log) => {
        // Simple summary for the list view
        if (log.ae_siteLocation) return `📍 ${log.ae_siteLocation}`;
        if (log.clientName) return `👤 ${log.clientName}`;
        return log.projectName || 'Daily Report';
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">My Work Reports</h2>
                    <p className="text-slate-500">History of your daily submitted reports.</p>
                </div>
                <MonthCycleSelector onCycleChange={handleCycleChange} />
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
                                <div key={log.id} className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 text-blue-600 flex flex-col items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                                        <span className="text-slate-400 font-normal leading-none mb-0.5">{new Date(log.date).getDate()}</span>
                                        <span className="leading-none text-[8px] font-black italic">{new Date(log.date).getMonth() + 1}/{new Date(log.date).getFullYear()}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800 truncate">{renderLogSummary(log)}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.logStatus === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {log.logStatus === 'CLOSED' ? 'SUBMITTED' : 'IN PROGRESS'}
                                                    </span>
                                                    {log.hours && <span className="text-[10px] font-bold text-slate-400 uppercase">{log.hours} Hours</span>}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleViewDetails(log)}
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                                title="View Detailed Report"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed View Modal */}
            <WorkLogDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                log={selectedLog ? { ...selectedLog, user: user } : null}
            />
        </div>
    );
};

export default MyWorkLogs;

