/**
 * WISPR Command Handler
 * Parses and routes voice commands to appropriate executors
 */
import { useAppStore } from '../../state/appStore';
import { useSettingsStore } from '../../state/settingsStore';
import { ipc } from '../../lib/ipc-typed';
import { toast } from '../../utils/toast';
import { aiEngine } from '../ai/engine';
/**
 * Parse voice command into structured command
 */
export function parseWisprCommand(text) {
    const lowerText = text.toLowerCase().trim();
    const originalText = text.trim();
    // Trade commands - Enhanced Hindi + English patterns
    const tradePatterns = [
        // Hindi: "निफ्टी खरीदो 50" or "निफ्टी 50 खरीदो"
        /(?:निफ्टी|nifty|reliance|टीसीएस|tcs|hdfc|एचडीएफसी)\s*(?:(\d+)\s*)?(?:खरीदो|kharido|buy|बेचो|becho|sell)/i,
        // "Nifty kharido 50 quantity SL 24700"
        /(?:buy|kharido|खरीदो|becho|बेचो|sell)\s+(\w+)\s*(?:(\d+)\s*(?:quantity|qty|qty|मात्रा))?\s*(?:SL|stop\s*loss|स्टॉप\s*लॉस)\s*(\d+)?/i,
        // "100 HDFC Bank becho at market"
        /(\d+)\s+(\w+(?:\s+\w+)?)\s+(?:buy|kharido|खरीदो|becho|बेचो|sell)\s*(?:at\s*market|market\s*price)?/i,
        // "Buy 50 Nifty" or "50 Nifty buy"
        /(?:buy|kharido|खरीदो)\s+(\d+)\s+(\w+)/i,
        /(\d+)\s+(\w+)\s+(?:buy|kharido|खरीदो|sell|becho|बेचो)/i,
    ];
    for (const pattern of tradePatterns) {
        const match = lowerText.match(pattern);
        if (match) {
            const isSell = lowerText.includes('sell') || lowerText.includes('becho') || lowerText.includes('बेचो');
            // Extract symbol (handle Hindi names)
            let symbol = match[2] || match[1];
            if (lowerText.includes('निफ्टी') || lowerText.includes('nifty')) {
                symbol = 'NIFTY';
            }
            else if (lowerText.includes('टीसीएस') || lowerText.includes('tcs')) {
                symbol = 'TCS';
            }
            else if (lowerText.includes('एचडीएफसी') || lowerText.includes('hdfc')) {
                symbol = 'HDFC';
            }
            else if (lowerText.includes('reliance')) {
                symbol = 'RELIANCE';
            }
            // Extract quantity
            let quantity = 1;
            if (match[1] && !isNaN(parseInt(match[1], 10))) {
                quantity = parseInt(match[1], 10);
            }
            else if (match[2] && !isNaN(parseInt(match[2], 10))) {
                quantity = parseInt(match[2], 10);
            }
            // Extract stop loss
            const slMatch = lowerText.match(/(?:SL|stop\s*loss|स्टॉप\s*लॉस)\s*(\d+)/i);
            const stopLoss = slMatch ? parseInt(slMatch[1], 10) : undefined;
            return {
                type: 'trade',
                orderType: isSell ? 'sell' : 'buy',
                symbol: symbol.toUpperCase(),
                quantity,
                stopLoss,
                originalText,
            };
        }
    }
    // Weather commands - Hindi + English
    if (lowerText.includes('मौसम') ||
        lowerText.includes('weather') ||
        lowerText.includes('बारिश') ||
        lowerText.includes('गर्मी') ||
        lowerText.includes('temperature') ||
        lowerText.includes('तापमान')) {
        let city = 'Delhi'; // default
        if (lowerText.includes('मुंबई') || lowerText.includes('mumbai'))
            city = 'Mumbai';
        if (lowerText.includes('बैंगलोर') || lowerText.includes('bangalore'))
            city = 'Bangalore';
        if (lowerText.includes('कोलकाता') || lowerText.includes('kolkata'))
            city = 'Kolkata';
        if (lowerText.includes('चेन्नई') || lowerText.includes('chennai'))
            city = 'Chennai';
        if (lowerText.includes('हैदराबाद') || lowerText.includes('hyderabad'))
            city = 'Hyderabad';
        return {
            type: 'weather',
            query: city,
            originalText,
        };
    }
    // Train booking commands
    if (lowerText.includes('ट्रेन') ||
        lowerText.includes('train') ||
        lowerText.includes('टिकट') ||
        lowerText.includes('ticket') ||
        (lowerText.includes('book') && (lowerText.includes('train') || lowerText.includes('ट्रेन')))) {
        let from = 'Delhi';
        let to = 'Mumbai';
        let date = 'tomorrow';
        // Extract cities
        if (lowerText.includes('मुंबई') || lowerText.includes('mumbai')) {
            if (lowerText.includes('से') || lowerText.includes('from'))
                to = 'Mumbai';
            else
                from = 'Mumbai';
        }
        if (lowerText.includes('दिल्ली') || lowerText.includes('delhi')) {
            if (lowerText.includes('से') || lowerText.includes('from'))
                from = 'Delhi';
            else
                to = 'Delhi';
        }
        if (lowerText.includes('चेन्नई') || lowerText.includes('chennai'))
            to = 'Chennai';
        if (lowerText.includes('बैंगलोर') || lowerText.includes('bangalore'))
            to = 'Bangalore';
        if (lowerText.includes('कोलकाता') || lowerText.includes('kolkata'))
            to = 'Kolkata';
        return {
            type: 'train',
            query: `${from} to ${to} on ${date}`,
            url: `train:${from}:${to}:${date}`,
            originalText,
        };
    }
    // Flight booking commands
    if (lowerText.includes('फ्लाइट') ||
        lowerText.includes('flight') ||
        lowerText.includes('हवाई जहाज') ||
        lowerText.includes('उड़ान') ||
        (lowerText.includes('book') && (lowerText.includes('flight') || lowerText.includes('फ्लाइट')))) {
        let from = 'Delhi';
        let to = 'Mumbai';
        let date = 'tomorrow';
        let returnDate = undefined;
        // Extract cities
        if (lowerText.includes('मुंबई') || lowerText.includes('mumbai'))
            to = 'Mumbai';
        if (lowerText.includes('बैंगलोर') || lowerText.includes('bangalore'))
            to = 'Bangalore';
        if (lowerText.includes('चेन्नई') || lowerText.includes('chennai'))
            to = 'Chennai';
        if (lowerText.includes('दिल्ली') || lowerText.includes('delhi'))
            from = 'Delhi';
        // Detect round-trip
        if (lowerText.includes('वापस') ||
            lowerText.includes('return') ||
            lowerText.includes('राउंड') ||
            lowerText.includes('दोनों तरफ')) {
            returnDate = '20 December'; // Parse from text if needed
        }
        return {
            type: 'flight',
            query: `${from} to ${to} on ${date}${returnDate ? ` return ${returnDate}` : ''}`,
            url: `flight:${from}:${to}:${date}${returnDate ? `:${returnDate}` : ''}`,
            originalText,
        };
    }
    // Research commands
    if (lowerText.includes('research') || lowerText.includes('research kar')) {
        const researchMatch = lowerText.match(/research\s+(?:kar\s+)?(.+)/i);
        return {
            type: 'research',
            query: researchMatch?.[1] || originalText.replace(/research\s+(?:kar\s+)?/i, ''),
            originalText,
        };
    }
    // Search commands
    if (lowerText.includes('search') ||
        lowerText.includes('dhundho') ||
        lowerText.includes('खोजो') ||
        lowerText.includes('show me') ||
        lowerText.includes('dikhao')) {
        const searchMatch = lowerText.match(/(?:search|dhundho|खोजो|show\s+me|dikhao)\s+(.+)/i);
        return {
            type: 'search',
            query: searchMatch?.[1] || originalText,
            originalText,
        };
    }
    // Summarize commands
    if (lowerText.includes('summarize') ||
        lowerText.includes('summary') ||
        lowerText.includes('samjha de') ||
        lowerText.includes('समझा दे')) {
        return {
            type: 'summarize',
            query: originalText,
            originalText,
        };
    }
    // Explain code commands
    if (lowerText.includes('explain') ||
        lowerText.includes('kya kar raha hai') ||
        lowerText.includes('क्या कर रहा है')) {
        return {
            type: 'explain',
            query: originalText,
            originalText,
        };
    }
    // Fill form commands
    if (lowerText.includes('fill') ||
        lowerText.includes('daal do') ||
        lowerText.includes('डाल दो') ||
        lowerText.includes('form fill') ||
        lowerText.includes('auto fill')) {
        return {
            type: 'fill_form',
            query: originalText,
            originalText,
        };
    }
    // Save profile commands
    if (lowerText.includes('save my profile') ||
        lowerText.includes('save profile') ||
        lowerText.includes('mera profile save kar') ||
        lowerText.includes('मेरा प्रोफाइल सेव कर')) {
        return {
            type: 'save_profile',
            query: originalText,
            originalText,
        };
    }
    // Screenshot/analysis commands - Enhanced Hindi support
    if (lowerText.includes('screenshot') ||
        lowerText.includes('स्क्रीनशॉट') ||
        lowerText.includes('screenshot le') ||
        lowerText.includes('स्क्रीनशॉट ले') ||
        lowerText.includes('isme kya hai') ||
        lowerText.includes('इसमें क्या है') ||
        lowerText.includes('analysis') ||
        lowerText.includes('analysis kar') ||
        lowerText.includes('एनालिसिस कर') ||
        lowerText.includes('yeh chart') ||
        lowerText.includes('यह चार्ट')) {
        return {
            type: 'screenshot',
            query: originalText,
            originalText,
        };
    }
    // Open multiple tabs
    if (lowerText.includes('open') && lowerText.match(/\d+\s+tab/)) {
        const tabsMatch = lowerText.match(/open\s+(\d+)\s+tab/i);
        const queryMatch = lowerText.match(/about\s+(.+)/i);
        return {
            type: 'open_tabs',
            tabs: tabsMatch ? parseInt(tabsMatch[1], 10) : 5,
            query: queryMatch?.[1],
            originalText,
        };
    }
    // Navigate commands
    if (lowerText.includes('open') || lowerText.includes('go to') || lowerText.includes('kholo')) {
        const urlMatch = lowerText.match(/(?:open|go\s+to|kholo)\s+(.+)/i);
        return {
            type: 'navigate',
            url: urlMatch?.[1] || originalText,
            originalText,
        };
    }
    // Default: treat as search
    return {
        type: 'search',
        query: originalText,
        originalText,
    };
}
/**
 * Execute parsed WISPR command
 */
