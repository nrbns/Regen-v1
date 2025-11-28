/**
 * RegenBrowser Extension - Content Script
 * Injects WISPR orb and handles voice commands
 */

// Inject WISPR orb
function injectWisprOrb() {
  if (document.getElementById('regen-wispr-orb')) return;

  const orb = document.createElement('div');
  orb.id = 'regen-wispr-orb';
  orb.innerHTML = `
    <div class="wispr-orb" id="wispr-orb-button">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
  `;
  document.body.appendChild(orb);

  // Add click handler
  orb.querySelector('#wispr-orb-button').addEventListener('click', () => {
    activateWispr();
  });

  // Global hotkey: Ctrl+Space
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      activateWispr();
    }
  });
}

// Activate WISPR voice recognition
function activateWispr() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition not available. Please use Chrome or Edge.');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN,en-US';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = event => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    if (event.results[event.results.length - 1].isFinal) {
      executeCommand(transcript);
    }
  };

  recognition.onerror = event => {
    console.error('[WISPR] Recognition error:', event.error);
  };

  recognition.start();
  showWisprPanel('Listening...');
}

// Execute WISPR command
async function executeCommand(text) {
  showWisprPanel(`Executing: ${text}...`);

  chrome.runtime.sendMessage({ action: 'executeCommand', command: text }, response => {
    if (response?.success) {
      showWisprPanel(`✓ ${response.message}`);
    } else {
      showWisprPanel(`✗ Failed: ${response?.error || 'Unknown error'}`);
    }
    setTimeout(() => hideWisprPanel(), 3000);
  });
}

// Show WISPR panel
function showWisprPanel(message) {
  let panel = document.getElementById('wispr-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'wispr-panel';
    document.body.appendChild(panel);
  }
  panel.textContent = message;
  panel.style.display = 'block';
}

// Hide WISPR panel
function hideWisprPanel() {
  const panel = document.getElementById('wispr-panel');
  if (panel) {
    panel.style.display = 'none';
  }
}

// Inject on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectWisprOrb);
} else {
  injectWisprOrb();
}
