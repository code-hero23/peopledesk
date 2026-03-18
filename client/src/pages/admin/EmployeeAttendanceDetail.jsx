import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link } from 'react-router-dom';
import { getEmployeeAttendance, getAllEmployees } from '../../features/admin/adminSlice';
import MonthCycleSelector from '../../components/common/MonthCycleSelector';
import { Calendar, Clock, Coffee, MonitorPlay, Users, ArrowLeft } from 'lucide-react';
import { formatDate, formatTime } from '../../utils/dateUtils';
import Spinner from '../../components/Spinner';

const EmployeeAttendanceDetail = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const { employeeAttendance, isLoading, employees } = useSelector((state) => state.admin);
    const [cycleRange, setCycleRange] = useState({ startDate: '', endDate: '' });

    useEffect(() => {
        if (employees.length === 0) {
            dispatch(getAllEmployees());
        }
    }, [dispatch, employees.length]);

    const employee = employees.find(emp => emp.id === parseInt(id));

    const handleCycleChange = (range) => {
        setCycleRange(range);
    };

    useEffect(() => {
        if (cycleRange.startDate && cycleRange.endDate) {
            dispatch(getEmployeeAttendance({ id, startDate: cycleRange.startDate, endDate: cycleRange.endDate }));
        }
    }, [dispatch, id, cycleRange]);

    const calculateBreakDuration = (breaks, types) => {
        if (!breaks || breaks.length === 0) return 0;
        return breaks
            .filter(b => types.includes(b.breakType) && b.duration)
            .reduce((acc, curr) => acc + curr.duration, 0);
    };

    const formatMinutes = (minutes) => {
        if (!minutes) return '0m';
        if (minutes < 60) return `${minutes}m`;
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    };

    const calculateTotalHours = (record) => {
        if (!record.date || !record.checkoutTime) return '--:--';

        const loginTime = new Date(record.date);
        const logoutTime = new Date(record.checkoutTime);
        const totalMinutes = Math.floor((logoutTime - loginTime) / 60000);

        // Only TEA and LUNCH breaks are deducted from net hours
        const deductibleBreaks = record.breaks
            ?.filter(b => ['TEA', 'LUNCH'].includes(b.breakType))
            .reduce((acc, b) => acc + (b.duration || 0), 0) || 0;

        const workingMinutes = Math.max(0, totalMinutes - deductibleBreaks);
        return formatMinutes(workingMinutes);
    };

    const getDatesInRange = (startDate, endDate) => {
        const dates = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);
        while (currentDate <= end) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates.sort((a, b) => a - b);
    };

    const displayDates = cycleRange.startDate ? getDatesInRange(cycleRange.startDate, cycleRange.endDate) : [];

    return (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Back Button */}
                <Link to="/admin/employees" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium">
                    <ArrowLeft size={20} /> Back to Employees
                </Link>

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                                <Calendar className="text-blue-600" /> Attendance History
                            </h1>
                            {employee && (
                                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold uppercase tracking-wider">
                                    {employee.name}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 mt-1">Viewing monthly attendance and break records for the selected employee.</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                        <MonthCycleSelector onCycleChange={handleCycleChange} />
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-12">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-gray-200">
                                        <th className="p-4 font-semibold text-slate-700 text-sm w-32 border-r border-gray-100 text-center">Date</th>
                                        <th className="p-4 font-semibold text-slate-700 w-24 text-center border-r border-gray-100 bg-blue-50/50">Login</th>
                                        <th className="p-4 font-semibold text-slate-700 w-24 text-center border-r border-gray-100 bg-orange-50/50">Log Out</th>
                                        <th className="p-4 font-semibold text-slate-700 text-center border-r border-gray-100"><div className="flex items-center justify-center gap-1"><Coffee size={14} /> Tea Break</div></th>
                                        <th className="p-4 font-semibold text-slate-700 text-center border-r border-gray-100"><div className="flex items-center justify-center gap-1"><Coffee size={14} /> Lunch</div></th>
                                        <th className="p-4 font-semibold text-slate-700 text-center border-r border-gray-100"><div className="flex items-center justify-center gap-1"><Users size={14} /> Client Meet</div></th>
                                        <th className="p-4 font-semibold text-slate-700 text-center border-r border-gray-100"><div className="flex items-center justify-center gap-1"><MonitorPlay size={14} /> Online Disc.</div></th>
                                        <th className="p-4 font-bold text-slate-900 text-center bg-green-50/50"><div className="flex items-center justify-center gap-1"><Clock size={16} /> Working</div></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayDates.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="p-8 text-center text-gray-500">
                                                Select a valid cycle range to view attendance history.
                                            </td>
                                        </tr>
                                    ) : (
                                        displayDates.map((dateObj) => {
                                            const dateString = dateObj.toISOString().split('T')[0];
                                            const record = employeeAttendance?.find(a => a.date.startsWith(dateString));

                                            return (
                                                <tr key={dateString} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 border-r border-gray-100">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <span className="text-xs text-gray-400 font-medium uppercase">
                                                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dateObj.getDay()]}
                                                            </span>
                                                            <p className="text-sm font-bold text-gray-800">{formatDate(dateObj)}</p>
                                                        </div>
                                                    </td>

                                                    {record ? (
                                                        <>
                                                            <td className="p-4 text-center font-medium text-blue-700 bg-blue-50/10 border-r border-gray-100">
                                                                {formatTime(record.date)}
                                                            </td>
                                                            <td className="p-4 text-center font-medium text-orange-700 bg-orange-50/10 border-r border-gray-100">
                                                                {formatTime(record.checkoutTime)}
                                                            </td>
                                                            <td className="p-4 text-center text-gray-600 font-medium border-r border-gray-100">
                                                                {formatMinutes(calculateBreakDuration(record.breaks, ['TEA']))}
                                                            </td>
                                                            <td className="p-4 text-center text-gray-600 font-medium border-r border-gray-100">
                                                                {formatMinutes(calculateBreakDuration(record.breaks, ['LUNCH']))}
                                                            </td>
                                                            <td className="p-4 text-center text-gray-600 font-medium border-r border-gray-100">
                                                                {formatMinutes(calculateBreakDuration(record.breaks, ['CLIENT_MEETING']))}
                                                            </td>
                                                            <td className="p-4 text-center text-gray-600 font-medium border-r border-gray-100">
                                                                {formatMinutes(calculateBreakDuration(record.breaks, ['ONLINE_DISCUSSION']))}
                                                            </td>
                                                            <td className="p-4 text-center font-bold text-green-700 bg-green-50/30">
                                                                {calculateTotalHours(record)}
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <td colSpan="7" className="p-4 text-center text-gray-400 font-medium bg-gray-50/50">
                                                            Absent / No Data
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeAttendanceDetail;
