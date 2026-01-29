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

module.exports = { getStartOfDayIST, getEndOfDayIST };
