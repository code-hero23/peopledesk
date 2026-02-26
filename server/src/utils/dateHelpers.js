const getISTDate = () => {
    const now = new Date();
    // UTC offset for IST is +5.5 hours
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    return istTime;
};

const getStartOfDayIST = (dateInput = new Date()) => {
    // 1. Get current time in UTC
    const now = dateInput ? new Date(dateInput) : new Date();

    // 2. Add 5 hours 30 mins to get IST time
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    // 3. Set IST time to midnight (00:00:00.000)
    istTime.setUTCHours(0, 0, 0, 0);

    // 4. Subtract 5 hours 30 mins to get back to UTC timestamp for that IST midnight
    // (Because database stores native Date objects which are usually UTC-aligned)
    const startOfDayUTC = new Date(istTime.getTime() - istOffset);

    return startOfDayUTC;
};

const getEndOfDayIST = (dateInput = new Date()) => {
    // Same logic, but set to 23:59:59.999
    const now = dateInput ? new Date(dateInput) : new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    istTime.setUTCHours(23, 59, 59, 999);

    const endOfDayUTC = new Date(istTime.getTime() - istOffset);

    return endOfDayUTC;
};

const getCycleStartDateIST = (dateInput = new Date(), yearParam, monthParam) => {
    let year, month;

    if (yearParam !== undefined && monthParam !== undefined) {
        year = parseInt(yearParam);
        month = parseInt(monthParam); // 0-indexed internally
    } else {
        const now = dateInput ? new Date(dateInput) : new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        year = istTime.getUTCFullYear();
        month = istTime.getUTCMonth();
        const date = istTime.getUTCDate();

        if (date < 26) {
            month -= 1;
            if (month < 0) {
                month = 11;
                year -= 1;
            }
        }
    }

    const istOffset = 5.5 * 60 * 60 * 1000;
    const cycleStartIST = new Date(Date.UTC(year, month, 26, 0, 0, 0, 0));
    return new Date(cycleStartIST.getTime() - istOffset);
};

const getCycleEndDateIST = (dateInput = new Date(), yearParam, monthParam) => {
    let year, month;

    if (yearParam !== undefined && monthParam !== undefined) {
        year = parseInt(yearParam);
        month = parseInt(monthParam);
    } else {
        const now = dateInput ? new Date(dateInput) : new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        year = istTime.getUTCFullYear();
        month = istTime.getUTCMonth();
        const date = istTime.getUTCDate();

        if (date >= 26) {
            month += 1;
            if (month > 11) {
                month = 0;
                year += 1;
            }
        }
    }

    const istOffset = 5.5 * 60 * 60 * 1000;
    // End is 25th of the NEXT logical month relative to start
    // If start was 26th Jan, end is 25th Feb.
    let endMonth = month + 1;
    let endYear = year;
    if (endMonth > 11) {
        endMonth = 0;
        endYear += 1;
    }

    const cycleEndIST = new Date(Date.UTC(endYear, endMonth, 25, 23, 59, 59, 999));
    return new Date(cycleEndIST.getTime() - istOffset);
};

// Helper to get the cycle that JUST finished (for default view)
const getLatestCompletedCycle = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);

    let year = istTime.getUTCFullYear();
    let month = istTime.getUTCMonth();
    const date = istTime.getUTCDate();

    // If today is Feb 26 or Feb 28, the "latest completed" is the one that ended Feb 25.
    // If today is Feb 10, the "latest completed" is the one that ended Jan 25.

    if (date < 26) {
        // We are currently IN a cycle that hasn't finished. 
        // Go back 2 months to get the start of the completed one.
        // e.g. Feb 10 -> current scale is Jan 26 - Feb 25. 
        // Completed one was Dec 26 - Jan 25.
        month -= 2;
    } else {
        // Today is 26th or later. e.g. Feb 26.
        // Current scale is Feb 26 - March 25.
        // Completed one was Jan 26 - Feb 25.
        month -= 1;
    }

    if (month < 0) {
        month += 12;
        year -= 1;
    }

    return { year, month }; // Returns start anchor for getCycleStartDateIST
};

module.exports = {
    getStartOfDayIST,
    getEndOfDayIST,
    getCycleStartDateIST,
    getCycleEndDateIST,
    getLatestCompletedCycle
};
