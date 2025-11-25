/* eslint-env browser */
/* global document, CustomEvent */

const OVERLAY_ID = '__regen_omnibar';

let overlayEl;
let inputEl;
let resultsEl;
let modeBadgeEl;

export function ensureOmnibar() {
  if (overlayEl) return;

  overlayEl = document.createElement('div');
  overlayEl.id = OVERLAY_ID;
  overlayEl.style.position = 'fixed';
  overlayEl.style.top = '5%';
  overlayEl.style.left = '50%';
  overlayEl.style.transform = 'translateX(-50%)';
  overlayEl.style.width = '600px';
  overlayEl.style.maxWidth = '90vw';
  overlayEl.style.background = 'rgba(8, 12, 17, 0.95)';
  overlayEl.style.color = '#f1f5f9';
  overlayEl.style.borderRadius = '14px';
  overlayEl.style.boxShadow = '0 20px 45px rgba(15, 23, 42, 0.4)';
  overlayEl.style.padding = '20px';
  overlayEl.style.zIndex = 2147483646;
  overlayEl.style.display = 'none';
  overlayEl.style.fontFamily = "'Inter', system-ui, sans-serif";

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.marginBottom = '12px';

  const titleEl = document.createElement('span');
  titleEl.textContent = 'OmniRecall';
  titleEl.style.fontSize = '16px';
  titleEl.style.fontWeight = '600';

  modeBadgeEl = document.createElement('span');
  modeBadgeEl.textContent = 'mode: research';
  modeBadgeEl.style.fontSize = '12px';
  modeBadgeEl.style.background = 'rgba(59, 130, 246, 0.2)';
  modeBadgeEl.style.color = '#93c5fd';
  modeBadgeEl.style.padding = '4px 8px';
  modeBadgeEl.style.borderRadius = '999px';

  header.appendChild(titleEl);
  header.appendChild(modeBadgeEl);

  inputEl = document.createElement('input');
  inputEl.type = 'search';
  inputEl.placeholder = 'Search your memories...';
  inputEl.style.width = '100%';
  inputEl.style.padding = '12px';
  inputEl.style.borderRadius = '10px';
  inputEl.style.border = '1px solid rgba(148, 163, 184, 0.2)';
  inputEl.style.background = 'rgba(30, 41, 59, 0.7)';
  inputEl.style.color = 'inherit';
  inputEl.style.fontSize = '15px';

  inputEl.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      const query = inputEl.value.trim();
      overlayEl.dispatchEvent(
        new CustomEvent('omnibar:search', {
          bubbles: true,
          detail: { query },
        })
      );
    }
    if (event.key === 'Escape') {
      toggleOmnibar(false);
    }
  });

  overlayEl.addEventListener('omnibar:search', event => {
    document.dispatchEvent(
      new CustomEvent('omnibar:search', {
        detail: event.detail,
      })
    );
  });

  resultsEl = document.createElement('div');
  resultsEl.style.marginTop = '16px';
  resultsEl.style.maxHeight = '50vh';
  resultsEl.style.overflowY = 'auto';
  resultsEl.style.display = 'grid';
  resultsEl.style.gap = '12px';

  overlayEl.appendChild(header);
  overlayEl.appendChild(inputEl);
  overlayEl.appendChild(resultsEl);
  document.body.appendChild(overlayEl);
}

export function toggleOmnibar(force) {
  if (!overlayEl) ensureOmnibar();
  const shouldShow = typeof force === 'boolean' ? force : overlayEl.style.display === 'none';
  overlayEl.style.display = shouldShow ? 'block' : 'none';
  if (shouldShow) {
    inputEl.focus();
    inputEl.select();
  }
}

export function updateResults(results, errorMessage) {
  if (!overlayEl) return;
  resultsEl.innerHTML = '';

  if (errorMessage) {
    const errorEl = document.createElement('div');
    errorEl.textContent = errorMessage;
    errorEl.style.color = '#f87171';
    resultsEl.appendChild(errorEl);
    return;
  }

  if (!results?.length) {
    const empty = document.createElement('div');
    empty.textContent = 'No results yet. Try a broader query.';
    empty.style.color = '#94a3b8';
    resultsEl.appendChild(empty);
    return;
  }

  for (const result of results) {
    resultsEl.appendChild(renderResultCard(result));
  }
}

export function updateModeLabel(mode) {
  if (!modeBadgeEl) return;
  modeBadgeEl.textContent = `mode: ${mode}`;
  modeBadgeEl.style.background = modeBadgeTint(mode);
}

function renderResultCard(item) {
  const card = document.createElement('div');
  card.style.background = 'rgba(15, 23, 42, 0.7)';
  card.style.border = '1px solid rgba(148, 163, 184, 0.24)';
  card.style.borderRadius = '10px';
  card.style.padding = '14px';

  const title = document.createElement('div');
  title.textContent = item.title || 'Untitled memory';
  title.style.fontWeight = '600';
  title.style.fontSize = '14px';
  title.style.marginBottom = '8px';

  const snippet = document.createElement('div');
  snippet.textContent = item.text_snippet || '';
  snippet.style.fontSize = '13px';
  snippet.style.lineHeight = '1.5';
  snippet.style.color = '#cbd5f5';

  const meta = document.createElement('div');
  meta.style.marginTop = '10px';
  meta.style.display = 'flex';
  meta.style.flexWrap = 'wrap';
  meta.style.gap = '8px';

  (item.tags || []).forEach(tag => {
    const pill = document.createElement('span');
    pill.textContent = tag;
    pill.style.fontSize = '11px';
    pill.style.padding = '2px 6px';
    pill.style.borderRadius = '999px';
    pill.style.background = 'rgba(59, 130, 246, 0.16)';
    pill.style.color = '#60a5fa';
    meta.appendChild(pill);
  });

  card.appendChild(title);
  card.appendChild(snippet);
  if (meta.childElementCount) {
    card.appendChild(meta);
  }

  return card;
}

function modeBadgeTint(mode) {
  switch (mode) {
    case 'trade':
      return 'rgba(34, 197, 94, 0.25)';
    case 'threat':
      return 'rgba(248, 113, 113, 0.25)';
    case 'notes':
      return 'rgba(244, 114, 182, 0.25)';
    default:
      return 'rgba(59, 130, 246, 0.25)';
  }
}
