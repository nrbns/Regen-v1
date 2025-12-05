/**
 * WISPR Form Auto-Fill System
 * Saves and fills user profile data in forms
 */
const PROFILE_STORAGE_KEY = 'wispr:userProfile';
/**
 * Save user profile to localStorage
 */
export function saveUserProfile(profile) {
    try {
        const existing = getUserProfile();
        const updated = { ...existing, ...profile };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    }
    catch (error) {
        console.error('[WISPR] Failed to save profile:', error);
        throw new Error('Failed to save profile');
    }
}
/**
 * Get saved user profile
 */
export function getUserProfile() {
    try {
        const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    }
    catch (error) {
        console.warn('[WISPR] Failed to load profile:', error);
    }
    return {};
}
/**
 * Clear saved profile
 */
export function clearUserProfile() {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
}
/**
 * Fill a form with profile data
 */
export function fillForm(form, profile) {
    let filledCount = 0;
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach((input) => {
        const name = input.name?.toLowerCase() || '';
        const id = input.id?.toLowerCase() || '';
        const placeholder = input.placeholder?.toLowerCase() || '';
        const type = input.type?.toLowerCase() || 'text';
        const label = input.labels?.[0]?.textContent?.toLowerCase() || '';
        // Skip hidden, submit, and button inputs
        if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') {
            return;
        }
        // Match input fields to profile data
        let value;
        // Name matching
        if (name.includes('name') ||
            id.includes('name') ||
            placeholder.includes('name') ||
            label.includes('name')) {
            value = profile.name;
        }
        // Email matching
        else if (name.includes('email') ||
            id.includes('email') ||
            placeholder.includes('email') ||
            label.includes('email')) {
            value = profile.email;
        }
        // Phone matching
        else if (name.includes('phone') ||
            id.includes('phone') ||
            placeholder.includes('phone') ||
            name.includes('mobile') ||
            label.includes('phone') ||
            label.includes('mobile')) {
            value = profile.phone;
        }
        // Address matching
        else if (name.includes('address') ||
            id.includes('address') ||
            placeholder.includes('address') ||
            label.includes('address')) {
            value = profile.address;
        }
        // City matching
        else if (name.includes('city') ||
            id.includes('city') ||
            placeholder.includes('city') ||
            label.includes('city')) {
            value = profile.city;
        }
        // State matching
        else if (name.includes('state') ||
            id.includes('state') ||
            placeholder.includes('state') ||
            label.includes('state')) {
            value = profile.state;
        }
        // Pincode/ZIP matching
        else if (name.includes('pincode') ||
            id.includes('pincode') ||
            placeholder.includes('pincode') ||
            name.includes('zip') ||
            name.includes('postal') ||
            label.includes('pincode') ||
            label.includes('zip')) {
            value = profile.pincode;
        }
        // Country matching
        else if (name.includes('country') ||
            id.includes('country') ||
            placeholder.includes('country') ||
            label.includes('country')) {
            value = profile.country;
        }
        // Aadhaar matching
        else if (name.includes('aadhaar') ||
            id.includes('aadhaar') ||
            placeholder.includes('aadhaar') ||
            label.includes('aadhaar') ||
            name.includes('aadhar')) {
            value = profile.aadhaar;
        }
        // PAN matching
        else if (name.includes('pan') ||
            id.includes('pan') ||
            placeholder.includes('pan') ||
            label.includes('pan')) {
            value = profile.pan;
        }
        // Date of birth matching
        else if (name.includes('dob') ||
            id.includes('dob') ||
            placeholder.includes('dob') ||
            name.includes('birth') ||
            label.includes('birth') ||
            label.includes('dob')) {
            value = profile.dob;
        }
        // Gender matching
        else if (name.includes('gender') ||
            id.includes('gender') ||
            placeholder.includes('gender') ||
            label.includes('gender')) {
            value = profile.gender;
        }
        if (value) {
            // Handle different input types
            if (input.tagName === 'SELECT') {
                // Try to find matching option
                const options = Array.from(input.options);
                const matchingOption = options.find(opt => opt.value.toLowerCase() === value.toLowerCase() ||
                    opt.text.toLowerCase().includes(value.toLowerCase()));
                if (matchingOption) {
                    input.value = matchingOption.value;
                }
            }
            else if (type === 'checkbox' || type === 'radio') {
                // For checkboxes/radios, check if value matches
                if (input.value === value || input.value.toLowerCase() === value.toLowerCase()) {
                    input.checked = true;
                }
            }
            else {
                input.value = value;
            }
            // Trigger events to notify form handlers
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
        }
    });
    return filledCount;
}
/**
 * Fill all forms on the page
 */
export function fillAllForms(profile) {
    const forms = document.querySelectorAll('form');
    if (forms.length === 0) {
        return 0;
    }
    const userProfile = profile || getUserProfile();
    if (Object.keys(userProfile).length === 0) {
        return 0;
    }
    let totalFilled = 0;
    forms.forEach(form => {
        totalFilled += fillForm(form, userProfile);
    });
    return totalFilled;
}
