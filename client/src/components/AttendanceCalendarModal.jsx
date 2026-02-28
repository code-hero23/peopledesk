import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Info, CheckCircle2, Clock } from 'lucide-react';

const AttendanceCalendarModal = ({ isOpen, onClose, cycleData, attendanceHistory, leaves }) => {
    // Generate dates from 26th to 25th
    const calendarDays = useMemo(() => {
        if (!cycleData?.startDate || !cycleData?.endDate) return [];

        const start = new Date(cycleData.startDate);
        const end = new Date(cycleData.endDate);
        const dates = [];
        let curr = new Date(start);

        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    }, [cycleData]);

    // Calculate total approved leave days in this cycle
    const leaveDayCount = useMemo(() => {
        if (!leaves || !cycleData) return 0;

        const approvedLeaves = leaves.filter(l => l.status === 'APPROVED');
        const leaveDates = new Set();

        const cycleStart = new Date(cycleData.startDate);
        const cycleEnd = new Date(cycleData.endDate);

        approvedLeaves.forEach(leave => {
            let curr = new Date(leave.startDate);
            const end = new Date(leave.endDate);

            while (curr <= end) {
                // Only count if within cycle
                if (curr >= cycleStart && curr <= cycleEnd) {
                    leaveDates.add(curr.toISOString().split('T')[0]);
                }
                curr.setDate(curr.getDate() + 1);
            }
        });

        return leaveDates.size;
    }, [leaves, cycleData]);

    const getDayStatus = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        // 1. Check Attendance (Green)
        const isPresent = attendanceHistory?.some(a => a.date.startsWith(dateStr));
        if (isPresent) return 'PRESENT';

        // 2. Check Leaves (Blue/Orange)
        const isLeave = leaves?.some(l => {
            if (l.status !== 'APPROVED') return false;
            const start = new Date(l.startDate).toISOString().split('T')[0];
            const end = new Date(l.endDate).toISOString().split('T')[0];
            return dateStr >= start && dateStr <= end;
        });

        if (isLeave) {
            return leaveDayCount <= 4 ? 'LEAVE_NORMAL' : 'LEAVE_EXCESS';
        }

        // 3. Past days without data are ABSENT
        if (checkDate < today) {
            return 'ABSENT';
        }

        return 'UNMARKED';
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 mb-20 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white relative">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2.5 rounded-xl">
                                    <CalendarIcon className="text-blue-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight">{cycleData?.label}</h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{cycleData?.subLabel}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                <p className="text-emerald-600 text-[10px] font-black uppercase tracking-wider mb-1">Present</p>
                                <p className="text-2xl font-black text-emerald-700">{attendanceHistory?.length || 0} <span className="text-xs font-bold">Days</span></p>
                            </div>
                            <div className={`${leaveDayCount <= 4 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'} rounded-2xl p-4 border`}>
                                <p className={`${leaveDayCount <= 4 ? 'text-blue-600' : 'text-orange-600'} text-[10px] font-black uppercase tracking-wider mb-1`}>Leaves</p>
                                <p className={`text-2xl font-black ${leaveDayCount <= 4 ? 'text-blue-700' : 'text-orange-700'}`}>{leaveDayCount} <span className="text-xs font-bold">Days</span></p>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Status</p>
                                <p className={`text-xs font-bold flex items-center gap-1.5 mt-2 ${leaveDayCount > 4 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                    {leaveDayCount > 4 ? <Info size={14} /> : <CheckCircle2 size={14} />}
                                    {leaveDayCount > 4 ? 'Threshold Exceeded' : 'Within Limits'}
                                </p>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-2 mb-6">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-1">
                                    {day}
                                </div>
                            ))}

                            {/* Empty cells for padding if first day isn't Sunday? 
                                Actually, since it's a 26th-25th grid, we should probably just list the days sequentially 
                                but showing them in a 7-col grid makes sense. */}
                            {calendarDays.map((date, idx) => {
                                const status = getDayStatus(date);
                                const isToday = date.toDateString() === new Date().toDateString();

                                return (
                                    <div key={idx} className="relative group">
                                        <div
                                            className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all border
                                                ${status === 'PRESENT' ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-200' :
                                                    status === 'LEAVE_NORMAL' ? 'bg-blue-500 border-blue-400 text-white shadow-sm shadow-blue-200' :
                                                        status === 'LEAVE_EXCESS' ? 'bg-orange-500 border-orange-400 text-white shadow-sm shadow-orange-200' :
                                                            status === 'ABSENT' ? 'bg-red-500 border-red-400 text-white shadow-sm shadow-red-200' :
                                                                'bg-slate-100 border-slate-200 text-slate-400'}
                                                ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105 z-10' : ''}
                                            `}
                                        >
                                            <span className="text-xs font-black">{date.getDate()}</span>
                                            <span className="text-[8px] font-bold opacity-60 uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                                        </div>

                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                            {status === 'PRESENT' ? 'Present' :
                                                status === 'LEAVE_NORMAL' ? 'Leave (Blue)' :
                                                    status === 'LEAVE_EXCESS' ? 'Excess Leave (Orange)' :
                                                        status === 'ABSENT' ? 'Absent (Red)' : 'Unmarked'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100 justify-center">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-emerald-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Working</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-blue-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Leave (≤4)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-orange-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Leave (&gt;4)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-red-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Absent</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Unmarked</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AttendanceCalendarModal;
