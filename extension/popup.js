// Check Ollama status on popup open
chrome.runtime.sendMessage({ action: 'checkOllama' }, isRunning => {
  const statusEl = document.getElementById('status');
  if (isRunning) {
    statusEl.textContent = '✓ Ollama Connected';
    statusEl.className = 'status connected';
  } else {
    statusEl.textContent = '✗ Ollama Not Running';
    statusEl.className = 'status disconnected';
    statusEl.innerHTML += '<br><small>Install from ollama.com</small>';
  }
});

// Activate WISPR button
document.getElementById('activate-wispr').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'activateWispr' });
    window.close();
  });
});

// Open options
document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
