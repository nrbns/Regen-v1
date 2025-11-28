/**
 * RegenBrowser Extension - Background Service Worker
 * Bridges Chrome extension with local Ollama instance
 */

const OLLAMA_BASE_URL = 'http://localhost:11434';

// Check if Ollama is running
async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

// Send message to Ollama
async function callOllama(endpoint, data) {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('[RegenBrowser] Ollama call failed:', error);
    return { error: error.message };
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkOllama') {
    checkOllama().then(sendResponse);
    return true; // Async response
  }

  if (request.action === 'callOllama') {
    callOllama(request.endpoint, request.data).then(sendResponse);
    return true;
  }

  if (request.action === 'executeCommand') {
    // Handle WISPR commands
    handleWisprCommand(request.command).then(sendResponse);
    return true;
  }
});

// Handle WISPR voice commands
async function handleWisprCommand(command) {
  const { type, query } = parseCommand(command);

  switch (type) {
    case 'search': {
      // Open new tab with search
      chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(query)}` });
      return { success: true, message: `Searching: ${query}` };
    }

    case 'research': {
      // Open multiple tabs for research
      const tabs = [];
      for (let i = 0; i < 5; i++) {
        const tab = await chrome.tabs.create({
          url: `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${i * 10}`,
        });
        tabs.push(tab.id);
      }
      return { success: true, message: `Opened 5 tabs for: ${query}` };
    }

    case 'summarize': {
      // Get current page content and summarize
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageText,
      });
      const summary = await summarizeText(result[0].result);
      return { success: true, summary };
    }

    default:
      return { success: false, error: 'Unknown command' };
  }
}

// Parse voice command
function parseCommand(text) {
  const lower = text.toLowerCase();
  if (lower.includes('search') || lower.includes('dhundho')) {
    return { type: 'search', query: text.replace(/search|dhundho/gi, '').trim() };
  }
  if (lower.includes('research')) {
    return { type: 'research', query: text.replace(/research/gi, '').trim() };
  }
  if (lower.includes('summarize') || lower.includes('samjha de')) {
    return { type: 'summarize', query: text };
  }
  return { type: 'search', query: text };
}

// Extract text from page
function extractPageText() {
  return document.body.innerText.substring(0, 5000);
}

// Summarize text using Ollama
async function summarizeText(text) {
  const result = await callOllama('/api/generate', {
    model: 'phi3:mini',
    prompt: `Summarize this in 3 bullet points:\n\n${text}`,
    stream: false,
  });
  return result.response || 'Summary unavailable';
}

// Install listener - check Ollama on install
chrome.runtime.onInstalled.addListener(async () => {
  const isOllamaRunning = await checkOllama();
  if (!isOllamaRunning) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'RegenBrowser AI',
      message: 'Ollama not detected. Install from ollama.com for offline AI features.',
    });
  }
});
