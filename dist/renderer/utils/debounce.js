/**
 * Debounce utility for scroll/resize handlers
 * Prevents excessive function calls
 */
export function debounce(func, wait) {
    let timeoutId = null;
    return function debounced(...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
            timeoutId = null;
        }, wait);
    };
}
/**
 * Throttle utility - limits function execution rate
 */
export function throttle(func, limit) {
    let inThrottle = false;
    return function throttled(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}
