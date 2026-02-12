import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getDailyWorkLogs, getAllEmployees, reset } from '../../features/admin/adminSlice';
import { Calendar, Download, Eye, Search } from 'lucide-react';
import axios from 'axios';
import WorkLogDetailModal from '../../components/admin/WorkLogDetailModal';

const WorkLogs = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { dailyWorkLogs, employees, isLoading, isError, message } = useSelector((state) => state.admin);

    // Default to today's date formatted as YYYY-MM-DD
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDesignation, setSelectedDesignation] = useState('');

    // Filtering Logic
    const filteredLogs = dailyWorkLogs.filter((record) => {
        if (!searchTerm) return true;
        const lowerTerm = searchTerm.toLowerCase();

        // Match User
        const userMatch = record.user.name.toLowerCase().includes(lowerTerm) ||
            record.user.email.toLowerCase().includes(lowerTerm);

        // Match Log Content
        let logMatch = false;
        if (record.workLog) {
            const log = record.workLog;
            logMatch = (log.clientName?.toLowerCase().includes(lowerTerm)) ||
                (log.projectName?.toLowerCase().includes(lowerTerm)) ||
                (log.site?.toLowerCase().includes(lowerTerm)) ||
                (log.process?.toLowerCase().includes(lowerTerm)) ||
                (log.tasks?.toLowerCase().includes(lowerTerm)) ||
                (log.ae_siteLocation?.toLowerCase().includes(lowerTerm));
        }

        return userMatch || logMatch;
    });

    // Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (isError) {
            console.error(message);
        }

        if (user && user.token) {
            dispatch(getDailyWorkLogs(selectedDate));
        }

        return () => {
            dispatch(reset());
        };
    }, [user, isError, message, dispatch, selectedDate]);

    const onExportDaily = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            let apiUrl = `${baseUrl}/export/worklogs?date=${selectedDate}`;
            if (selectedDesignation) {
                apiUrl += `&designation=${selectedDesignation}`;
            }
            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `worklog_daily_${selectedDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export daily worklogs.");
        }
    };

    const onExportMonth = async () => {
        try {
            const date = new Date(selectedDate);
            const month = date.getMonth() + 1; // 1-12
            const year = date.getFullYear();

            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            let apiUrl = `${baseUrl}/export/worklogs?month=${month}&year=${year}`;
            if (selectedDesignation) {
                apiUrl += `&designation=${selectedDesignation}`;
            }
            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `worklogs_${year}_${month}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to download export. Please try again.");
        }
    };

    const renderClientInfo = (log) => {
        // AE
        if (log.ae_siteLocation) return <div className="font-bold">{log.ae_siteLocation}</div>;
        // FA / CRE / LA
        return (
            <>
                <div className="font-bold">{log.clientName || log.projectName || '-'}</div>
                {(log.site || log.la_projectLocation) && <div className="text-xs text-slate-500">{log.site || log.la_projectLocation}</div>}
            </>
        );
    };

    const renderWorkDescription = (log) => {
        // CRE
        if (log.cre_totalCalls !== null || log.cre_showroomVisits !== null) {
            return (
                <div className="text-xs">
                    <div className="flex gap-1 mb-1">
                        {log.cre_totalCalls > 0 && <span className="bg-blue-50 text-blue-700 px-1 rounded">📞 {log.cre_totalCalls}</span>}
                        {log.cre_showroomVisits > 0 && <span className="bg-orange-50 text-orange-700 px-1 rounded">🏢 {log.cre_showroomVisits}</span>}
                    </div>
                    <div className="truncate max-w-[200px]" title={log.cre_callBreakdown}>{log.cre_callBreakdown}</div>
                </div>
            );
        }
        // FA
        if (log.fa_calls !== null || log.fa_showroomVisits !== null || log.fa_siteVisits !== null) {
            return (
                <div className="text-xs">
                    <div className="flex gap-1 mb-1">
                        {log.fa_calls > 0 && <span className="bg-purple-50 text-purple-700 px-1 rounded">📞 {log.fa_calls}</span>}
                        {log.fa_designPendingClients && <span className="text-slate-500" title={`Design Pending: ${log.fa_designPendingClients}`}>🎨 Pending</span>}
                    </div>
                </div>
            );
        }
        // AE
        if (log.ae_visitType) {
            return (
                <div className="text-xs">
                    <div className="flex flex-wrap gap-1 mb-1">
                        {(Array.isArray(log.ae_visitType) ? log.ae_visitType : [log.ae_visitType]).map((t, i) => (
                            <span key={i} className="bg-slate-100 px-1 rounded border">{t}</span>
                        ))}
                    </div>
                    {log.ae_workStage && <div>Stage: {log.ae_workStage}</div>}
                </div>
            );
        }

        // Default LA
        return <div className="truncate max-w-[200px]" title={log.process || log.tasks}>{log.process || log.tasks || log.remarks || '-'}</div>;
    };

    const handleViewDetails = (record) => {
        setSelectedLog(record);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Daily Work Logs</h2>
                    <p className="text-slate-500">Monitor employee work submissions.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search employee, project..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 font-medium w-48 lg:w-64"
                        />
                    </div>
                    <select
                        value={selectedDesignation}
                        onChange={(e) => setSelectedDesignation(e.target.value)}
                        className="py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 font-medium bg-white"
                    >
                        <option value="">All Categories</option>
                        <option value="LA">Loading Architect (LA)</option>
                        <option value="CRE">Customer Relationship Executive (CRE)</option>
                        <option value="FA">Feasibility Architect (FA)</option>
                        <option value="AE">Application Engineer (AE)</option>
                        <option value="OFFICE-ADMINISTRATION">Office Administration</option>
                        <option value="ACCOUNT">Account</option>
                        <option value="LEAD-OPERATION">Lead Operation</option>
                        <option value="LEAD-CONVERSION">Lead Conversion</option>
                        <option value="DIGITAL-MARKETING">Digital Marketing</option>
                        <option value="VENDOR-MANAGEMENT">Vendor Management</option>
                        <option value="CUSTOMER-RELATIONSHIP">Customer Relationship</option>
                        <option value="CLIENT-CARE">Client Care</option>
                        <option value="ESCALATION">Escalation</option>
                        <option value="CLIENT-FACILITATOR">Client Facilitator</option>
                    </select>
                    <button onClick={onExportDaily} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold text-[11px] shadow-sm transition-all flex items-center gap-2 border border-blue-500/20">
                        <Download size={14} />
                        <span>DAILY EXCEL</span>
                    </button>
                    <button onClick={onExportMonth} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold text-[11px] shadow-sm transition-all flex items-center gap-2 border border-emerald-500/20">
                        <Download size={14} />
                        <span>MONTHLY EXCEL</span>
                    </button>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 font-medium"
                        />
                    </div>
                </div>
            </div>


            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Employee</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="3" className="text-center py-8">Loading...</td></tr>
                            ) : dailyWorkLogs.length === 0 ? (
                                <tr><td colSpan="3" className="text-center py-8 text-slate-400 italic">No employees found.</td></tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr><td colSpan="3" className="text-center py-8 text-slate-400 italic">No logs found matching your search.</td></tr>
                            ) : (
                                filteredLogs.map((record) => {
                                    const log = record.workLog;
                                    // Status Logic:
                                    // No Log -> Not Submitted
                                    // LogStatus OPEN -> In Progress (Opening Submitted)
                                    // LogStatus CLOSED -> Submitted (Opening & Closing Submitted)

                                    let statusLabel = 'Not Submitted';
                                    let statusColor = 'bg-slate-100 text-slate-500';

                                    if (log) {
                                        if (log.logStatus === 'CLOSED') {
                                            statusLabel = 'Submitted';
                                            statusColor = 'bg-green-100 text-green-700';
                                        } else {
                                            statusLabel = 'In Progress';
                                            statusColor = 'bg-yellow-100 text-yellow-800';
                                        }
                                    }

                                    return (
                                        <tr key={record.user.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                <div className="flex flex-col">
                                                    <span className="text-base">{record.user.name}</span>
                                                    <span className="text-xs text-slate-400 font-normal">{record.user.email}</span>
                                                    <span className="text-xs text-slate-400 font-normal uppercase mt-0.5">{record.user.designation}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${statusColor}`}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {log ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewDetails(record);
                                                        }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative z-10 cursor-pointer"
                                                        title="View & Print Details"
                                                    >
                                                        <Eye size={20} />
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Modal */}
            <WorkLogDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                log={selectedLog ? { ...selectedLog.workLog, user: selectedLog.user } : null}
            />
        </div>
    );
};

export default WorkLogs;
