import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getDailyAttendance, reset } from '../../features/admin/adminSlice';
import { Calendar, Smartphone, Monitor, Coffee, Users, Clock, Zap, Utensils } from 'lucide-react';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Attendance = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { dailyAttendance, isLoading, isError, message } = useSelector((state) => state.admin);

    // Live Status State
    const [activeStatuses, setActiveStatuses] = useState([]);
    const [liveTime, setLiveTime] = useState(new Date());

    // Helper to format minutes into readable string
    const formatDuration = (totalMinutes) => {
        if (!totalMinutes || totalMinutes <= 0) return '-';
        const h = Math.floor(totalMinutes / 60);
        const m = Math.round(totalMinutes % 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const fetchActiveStatuses = async () => {
        if (!user || !user.token) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/admin/active-statuses`, config);
            console.log('Active Statuses:', response.data);
            if (Array.isArray(response.data)) {
                setActiveStatuses(response.data);
                console.log('ID Comparison:', {
                    activeUserIds: response.data.map(s => s.userId),
                    recordUserIds: dailyAttendance?.map(r => r.user.id)
                });
            }
        } catch (error) {
            console.error('Failed to fetch active statuses:', error);
        }
    };

    // Default to today's date in LOCAL time
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [cycleRange, setCycleRange] = useState({ startDate: '', endDate: '' });

    const handleCycleChange = (range) => {
        setCycleRange(range);
    };

    // Filter attendance records based on search
    const filteredAttendance = dailyAttendance.filter((record) => {
        const term = searchTerm.toLowerCase();
        return (
            record.user.name.toLowerCase().includes(term) ||
            record.user.email.toLowerCase().includes(term)
        );
    });

    useEffect(() => {
        if (isError) {
            console.error(message);
        }
    }, [isError, message]);

    useEffect(() => {
        if (user && user.token) {
            dispatch(getDailyAttendance(selectedDate));
            fetchActiveStatuses();

            const pollInterval = setInterval(fetchActiveStatuses, 30000);
            const timeInterval = setInterval(() => setLiveTime(new Date()), 1000);

            return () => {
                dispatch(reset());
                clearInterval(pollInterval);
                clearInterval(timeInterval);
            };
        }
    }, [user, dispatch, selectedDate]);

    const getDuration = (startTime) => {
        const start = new Date(startTime);
        const diff = Math.floor((liveTime - start) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        return `${mins}m ${secs}s`;
    };

    const getStatusStyles = (type) => {
        switch (type) {
            case 'TEA': return { bg: 'bg-amber-50', text: 'text-amber-600', icon: Coffee, label: 'Tea Break' };
            case 'LUNCH': return { bg: 'bg-orange-50', text: 'text-orange-600', icon: Utensils, label: 'Lunch Break' };
            case 'CLIENT_MEETING': return { bg: 'bg-blue-50', text: 'text-blue-600', icon: Users, label: 'Client Meeting' };
            case 'BH_MEETING': return { bg: 'bg-purple-50', text: 'text-purple-600', icon: Zap, label: 'BH Meeting' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-600', icon: Clock, label: 'On Break' };
        }
    };

    const onDownload = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob',
            };

            // Force Today's Date for export as per requirement
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            let apiUrl = `${baseUrl}/export/attendance?date=${todayStr}`;

            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_today_${todayStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to download export. Please try again.");
        }
    };

    const onDownloadMonthly = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob',
            };

            const dateObj = new Date(cycleRange.endDate);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            let apiUrl = `${baseUrl}/export/attendance?month=${month}&year=${year}`;

            if (searchTerm) {
                apiUrl += `&search=${encodeURIComponent(searchTerm)}`;
            }
            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            const monthName = dateObj.toLocaleString('default', { month: 'short' });

            // Format prev month name for filename
            const prevMonthDate = new Date(year, month - 2, 1);
            const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'short' });

            link.setAttribute('download', `payroll_${prevMonthName}26_to_${monthName}25_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Monthly export failed:", error);
            alert("Failed to download monthly report. Please try again.");
        }
    };

    const onGeneratePayrollReport = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob',
            };

            const dateObj = new Date(cycleRange.endDate);
            const month = dateObj.getMonth() + 1;
            const year = dateObj.getFullYear();

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            let apiUrl = `${baseUrl}/payroll/report?month=${month}&year=${year}`;

            const response = await axios.get(apiUrl, config);

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
            const link = document.createElement('a');
            link.href = url;
            const monthName = dateObj.toLocaleString('default', { month: 'short' });

            // Format prev month name for filename
            const prevMonthDate = new Date(year, month - 2, 1);
            const prevMonthName = prevMonthDate.toLocaleString('default', { month: 'short' });

            link.setAttribute('download', `PAYROLL_SALARY_${prevMonthName}26_to_${monthName}25_${year}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Payroll report failed:", error);
            alert("Failed to generate payroll report. Please try again.");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Daily Attendance</h2>
                    <p className="text-slate-500">Monitor employee check-ins and absences.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
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
                            className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 font-medium"
                        />
                    </div>

                    <button onClick={onDownload} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap text-xs transform hover:scale-105 active:scale-95">
                        <Smartphone size={16} /> Today
                    </button>
                    <button onClick={onDownloadMonthly} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap text-xs transform hover:scale-105 active:scale-95">
                        <Calendar size={16} /> Monthly
                    </button>
                    {(user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <button onClick={onGeneratePayrollReport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 whitespace-nowrap text-xs transform hover:scale-105 active:scale-95">
                            <Zap size={16} /> Payroll Report
                        </button>
                    )}
                    <MonthCycleSelector onCycleChange={handleCycleChange} />
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

            {/* Live Status Content */}
            {
                activeStatuses.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
                        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping absolute inset-0"></div>
                                    <div className="w-2 h-2 bg-rose-500 rounded-full relative"></div>
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Status Panel</h3>
                            </div>
                            <button onClick={fetchActiveStatuses} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <Zap size={14} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <AnimatePresence mode='popLayout'>
                                    {activeStatuses.map((status) => {
                                        const styles = getStatusStyles(status.breakType);
                                        const Icon = styles.icon;
                                        return (
                                            <motion.div
                                                key={`live-${status.id}`}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className={`${styles.bg} p-4 rounded-2xl border border-white shadow-sm flex items-start gap-3`}
                                            >
                                                <div className={`p-2.5 rounded-xl bg-white ${styles.text} shadow-sm`}>
                                                    <Icon size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="text-sm font-black text-slate-800 truncate">{status.userName}</p>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white ${styles.text} border border-current/10 whitespace-nowrap`}>
                                                            {styles.label}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between text-[11px] font-black">
                                                        <span className="text-slate-400 font-bold uppercase">{status.designation}</span>
                                                        <span className={styles.text}>{getDuration(status.startTime)}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Employee</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-center">In Device</th>
                                <th className="px-6 py-4 font-semibold text-center">Out Device</th>
                                <th className="px-6 py-4 font-semibold text-center">Time In</th>
                                <th className="px-6 py-4 font-semibold text-center">Time Out</th>
                                <th className="px-6 py-4 font-semibold text-center">Tea Break</th>
                                <th className="px-6 py-4 font-semibold text-center">Lunch Break</th>
                                <th className="px-6 py-4 font-semibold text-center">Meetings</th>
                                <th className="px-6 py-4 font-semibold text-center">Net Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="10" className="text-center py-8">Loading...</td></tr>
                            ) : filteredAttendance.length === 0 ? (
                                <tr><td colSpan="10" className="text-center py-8 text-slate-400 italic">No employees found.</td></tr>
                            ) : (
                                filteredAttendance.map((record) => (
                                    <tr key={`row-${record.user.id}`} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            <div className="flex items-center gap-2">
                                                {record.user.name}
                                                {activeStatuses.some(s => s.userId === record.user.id) && (
                                                    <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></div>
                                                        <span className="text-[10px] font-black text-rose-600 uppercase">Break</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 font-normal">{record.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${record.status === 'PRESENT'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {record.status}
                                                </span>
                                                {activeStatuses.find(s => s.userId === record.user.id) && (
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-white`}>
                                                        {getStatusStyles(activeStatuses.find(s => s.userId === record.user.id).breakType).label}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* In Device */}
                                        <td className="px-6 py-4 text-center text-slate-600">
                                            {record.deviceInfo ? (
                                                <div className="group relative flex justify-center">
                                                    {(() => {
                                                        const info = record.deviceInfo.toLowerCase();
                                                        const isMobile = info.startsWith('mobile') ||
                                                            info.includes('android') ||
                                                            info.includes('iphone') ||
                                                            info.includes('ipad');

                                                        return isMobile ? (
                                                            <Smartphone className="w-5 h-5 text-red-700" />
                                                        ) : (
                                                            <Monitor className="w-5 h-5 text-green-700" />
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>

                                        {/* Out Device */}
                                        <td className="px-6 py-4 text-center text-slate-600">
                                            {record.checkoutDeviceInfo ? (
                                                <div className="group relative flex justify-center">
                                                    {(() => {
                                                        const info = record.checkoutDeviceInfo.toLowerCase();
                                                        const isMobile = info.startsWith('mobile') ||
                                                            info.includes('android') ||
                                                            info.includes('iphone') ||
                                                            info.includes('ipad');

                                                        return isMobile ? (
                                                            <Smartphone className="w-5 h-5 text-red-700" />
                                                        ) : (
                                                            <Monitor className="w-5 h-5 text-green-700" />
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-center text-slate-600 font-mono">
                                            {record.timeIn
                                                ? new Date(record.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : '--:--'
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-600 font-mono">
                                            {record.timeOut
                                                ? new Date(record.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : '--:--'
                                            }
                                        </td>

                                        {/* Tea Break Time */}
                                        <td className="px-6 py-4 text-center text-slate-600">
                                            {record.breakData?.tea > 0 ? (
                                                <span className="text-amber-600 font-bold font-mono">{formatDuration(record.breakData.tea)}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>

                                        {/* Lunch Time */}
                                        <td className="px-6 py-4 text-center text-slate-600">
                                            {record.breakData?.lunch > 0 ? (
                                                <span className="text-orange-600 font-bold font-mono">{formatDuration(record.breakData.lunch)}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>

                                        {/* Meeting Time */}
                                        <td className="px-6 py-4 text-center text-slate-600">
                                            {record.breakData?.meetings > 0 ? (
                                                <span className="text-blue-600 font-bold font-mono">{formatDuration(record.breakData.meetings)}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </td>

                                        {/* Net Hours */}
                                        <td className="px-6 py-4 text-center font-bold text-slate-800 font-mono">
                                            {record.effectiveMinutes !== undefined ? formatDuration(record.effectiveMinutes) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default Attendance;
