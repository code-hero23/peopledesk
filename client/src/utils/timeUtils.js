/**
 * Converts a time string (e.g., "09:30 AM") to minutes from midnight.
 * @param {string} timeStr - The time string to parse.
 * @returns {number} - Minutes from midnight.
 */
export const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':');

    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (h === 12) h = 0;
    if (modifier === 'PM') h += 12;

    return h * 60 + m;
};

/**
 * Checks if a check-in time is covered by a permission's time range.
 * @param {Date|string} checkInTime - The check-in time.
 * @param {string} startTimeStr - Permission start time (e.g., "09:00 AM").
 * @param {string} endTimeStr - Permission end time (e.g., "11:00 AM").
 * @returns {boolean} - True if covered.
 */
export const isTimeCoveredByPermission = (checkInTime, startTimeStr, endTimeStr) => {
    const checkInDate = new Date(checkInTime);
    const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();

    const startMinutes = parseTimeToMinutes(startTimeStr);
    const endMinutes = parseTimeToMinutes(endTimeStr);

    return checkInMinutes >= startMinutes && checkInMinutes <= endMinutes;
};