export async function executeWisprCommand(command) {
    const currentMode = useAppStore.getState().mode;
    try {
        // Route command to backend if in Tauri
        const { isElectronRuntime } = await import('../../lib/env');
        if (isElectronRuntime()) {
            try {
                const { ipc } = await import('../../lib/ipc-typed');
                const modeName = currentMode.toLowerCase();
                const result = await ipc.invoke('wispr_command', {
                    input: command.originalText,
                    mode: modeName,
                });
                if (result) {
                    toast.success(result);
                    return;
                }
            }
            catch (error) {
                console.warn('[WISPR] Backend routing failed, using frontend:', error);
            }
        }
        // Fallback to frontend execution
        switch (command.type) {
            case 'trade':
                await executeTradeCommand(command);
                break;
            case 'research':
                await executeResearchCommand(command);
                break;
            case 'search':
                await executeSearchCommand(command);
                break;
            case 'summarize':
                await executeSummarizeCommand(command);
                break;
            case 'explain':
                await executeExplainCommand(command);
                break;
            case 'fill_form':
                await executeFillFormCommand(command);
                break;
            case 'save_profile':
                await executeSaveProfileCommand(command);
                break;
            case 'screenshot':
                await executeScreenshotCommand(command);
                break;
            case 'open_tabs':
                await executeOpenTabsCommand(command);
                break;
            case 'navigate':
                await executeNavigateCommand(command);
                break;
            case 'weather':
                await executeWeatherCommand(command);
                break;
            case 'train':
                await executeTrainCommand(command);
                break;
            case 'flight':
                await executeFlightCommand(command);
                break;
            default:
                // Fallback to AI search
                await executeSearchCommand(command);
        }
    }
    catch (error) {
        console.error('[WISPR] Command execution failed:', error);
        toast.error(`Failed to execute: ${command.originalText}`);
    }
}
async function executeTradeCommand(command) {
    // Switch to Trade mode if not already
    if (useAppStore.getState().mode !== 'Trade') {
        useAppStore.getState().setMode('Trade');
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for mode switch
    }
    const { symbol, quantity, orderType, stopLoss, takeProfit } = command;
    if (!symbol || !quantity) {
        toast.error('Missing symbol or quantity for trade command');
        return;
    }
    // Filter orderType to only 'buy' or 'sell' (API doesn't accept 'limit' or 'market')
    const validOrderType = orderType === 'buy' || orderType === 'sell' ? orderType : 'buy';
    // Execute REAL Zerodha order via API
    try {
        const startTime = Date.now();
        toast.info(`Placing ${validOrderType} order: ${quantity} ${symbol}...`);
        const { tradeApi } = await import('../../lib/api-client');
        const result = await tradeApi.placeOrder({
            symbol: symbol.toUpperCase(),
            quantity,
            orderType: validOrderType,
            stopLoss,
            takeProfit,
        });
        const elapsed = Date.now() - startTime;
        if (result.success) {
            const message = `${validOrderType === 'buy' ? 'BUY' : 'SELL'} order placed: ${quantity} × ${symbol}\nOrder ID: ${result.orderId}\nTime: ${elapsed}ms${stopLoss ? `\nSL: ₹${stopLoss}` : ''}${takeProfit ? ` | TP: ₹${takeProfit}` : ''}`;
            toast.success(message);
            // Emit event for UI update
            window.dispatchEvent(new CustomEvent('wispr:trade', {
                detail: {
                    symbol,
                    quantity,
                    orderType: validOrderType,
                    stopLoss,
                    orderId: result.orderId,
                    success: true,
                },
            }));
            // Voice confirmation in Hindi/English
            if ('speechSynthesis' in window) {
                const lang = useSettingsStore.getState().language || 'en';
                const utterance = new SpeechSynthesisUtterance(lang === 'hi'
                    ? `${validOrderType === 'buy' ? 'खरीद' : 'बिक्री'} आदेश ${result.orderId} सफल`
                    : `${validOrderType === 'buy' ? 'Buy' : 'Sell'} order ${result.orderId} placed successfully`);
                utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
                speechSynthesis.speak(utterance);
            }
        }
        else {
            throw new Error('Order placement failed');
        }
    }
    catch (error) {
        console.error('[WISPR] Trade order failed:', error);
        const errorMsg = error.message || 'Failed to place order. Check Zerodha API keys.';
        toast.error(`Order failed: ${errorMsg}`);
        // Fallback: Emit event for mock execution (for testing)
        window.dispatchEvent(new CustomEvent('wispr:trade', {
            detail: { symbol, quantity, orderType, stopLoss, success: false, error: errorMsg },
        }));
    }
}
async function executeResearchCommand(command) {
    // Switch to Research mode
    const currentMode = useAppStore.getState().mode;
    if (currentMode !== 'Research') {
        useAppStore.getState().setMode('Research');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!command.query) {
        toast.error('No research query provided');
        return;
    }
    // Trigger research search
    window.dispatchEvent(new CustomEvent('wispr:research', {
        detail: { query: command.query },
    }));
    toast.info(`Researching: ${command.query}`);
}
async function executeSearchCommand(command) {
    if (!command.query)
        return;
    // Use omni-search: search web + tabs + trading data
    const { normalizeInputToUrlOrSearch } = await import('../../lib/search');
    const { useSettingsStore } = await import('../../state/settingsStore');
    const settings = useSettingsStore.getState();
    const language = settings.language || 'auto';
    const searchEngine = settings.searchEngine || 'google';
    let searchProvider = 'google';
    if (searchEngine === 'duckduckgo' || searchEngine === 'bing' || searchEngine === 'yahoo') {
        searchProvider = searchEngine;
    }
    const targetUrl = normalizeInputToUrlOrSearch(command.query, searchProvider, language !== 'auto' ? language : undefined);
    await ipc.tabs.create(targetUrl);
    toast.success(`Searching: ${command.query}`);
}
async function executeSummarizeCommand(_command) {
    // Get active tab content and summarize
    const { useTabsStore } = await import('../../state/tabsStore');
    const tabsState = useTabsStore.getState();
    const tabs = tabsState.tabs;
    const activeTab = tabs.find(t => t.id === tabsState.activeId);
    if (!activeTab?.url || activeTab.url === 'about:blank') {
        toast.error('No page to summarize');
        return;
    }
    // Use AI to summarize
    const result = await aiEngine.runTask({
        kind: 'summary',
        prompt: `Summarize this page in 3 bullet points: ${activeTab.url}`,
        context: { url: activeTab.url },
    });
    // Show summary in a toast or overlay
    toast.success(result.text.substring(0, 200) + '...', { duration: 10000 });
}
async function executeExplainCommand(_command) {
    // Get selected text or page content
    const selectedText = window.getSelection()?.toString();
    if (!selectedText) {
        toast.error('No code selected. Please select code to explain.');
        return;
    }
    const result = await aiEngine.runTask({
        kind: 'chat',
        prompt: `Explain this code in simple language:\n\n${selectedText}`,
    });
    toast.success(result.text.substring(0, 300) + '...', { duration: 10000 });
}
async function executeFillFormCommand(_command) {
    const { fillAllForms, getUserProfile } = await import('./formFiller');
    const forms = document.querySelectorAll('form');
    if (forms.length === 0) {
        toast.error('No forms found on this page');
        return;
    }
    const profile = getUserProfile();
    if (Object.keys(profile).length === 0) {
        toast.info('No saved profile found. Say "Save my profile" to store your information first.');
        return;
    }
    const filledCount = fillAllForms(profile);
    if (filledCount > 0) {
        toast.success(`Filled ${filledCount} form field${filledCount === 1 ? '' : 's'} with saved profile`);
    }
    else {
        toast.info('No matching fields found. Profile data may not match form fields.');
    }
}
async function executeSaveProfileCommand(_command) {
    const { saveUserProfile } = await import('./formFiller');
    // Try to extract profile data from current page forms
    const forms = document.querySelectorAll('form');
    if (forms.length === 0) {
        toast.info('No forms found. Please fill a form first, then say "Save my profile" again.');
        return;
    }
    // Extract data from the first form
    const form = forms[0];
    const formData = new FormData(form);
    const profile = {};
    // Extract common fields
    // @ts-ignore - FormData.entries() exists but TypeScript types may be outdated
    for (const [key, value] of formData.entries()) {
        if (typeof value === 'string' && value.trim()) {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('name') && !profile.name) {
                profile.name = value;
            }
            else if (lowerKey.includes('email') && !profile.email) {
                profile.email = value;
            }
            else if ((lowerKey.includes('phone') || lowerKey.includes('mobile')) && !profile.phone) {
                profile.phone = value;
            }
            else if (lowerKey.includes('address') && !profile.address) {
                profile.address = value;
            }
            else if (lowerKey.includes('city') && !profile.city) {
                profile.city = value;
            }
            else if (lowerKey.includes('pincode') ||
                lowerKey.includes('zip') ||
                lowerKey.includes('postal')) {
                profile.pincode = value;
            }
            else if (lowerKey.includes('aadhaar') || lowerKey.includes('aadhar')) {
                profile.aadhaar = value;
            }
            else if (lowerKey.includes('pan')) {
                profile.pan = value;
            }
        }
    }
    if (Object.keys(profile).length > 0) {
        saveUserProfile(profile);
        toast.success(`Profile saved with ${Object.keys(profile).length} field${Object.keys(profile).length === 1 ? '' : 's'}`);
    }
    else {
        toast.info('No profile data found in forms. Please fill a form first.');
    }
}
export async function executeWeatherCommand(command) {
    try {
        const city = command.query || 'Delhi';
        // Use Tauri invoke if available
        if (typeof window !== 'undefined' && window.__TAURI__) {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('get_weather', { city });
            toast.success(`Weather for ${city} loading...`);
        }
        else {
            // Fallback: HTTP API
            try {
                const response = await fetch(`http://127.0.0.1:4000/api/weather/${city}`);
                if (response.ok) {
                    const data = await response.json();
                    window.dispatchEvent(new CustomEvent('weather-update', { detail: data }));
                }
            }
            catch (error) {
                console.warn('[WISPR] Weather API fallback failed:', error);
            }
        }
    }
    catch (error) {
        console.error('[WISPR] Weather command failed:', error);
        toast.error('Failed to get weather. Check internet connection.');
    }
}
export async function executeTrainCommand(command) {
    try {
        // Parse train command: "Delhi to Mumbai on tomorrow"
        const parts = command.query?.split(' to ') || [];
        const from = parts[0] || 'Delhi';
        const toParts = parts[1]?.split(' on ') || [];
        const to = toParts[0] || 'Mumbai';
        const date = toParts[1] || 'tomorrow';
        if (typeof window !== 'undefined' && window.__TAURI__) {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('book_train', { from, to, date });
            toast.success(`Booking train from ${from} to ${to}...`);
        }
        else {
            toast.info(`Train booking: ${from} → ${to} on ${date}`);
        }
    }
    catch (error) {
        console.error('[WISPR] Train command failed:', error);
        toast.error('Failed to book train. Please try again.');
    }
}
export async function executeFlightCommand(command) {
    try {
        // Parse flight command: "Delhi to Mumbai on tomorrow return 20 December"
        const parts = command.query?.split(' to ') || [];
        const from = parts[0] || 'Delhi';
        const toParts = parts[1]?.split(' on ') || [];
        const to = toParts[0] || 'Mumbai';
        const dateParts = toParts[1]?.split(' return ') || [];
        const departDate = dateParts[0] || 'tomorrow';
        const returnDate = dateParts[1] || undefined;
        if (typeof window !== 'undefined' && window.__TAURI__) {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('book_flight', { from, to, departDate, returnDate });
            toast.success(`Booking flight: ${from} → ${to}${returnDate ? ' (round-trip)' : ''}...`);
        }
        else {
            toast.info(`Flight booking: ${from} → ${to} on ${departDate}${returnDate ? ` return ${returnDate}` : ''}`);
        }
    }
    catch (error) {
        console.error('[WISPR] Flight command failed:', error);
        toast.error('Failed to book flight. Please try again.');
    }
}
async function executeScreenshotCommand(_command) {
    const { captureAndAnalyze } = await import('./screenshotAnalyzer');
    // Extract query from command (e.g., "Yeh chart ka analysis kar")
    const query = _command.query
        ?.replace(/screenshot|isme kya hai|इसमें क्या है|analysis|analyze/gi, '')
        .trim();
    toast.info('Capturing screenshot...');
    const analysis = await captureAndAnalyze(query || undefined);
    if (analysis) {
        // Show analysis in a modal or expanded panel
        const modal = document.createElement('div');
        modal.className =
            'fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm';
        modal.innerHTML = `
      <div class="bg-slate-900 border border-purple-600 rounded-3xl p-8 max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-purple-300">WISPR Screenshot Analysis</h2>
          <button class="text-gray-400 hover:text-white" onclick="this.closest('.fixed').remove()">✕</button>
        </div>
        <div class="text-gray-200 whitespace-pre-wrap">${analysis}</div>
        <button 
          class="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
          onclick="this.closest('.fixed').remove()"
        >
          Close
        </button>
      </div>
    `;
        document.body.appendChild(modal);
        // Close on click outside
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    else {
        toast.error('Failed to analyze screenshot');
    }
}
async function executeOpenTabsCommand(command) {
    const tabsCount = command.tabs || 5;
    const query = command.query || '';
    if (!query) {
        toast.error('No search query provided');
        return;
    }
    // Search and open multiple tabs
    const { normalizeInputToUrlOrSearch } = await import('../../lib/search');
    const { useSettingsStore } = await import('../../state/settingsStore');
    const settings = useSettingsStore.getState();
    const searchEngine = settings.searchEngine || 'google';
    let searchProvider = 'google';
    if (searchEngine === 'duckduckgo' || searchEngine === 'bing' || searchEngine === 'yahoo') {
        searchProvider = searchEngine;
    }
    // Open multiple tabs with search variations
    for (let i = 0; i < tabsCount; i++) {
        const searchQuery = `${query} ${i > 0 ? `page ${i + 1}` : ''}`;
        const targetUrl = normalizeInputToUrlOrSearch(searchQuery, searchProvider);
        await ipc.tabs.create(targetUrl);
        await new Promise(resolve => setTimeout(resolve, 200)); // Stagger tab creation
    }
    toast.success(`Opened ${tabsCount} tabs about: ${query}`);
}
async function executeNavigateCommand(command) {
    if (!command.url)
        return;
    const { normalizeInputToUrlOrSearch } = await import('../../lib/search');
    const { useSettingsStore } = await import('../../state/settingsStore');
    const settings = useSettingsStore.getState();
    const searchEngine = settings.searchEngine || 'google';
    let searchProvider = 'google';
    if (searchEngine === 'duckduckgo' || searchEngine === 'bing' || searchEngine === 'yahoo') {
        searchProvider = searchEngine;
    }
    const targetUrl = normalizeInputToUrlOrSearch(command.url, searchProvider);
    const { useTabsStore } = await import('../../state/tabsStore');
    const tabsState = useTabsStore.getState();
    const tabs = tabsState.tabs;
    const activeTab = tabs.find(t => t.id === tabsState.activeId);
    if (activeTab) {
        await ipc.tabs.navigate(activeTab.id, targetUrl);
    }
    else {
        await ipc.tabs.create(targetUrl);
    }
}
