import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getDailyAttendance, reset } from '../../features/admin/adminSlice';
import { Calendar, Smartphone, Monitor } from 'lucide-react';
import axios from 'axios';

const Attendance = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { dailyAttendance, isLoading, isError, message } = useSelector((state) => state.admin);

    // Default to today's date in LOCAL time
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [searchTerm, setSearchTerm] = useState('');

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
        }

        return () => {
            dispatch(reset());
        };
    }, [user, dispatch, selectedDate]);

    const onDownload = async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
                responseType: 'blob',
            };

            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const response = await axios.get(`${baseUrl}/export/attendance`, config);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to download export. Please try again.");
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

                    <button onClick={onDownload} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2 whitespace-nowrap">
                        <span>📅</span> Export CSV
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
                                <th className="px-6 py-4 font-semibold text-center">In Device</th>
                                <th className="px-6 py-4 font-semibold text-center">Out Device</th>
                                <th className="px-6 py-4 font-semibold text-center">Time In</th>
                                <th className="px-6 py-4 font-semibold text-center">Time Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
                            ) : filteredAttendance.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-slate-400 italic">No employees found.</td></tr>
                            ) : (
                                filteredAttendance.map((record) => (
                                    <tr key={record.user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {record.user.name}
                                            <div className="text-xs text-slate-400 font-normal">{record.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${record.status === 'PRESENT'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {record.status}
                                            </span>
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
                                                            <Smartphone className="w-5 h-5 text-purple-400" />
                                                        ) : (
                                                            <Monitor className="w-5 h-5 text-blue-400" />
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
                                                            <Smartphone className="w-5 h-5 text-purple-400" />
                                                        ) : (
                                                            <Monitor className="w-5 h-5 text-blue-400" />
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
