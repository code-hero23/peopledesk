/**
 * Robust device detection utility
 * Handles cases where mobile devices use "Desktop Mode"
 */
export const getDeviceType = () => {
    const ua = navigator.userAgent;

    // 1. Check navigator.userAgentData (Modern)
    if (navigator.userAgentData && navigator.userAgentData.mobile) {
        return 'mobile';
    }

    // 2. Hardware heuristics: Touch points
    // Most desktops don't have touch. Most mobiles do.
    // iPad in "Desktop Mode" has navigator.maxTouchPoints > 0 but navigator.userAgent looks like Mac.
    const hasTouch = (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0));

    // 3. User Agent keywords
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    // 4. Combined Logic
    if (isMobileUA) return 'mobile';

    // Special case for iPads/Tablets in Desktop mode
    // They usually report as Macintosh but have touch support
    if (hasTouch && /Macintosh/.test(ua)) return 'mobile';

    // Generic high touch device (likely mobile/tablet)
    if (hasTouch && window.innerWidth < 1200) return 'mobile';

    return 'desktop';
};
