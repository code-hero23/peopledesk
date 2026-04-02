import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMyWorkLogs, reset } from '../../features/employee/employeeSlice';
import { Eye, Calendar, BarChart3, Download, Briefcase } from 'lucide-react';
import axios from 'axios';
import WorkLogDetailModal from '../../components/admin/WorkLogDetailModal';

const MyWorkLogs = () => {
    const dispatch = useDispatch();
    const { workLogs } = useSelector((state) => state.employee);
    const { user } = useSelector((state) => state.auth);

    // Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Month Selection State (Defaults to current month)
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"

    useEffect(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        
        // Calculate 26th of previous month to 25th of current month
        const end = new Date(year, month - 1, 25);
        const start = new Date(year, month - 2, 26);
        
        dispatch(getMyWorkLogs({ 
            startDate: start.toISOString().split('T')[0], 
            endDate: end.toISOString().split('T')[0] 
        }));
        
        return () => { dispatch(reset()); };
    }, [dispatch, selectedMonth]);

    const onExportSummary = async () => {
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/task-summary?userId=${user.id}&month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `My_Task_Summary_${selectedMonth}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export summary.");
        }
    };

    const onExportProjectWise = async () => {
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const apiUrl = `${baseUrl}/export/project-wise?userId=${user.id}&month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `My_Project_Reports_${selectedMonth}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Project report export failed:", error);
            alert("Failed to export project reports.");
        }
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
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <Calendar size={18} className="text-slate-400 group-focus-within:text-blue-500" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none border-none p-0 focus:ring-0"
                        />
                    </div>
                    
                    <button
                        onClick={onExportSummary}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 font-bold text-sm transition-all active:scale-95"
                    >
                        <BarChart3 size={18} />
                        Download Summary
                    </button>

                    {['LA', 'FA'].some(role => user.designation?.toUpperCase().includes(role)) && (
                        <button
                            onClick={onExportProjectWise}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100 font-bold text-sm transition-all active:scale-95"
                        >
                            <Briefcase size={18} />
                            Project Reports
                        </button>
                    )}
                </div>
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

