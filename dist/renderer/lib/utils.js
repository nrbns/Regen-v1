/**
 * Utility helpers shared across UI layers.
 */
function flatten(values) {
    const result = [];
    values.forEach((value) => {
        if (!value) {
            return;
        }
        if (Array.isArray(value)) {
            result.push(...flatten(value));
        }
        else {
            result.push(String(value));
        }
    });
    return result;
}
export function cn(...inputs) {
    return flatten(inputs)
        .filter((value) => value.trim().length > 0)
        .join(' ');
}
