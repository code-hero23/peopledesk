import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, Info } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { motion } from 'framer-motion';

/**
 * MonthCycleSelector
 * 
 * Handles selection of a month and calculates the 26th-25th cycle range.
 * Defaults to the current active cycle.
 * 
 * @param {Function} onCycleChange - Returns { startDate, endDate, label }
 */
const MonthCycleSelector = ({ onCycleChange, onCardClick }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Calculate initial cycle on mount
    useEffect(() => {
        const range = calculateCycleRange(new Date());
        onCycleChange(range);
    }, []);

    const calculateCycleRange = (date) => {
        const d = new Date(date);
        const day = d.getDate();
        let month = d.getMonth();
        let year = d.getFullYear();

        let cycleMonth, cycleYear;
        let startMonth, startYear;
        let endMonth, endYear;

        if (day >= 26) {
            // We are in the cycle that ends on the 25th of the NEXT month
            // Example: Feb 26 -> Ends Mar 25. This is the "March" cycle.
            startMonth = month;
            startYear = year;

            endMonth = month + 1;
            endYear = year;
            if (endMonth > 11) {
                endMonth = 0;
                endYear++;
            }

            cycleMonth = endMonth;
            cycleYear = endYear;
        } else {
            // We are in the cycle that ends on the 25th of the CURRENT month
            // Example: Feb 10 -> Ends Feb 25. This is the "February" cycle.
            endMonth = month;
            endYear = year;

            startMonth = month - 1;
            startYear = year;
            if (startMonth < 0) {
                startMonth = 11;
                startYear--;
            }

            cycleMonth = endMonth;
            cycleYear = endYear;
        }

        const startDate = new Date(Date.UTC(startYear, startMonth, 26, 0, 0, 0));
        const endDate = new Date(Date.UTC(endYear, endMonth, 25, 23, 59, 59, 999));

        const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(cycleYear, cycleMonth));

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            label: `${monthLabel} ${cycleYear} `,
            subLabel: `${formatDate(new Date(startYear, startMonth, 26))} - ${formatDate(new Date(endYear, endMonth, 25))} `
        };
    };

    const handlePrev = () => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setSelectedDate(newDate);
        onCycleChange(calculateCycleRange(newDate));
    };

    const handleNext = () => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setSelectedDate(newDate);
        onCycleChange(calculateCycleRange(newDate));
    };

    const currentCycle = calculateCycleRange(selectedDate);

    return (
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200 p-1.5 rounded-2xl shadow-sm">
            <button
                onClick={handlePrev}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                title="Previous Cycle"
            >
                <ChevronLeft size={20} />
            </button>

            <motion.button
                onClick={onCardClick}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                    y: [0, -4, 0],
                }}
                transition={{
                    y: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }
                }}
                className="group flex items-center gap-4 px-7 py-3 rounded-[2rem] bg-white border border-slate-100 hover:border-indigo-200 shadow-xl hover:shadow-2xl hover:shadow-indigo-100/50 transition-all relative overflow-hidden active:scale-95 z-10"
            >
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />

                <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-3 rounded-2xl shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                    <CalendarIcon className="text-white" size={24} />
                </div>

                <div className="text-left">
                    <div className="flex items-center gap-3">
                        <span className="text-base font-black text-slate-800 tracking-tight leading-none">
                            {formatDate(selectedDate).split('/').slice(1).join('/')}
                        </span>
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.9, 1, 0.9]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="px-3 py-1 rounded-full bg-indigo-600 text-[10px] font-black text-white uppercase tracking-widest shadow-md shadow-indigo-200"
                        >
                            My Calendar
                        </motion.div>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider opacity-70">View Cycle Details 26th - 25th</p>
                </div>
            </motion.button>

            <button
                onClick={handleNext}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                title="Next Cycle"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};


export default MonthCycleSelector;
