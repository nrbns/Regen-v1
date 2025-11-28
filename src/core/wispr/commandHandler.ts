/**
 * WISPR Command Handler
 * Parses and routes voice commands to appropriate executors
 */

import { useAppStore } from '../../state/appStore';
import { ipc } from '../../lib/ipc-typed';
import { toast } from '../../utils/toast';
import { aiEngine } from '../ai/engine';

export type WisprCommandType =
  | 'trade'
  | 'search'
  | 'research'
  | 'summarize'
  | 'explain'
  | 'fill_form'
  | 'save_profile'
  | 'screenshot'
  | 'open_tabs'
  | 'navigate'
  | 'unknown';

export interface ParsedWisprCommand {
  type: WisprCommandType;
  query?: string;
  symbol?: string;
  quantity?: number;
  stopLoss?: number;
  takeProfit?: number;
  orderType?: 'buy' | 'sell' | 'market' | 'limit';
  tabs?: number;
  url?: string;
  language?: string;
  originalText: string;
}

/**
 * Parse voice command into structured command
 */
export function parseWisprCommand(text: string): ParsedWisprCommand {
  const lowerText = text.toLowerCase().trim();
  const originalText = text.trim();

  // Trade commands
  const tradePatterns = [
    // "Nifty kharido 50 quantity SL 24700"
    /(?:buy|kharido|खरीदो|becho|बेचो|sell)\s+(\w+)\s*(?:(\d+)\s*(?:quantity|qty|qty|मात्रा))?\s*(?:SL|stop\s*loss|स्टॉप\s*लॉस)\s*(\d+)?/i,
    // "100 HDFC Bank becho at market"
    /(\d+)\s+(\w+(?:\s+\w+)?)\s+(?:buy|kharido|खरीदो|becho|बेचो|sell)\s*(?:at\s*market|market\s*price)?/i,
    // "Buy 50 Nifty"
    /(?:buy|kharido|खरीदो)\s+(\d+)\s+(\w+)/i,
  ];

  for (const pattern of tradePatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const isSell =
        lowerText.includes('sell') || lowerText.includes('becho') || lowerText.includes('बेचो');
      return {
        type: 'trade',
        orderType: isSell ? 'sell' : 'buy',
        symbol: match[2] || match[1],
        quantity: parseInt(match[1] || match[2] || '1', 10),
        stopLoss: match[3] ? parseInt(match[3], 10) : undefined,
        originalText,
      };
    }
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
  if (
    lowerText.includes('search') ||
    lowerText.includes('dhundho') ||
    lowerText.includes('खोजो') ||
    lowerText.includes('show me') ||
    lowerText.includes('dikhao')
  ) {
    const searchMatch = lowerText.match(/(?:search|dhundho|खोजो|show\s+me|dikhao)\s+(.+)/i);
    return {
      type: 'search',
      query: searchMatch?.[1] || originalText,
      originalText,
    };
  }

  // Summarize commands
  if (
    lowerText.includes('summarize') ||
    lowerText.includes('summary') ||
    lowerText.includes('samjha de') ||
    lowerText.includes('समझा दे')
  ) {
    return {
      type: 'summarize',
      query: originalText,
      originalText,
    };
  }

  // Explain code commands
  if (
    lowerText.includes('explain') ||
    lowerText.includes('kya kar raha hai') ||
    lowerText.includes('क्या कर रहा है')
  ) {
    return {
      type: 'explain',
      query: originalText,
      originalText,
    };
  }

  // Fill form commands
  if (
    lowerText.includes('fill') ||
    lowerText.includes('daal do') ||
    lowerText.includes('डाल दो') ||
    lowerText.includes('form fill') ||
    lowerText.includes('auto fill')
  ) {
    return {
      type: 'fill_form',
      query: originalText,
      originalText,
    };
  }

  // Save profile commands
  if (
    lowerText.includes('save my profile') ||
    lowerText.includes('save profile') ||
    lowerText.includes('mera profile save kar') ||
    lowerText.includes('मेरा प्रोफाइल सेव कर')
  ) {
    return {
      type: 'save_profile',
      query: originalText,
      originalText,
    };
  }

  // Screenshot/analysis commands
  if (
    lowerText.includes('screenshot') ||
    lowerText.includes('isme kya hai') ||
    lowerText.includes('इसमें क्या है') ||
    lowerText.includes('analysis')
  ) {
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
export async function executeWisprCommand(command: ParsedWisprCommand): Promise<void> {
  try {
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

      default:
        // Fallback to AI search
        await executeSearchCommand(command);
    }
  } catch (error) {
    console.error('[WISPR] Command execution failed:', error);
    toast.error(`Failed to execute: ${command.originalText}`);
  }
}

async function executeTradeCommand(command: ParsedWisprCommand) {
  // Switch to Trade mode if not already
  if (useAppStore.getState().mode !== 'Trade') {
    useAppStore.getState().setMode('Trade');
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for mode switch
  }

  const { symbol, quantity, orderType, stopLoss } = command;
  if (!symbol || !quantity) {
    toast.error('Missing symbol or quantity for trade command');
    return;
  }

  // TODO: Integrate with actual Zerodha API
  // For now, show confirmation
  toast.success(
    `${orderType === 'buy' ? 'Buy' : 'Sell'} order: ${quantity} ${symbol}${stopLoss ? ` SL: ${stopLoss}` : ''}`
  );

  // Emit event for trade execution (to be handled by trade mode)
  window.dispatchEvent(
    new CustomEvent('wispr:trade', {
      detail: { symbol, quantity, orderType, stopLoss },
    })
  );
}

async function executeResearchCommand(command: ParsedWisprCommand) {
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
  window.dispatchEvent(
    new CustomEvent('wispr:research', {
      detail: { query: command.query },
    })
  );

  toast.info(`Researching: ${command.query}`);
}

async function executeSearchCommand(command: ParsedWisprCommand) {
  if (!command.query) return;

  // Use omni-search: search web + tabs + trading data
  const { normalizeInputToUrlOrSearch } = await import('../../lib/search');
  const { useSettingsStore } = await import('../../state/settingsStore');
  const settings = useSettingsStore.getState();
  const language = settings.language || 'auto';
  const searchEngine = settings.searchEngine || 'google';

  let searchProvider: 'google' | 'duckduckgo' | 'bing' | 'yahoo' = 'google';
  if (searchEngine === 'duckduckgo' || searchEngine === 'bing' || searchEngine === 'yahoo') {
    searchProvider = searchEngine;
  }

  const targetUrl = normalizeInputToUrlOrSearch(
    command.query,
    searchProvider,
    language !== 'auto' ? language : undefined
  );
  await ipc.tabs.create(targetUrl);
  toast.success(`Searching: ${command.query}`);
}

async function executeSummarizeCommand(_command: ParsedWisprCommand) {
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

async function executeExplainCommand(_command: ParsedWisprCommand) {
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

async function executeFillFormCommand(_command: ParsedWisprCommand) {
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
    toast.success(
      `Filled ${filledCount} form field${filledCount === 1 ? '' : 's'} with saved profile`
    );
  } else {
    toast.info('No matching fields found. Profile data may not match form fields.');
  }
}

async function executeSaveProfileCommand(_command: ParsedWisprCommand) {
  const { saveUserProfile } = await import('./formFiller');

  // Try to extract profile data from current page forms
  const forms = document.querySelectorAll('form');
  if (forms.length === 0) {
    toast.info('No forms found. Please fill a form first, then say "Save my profile" again.');
    return;
  }

  // Extract data from the first form
  const form = forms[0] as HTMLFormElement;
  const formData = new FormData(form);
  const profile: Record<string, string> = {};

  // Extract common fields
  // @ts-ignore - FormData.entries() exists but TypeScript types may be outdated
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && value.trim()) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('name') && !profile.name) {
        profile.name = value;
      } else if (lowerKey.includes('email') && !profile.email) {
        profile.email = value;
      } else if ((lowerKey.includes('phone') || lowerKey.includes('mobile')) && !profile.phone) {
        profile.phone = value;
      } else if (lowerKey.includes('address') && !profile.address) {
        profile.address = value;
      } else if (lowerKey.includes('city') && !profile.city) {
        profile.city = value;
      } else if (
        lowerKey.includes('pincode') ||
        lowerKey.includes('zip') ||
        lowerKey.includes('postal')
      ) {
        profile.pincode = value;
      } else if (lowerKey.includes('aadhaar') || lowerKey.includes('aadhar')) {
        profile.aadhaar = value;
      } else if (lowerKey.includes('pan')) {
        profile.pan = value;
      }
    }
  }

  if (Object.keys(profile).length > 0) {
    saveUserProfile(profile);
    toast.success(
      `Profile saved with ${Object.keys(profile).length} field${Object.keys(profile).length === 1 ? '' : 's'}`
    );
  } else {
    toast.info('No profile data found in forms. Please fill a form first.');
  }
}

async function executeScreenshotCommand(_command: ParsedWisprCommand) {
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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  } else {
    toast.error('Failed to analyze screenshot');
  }
}

async function executeOpenTabsCommand(command: ParsedWisprCommand) {
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

  let searchProvider: 'google' | 'duckduckgo' | 'bing' | 'yahoo' = 'google';
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

async function executeNavigateCommand(command: ParsedWisprCommand) {
  if (!command.url) return;

  const { normalizeInputToUrlOrSearch } = await import('../../lib/search');
  const { useSettingsStore } = await import('../../state/settingsStore');
  const settings = useSettingsStore.getState();
  const searchEngine = settings.searchEngine || 'google';

  let searchProvider: 'google' | 'duckduckgo' | 'bing' | 'yahoo' = 'google';
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
  } else {
    await ipc.tabs.create(targetUrl);
  }
}
