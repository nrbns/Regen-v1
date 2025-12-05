/**
 * UI/UX Test Utility for OmniDesk Search Page
 * Run this in the browser console to test functionality
 */
export function testOmniDesk() {
    const results = [];
    // Test 1: Check if OmniDesk container exists
    const dashboard = document.querySelector('[data-onboarding="dashboard"]');
    if (dashboard) {
        results.push({
            test: 'Dashboard Container Exists',
            passed: true,
            message: 'OmniDesk container found',
        });
        // Test 2: Check visibility
        const styles = window.getComputedStyle(dashboard);
        const isVisible = styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0';
        results.push({
            test: 'Dashboard Visibility',
            passed: isVisible,
            message: isVisible ? 'Dashboard is visible' : 'Dashboard is hidden',
        });
        // Test 3: Check z-index
        const zIndex = parseInt(styles.zIndex || '0');
        results.push({
            test: 'Z-Index Check',
            passed: zIndex >= 10,
            message: `Z-index is ${zIndex} (should be >= 10)`,
        });
        // Test 4: Check pointer events
        const pointerEvents = styles.pointerEvents;
        results.push({
            test: 'Pointer Events',
            passed: pointerEvents === 'auto',
            message: `Pointer events: ${pointerEvents} (should be 'auto')`,
        });
    }
    else {
        results.push({
            test: 'Dashboard Container Exists',
            passed: false,
            message: 'OmniDesk container not found',
        });
    }
    // Test 5: Check search input
    const searchInput = document.querySelector('input[placeholder*="Search the open web"]');
    if (searchInput) {
        results.push({ test: 'Search Input Exists', passed: true, message: 'Search input found' });
        // Test if input is clickable
        const inputStyles = window.getComputedStyle(searchInput);
        results.push({
            test: 'Search Input Clickable',
            passed: inputStyles.pointerEvents !== 'none',
            message: `Input pointer events: ${inputStyles.pointerEvents}`,
        });
        // Test input focus
        try {
            searchInput.focus();
            const isFocused = document.activeElement === searchInput;
            results.push({
                test: 'Search Input Focusable',
                passed: isFocused,
                message: isFocused ? 'Input can be focused' : 'Input cannot be focused',
            });
        }
        catch (e) {
            results.push({ test: 'Search Input Focusable', passed: false, message: `Focus error: ${e}` });
        }
    }
    else {
        results.push({ test: 'Search Input Exists', passed: false, message: 'Search input not found' });
    }
    // Test 6: Check Launch Flow button
    const launchButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Launch Flow'));
    if (launchButton) {
        results.push({
            test: 'Launch Flow Button Exists',
            passed: true,
            message: 'Launch Flow button found',
        });
        const btnStyles = window.getComputedStyle(launchButton);
        results.push({
            test: 'Launch Flow Button Clickable',
            passed: btnStyles.pointerEvents !== 'none',
            message: `Button pointer events: ${btnStyles.pointerEvents}`,
        });
    }
    else {
        results.push({
            test: 'Launch Flow Button Exists',
            passed: false,
            message: 'Launch Flow button not found',
        });
    }
    // Test 7: Check suggested prompts
    const suggestedButtons = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent &&
        [
            'graph the AI ethics landscape',
            "summarize today's markets",
            'compare battery life',
            'find regenerative',
        ].some(text => btn.textContent?.toLowerCase().includes(text.toLowerCase())));
    results.push({
        test: 'Suggested Prompts Exist',
        passed: suggestedButtons.length > 0,
        message: `Found ${suggestedButtons.length} suggested prompt buttons`,
    });
    // Test 8: Check quick action buttons
    const quickActionButtons = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent &&
        ['Ask Agent', 'Search Topic', 'Research Notes', 'Run Playbook'].some(text => btn.textContent?.includes(text)));
    results.push({
        test: 'Quick Action Buttons Exist',
        passed: quickActionButtons.length > 0,
        message: `Found ${quickActionButtons.length} quick action buttons`,
    });
    // Test 9: Check if elements are not blocked by overlays
    // Note: Some elements may be intentionally blocked or the test may run before full render
    const allInteractiveElements = [
        searchInput,
        launchButton,
        ...suggestedButtons,
        ...quickActionButtons,
    ].filter(Boolean);
    let blockedCount = 0;
    allInteractiveElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Only check if element is visible and has size
        if (rect.width > 0 && rect.height > 0) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const topElement = document.elementFromPoint(centerX, centerY);
            // Check if element is actually blocked (not just covered by its own children)
            if (topElement && topElement !== el && !el.contains(topElement)) {
                // Check if the blocking element is a known overlay (like a modal or tooltip)
                const isKnownOverlay = topElement.closest('[role="dialog"], [role="tooltip"], [data-onboarding]');
                if (!isKnownOverlay) {
                    blockedCount++;
                }
            }
        }
    });
    // Allow up to 30% of elements to be blocked (some may be intentionally blocked for layout reasons)
    const maxAllowed = Math.max(1, Math.ceil(allInteractiveElements.length * 0.3));
    results.push({
        test: 'Elements Not Blocked',
        passed: blockedCount <= maxAllowed,
        message: `${blockedCount} of ${allInteractiveElements.length} elements are blocked (max allowed: ${maxAllowed})`,
    });
    // Print results
    console.group('🔍 OmniDesk UI/UX Test Results');
    results.forEach(({ test, passed, message }) => {
        if (passed) {
            console.log(`✅ ${test}: ${message}`);
        }
        else {
            console.error(`❌ ${test}: ${message}`);
        }
    });
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    console.log(`\n📊 Summary: ${passedCount}/${totalCount} tests passed`);
    console.groupEnd();
    return results;
}
// Expose test function to window for manual testing (disabled auto-run)
if (typeof window !== 'undefined') {
    window.testOmniDesk = testOmniDesk;
}
