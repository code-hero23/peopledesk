export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = String(hours).padStart(2, '0');

    return `${day}/${month}/${year} ${strHours}:${minutes}:${seconds} ${ampm}`;
};

export const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${strHours}:${minutes} ${ampm}`;
};

/**
 * Robustly parse a date string in DD/MM/YYYY format
 * This prevents common M/D/Y vs D/M/Y displacement issues in JS Date()
 */
export const parseDateDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return new Date(dateStr); // Fallback to native if not our expected format

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS month is 0-indexed
    const year = parseInt(parts[2], 10);

    return new Date(year, month, day);
};
export const getYYYYMMDD = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const getHHMM = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

export const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 0) return 'just now';
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) {
        const m = Math.floor(diffInSeconds / 60);
        return `${m} minute${m > 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 86400) {
        const h = Math.floor(diffInSeconds / 3600);
        return `${h} hour${h > 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 604800) {
        const d = Math.floor(diffInSeconds / 86400);
        return `${d} day${d > 1 ? 's' : ''} ago`;
    }
    
    return formatDate(dateString);
};
