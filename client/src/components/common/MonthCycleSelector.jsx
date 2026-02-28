import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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
            label: `${monthLabel} ${cycleYear}`,
            subLabel: `${new Date(startYear, startMonth, 26).toLocaleDateString()} - ${new Date(endYear, endMonth, 25).toLocaleDateString()}`
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

            <button
                onClick={onCardClick}
                className="flex items-center gap-3 px-4 py-1.5 rounded-xl hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100 group text-left min-w-[200px]"
            >
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                    <Calendar size={20} />
                </div>
                <div>
                    <div className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                        {currentCycle.label}
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">VIEW CALENDAR</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentCycle.subLabel}</div>
                </div>
            </button>

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
