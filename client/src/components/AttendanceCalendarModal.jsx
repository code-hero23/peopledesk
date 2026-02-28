import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Info, CheckCircle2, Clock } from 'lucide-react';

const AttendanceCalendarModal = ({ isOpen, onClose, cycleData, attendanceHistory, leaves, permissions }) => {
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

    // Calculate all approved leave dates in this cycle, sorted
    const sortedLeaveDates = useMemo(() => {
        if (!leaves || !cycleData) return [];

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

        return Array.from(leaveDates).sort();
    }, [leaves, cycleData]);

    // Calculate all approved permission dates
    const approvedPermissionDates = useMemo(() => {
        if (!permissions || !cycleData) return new Set();

        const cycleStart = new Date(cycleData.startDate);
        const cycleEnd = new Date(cycleData.endDate);

        return new Set(
            permissions
                .filter(p => p.status === 'APPROVED')
                .map(p => new Date(p.date).toISOString().split('T')[0])
                .filter(dateStr => {
                    const d = new Date(dateStr);
                    return d >= cycleStart && d <= cycleEnd;
                })
        );
    }, [permissions, cycleData]);

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
        if (sortedLeaveDates.includes(dateStr)) {
            const leaveIndex = sortedLeaveDates.indexOf(dateStr);
            return leaveIndex < 4 ? 'LEAVE_BLUE' : 'LEAVE_ORANGE';
        }

        // 3. Check Permissions (Purple)
        if (approvedPermissionDates.has(dateStr)) {
            return 'PERMISSION';
        }

        // 4. Past days without data are ABSENT
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
                    className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto border border-white/20"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white relative">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <motion.div
                                    initial={{ rotate: -10 }}
                                    animate={{ rotate: 0 }}
                                    className="bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/10"
                                >
                                    <CalendarIcon className="text-blue-400" size={28} />
                                </motion.div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">{cycleData?.label}</h2>
                                    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em]">{cycleData?.subLabel}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-white/10 rounded-full transition-all hover:rotate-90"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-4 gap-3 mb-8">
                            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50 group hover:bg-emerald-50 transition-colors">
                                <p className="text-emerald-600 text-[9px] font-black uppercase tracking-wider mb-1">Present</p>
                                <p className="text-2xl font-black text-emerald-700">{attendanceHistory?.length || 0}</p>
                            </div>
                            <div className={`${sortedLeaveDates.length <= 4 ? 'bg-blue-50/50 border-blue-100/50 hover:bg-blue-50' : 'bg-orange-50/50 border-orange-100/50 hover:bg-orange-50'} rounded-2xl p-4 border transition-colors group`}>
                                <p className={`${sortedLeaveDates.length <= 4 ? 'text-blue-600' : 'text-orange-600'} text-[9px] font-black uppercase tracking-wider mb-1`}>Leaves</p>
                                <p className={`text-2xl font-black ${sortedLeaveDates.length <= 4 ? 'text-blue-700' : 'text-orange-700'}`}>{sortedLeaveDates.length}</p>
                            </div>
                            <div className="bg-purple-50/50 rounded-2xl p-4 border border-purple-100/50 hover:bg-purple-50 transition-colors group">
                                <p className="text-purple-600 text-[9px] font-black uppercase tracking-wider mb-1">Permission</p>
                                <p className="text-2xl font-black text-purple-700">{approvedPermissionDates.size}</p>
                            </div>
                            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 hover:bg-slate-50 transition-colors group">
                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-wider mb-1">Status</p>
                                <div className={`mt-1 font-black leading-none`}>
                                    {sortedLeaveDates.length > 4 ? (
                                        <span className="text-orange-600 text-[10px] uppercase">Alert</span>
                                    ) : (
                                        <span className="text-emerald-600 text-[10px] uppercase">Safe</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1.5 mb-8">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest py-2">
                                    {day}
                                </div>
                            ))}

                            {calendarDays.map((date, idx) => {
                                const status = getDayStatus(date);
                                const dateStr = date.toISOString().split('T')[0]; // Define dateStr here
                                const isToday = date.toDateString() === new Date().toDateString();

                                const getStatusStyles = (status) => {
                                    switch (status) {
                                        case 'PRESENT':
                                            return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white shadow-lg shadow-emerald-200/50';
                                        case 'ABSENT':
                                            return 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-300 text-white shadow-lg shadow-rose-200/50';
                                        case 'LEAVE_BLUE':
                                            return 'bg-gradient-to-br from-indigo-400 to-indigo-600 border-indigo-300 text-white shadow-lg shadow-indigo-200/50';
                                        case 'LEAVE_ORANGE':
                                            return 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-white shadow-lg shadow-amber-200/50';
                                        case 'PERMISSION':
                                            return 'bg-gradient-to-br from-violet-400 to-violet-600 border-violet-300 text-white shadow-lg shadow-violet-200/50';
                                        default:
                                            return 'bg-white border-slate-100 text-slate-400 hover:border-slate-300';
                                    }
                                };

                                return (
                                    <div key={idx} className="relative group perspective-1000">
                                        <motion.div
                                            key={dateStr}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.01 }} // Changed index to idx
                                            whileHover={{ scale: 1.05, translateZ: 10 }}
                                            className={`
                                                relative h-14 sm:h-20 rounded-2xl flex flex-col items-center justify-center 
                                                text-sm font-black transition-all cursor-default border-2
                                                ${getStatusStyles(status)}
                                                group
                                                ${isToday ? 'ring-4 ring-indigo-500/30 border-indigo-500 scale-105 z-10' : ''}
                                            `}
                                        >
                                            <span className="text-sm font-black">{date.getDate()}</span>
                                            <span className="text-[7px] font-bold opacity-70 uppercase tracking-tighter">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                                        </motion.div>

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900/90 text-white text-[9px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap z-50 pointer-events-none backdrop-blur-sm border border-white/10 shadow-xl">
                                            {status === 'PRESENT' ? '✓ Present' :
                                                status === 'LEAVE_NORMAL' ? '✈ Leave (Standard)' :
                                                    status === 'LEAVE_EXCESS' ? '⚠ Leave (Excess)' :
                                                        status === 'PERMISSION' ? '🕒 Permission' :
                                                            status === 'ABSENT' ? '✖ Absent' : '○ Pending'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            {[
                                { color: 'bg-gradient-to-br from-emerald-400 to-emerald-600', label: 'Present' },
                                { color: 'bg-gradient-to-br from-rose-400 to-rose-600', label: 'Absent' },
                                { color: 'bg-gradient-to-br from-indigo-400 to-indigo-600', label: 'Leave' },
                                { color: 'bg-gradient-to-br from-amber-400 to-amber-600', label: 'Excess' },
                                { color: 'bg-gradient-to-br from-violet-400 to-violet-600', label: 'Permit' },
                                { color: 'bg-white border-slate-200', label: 'Empty' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-md ${item.color} shadow-sm border border-black/5`}></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AttendanceCalendarModal;
