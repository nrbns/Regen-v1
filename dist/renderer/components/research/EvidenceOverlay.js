/**
 * EvidenceOverlay - Highlights evidence on source pages when citations are clicked
 */
import { useEffect, useRef } from 'react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
export function EvidenceOverlay({ evidence, sources, activeEvidenceId, onEvidenceClick: _onEvidenceClick, }) {
    const { activeId } = useTabsStore();
    const highlightRefs = useRef(new Map());
    useEffect(() => {
        if (!activeId || !activeEvidenceId) {
            // Clear all highlights
            highlightRefs.current.forEach(cleanup => cleanup());
            highlightRefs.current.clear();
            return;
        }
        const activeEvidence = evidence.find(e => e.id === activeEvidenceId);
        if (!activeEvidence)
            return;
        const source = sources[activeEvidence.sourceIndex];
        if (!source)
            return;
        // Get current tab URL to verify we're on the right page
        const highlightEvidence = async () => {
            try {
                const tabs = await ipc.tabs.list();
                const activeTab = tabs.find(t => t.id === activeId);
                if (!activeTab || !activeTab.url)
                    return;
                const sourceUrl = new URL(source.url);
                const tabUrl = new URL(activeTab.url);
                // Only highlight if we're on the same domain
                if (sourceUrl.hostname !== tabUrl.hostname) {
                    return;
                }
                // Inject highlight script into the page
                const _highlightScript = `
          (function() {
            const quote = ${JSON.stringify(activeEvidence.quote)};
            const context = ${JSON.stringify(activeEvidence.context)};
            
            // Try to find the quote in the page
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            let node;
            const matches = [];
            while (node = walker.nextNode()) {
              const text = node.textContent;
              if (text && text.includes(quote)) {
                matches.push(node);
              }
            }
            
            if (matches.length > 0) {
              // Highlight the first match
              const match = matches[0];
              const range = document.createRange();
              const startIndex = match.textContent.indexOf(quote);
              if (startIndex !== -1) {
                range.setStart(match, startIndex);
                range.setEnd(match, startIndex + quote.length);
                
                const highlight = document.createElement('mark');
                highlight.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
                highlight.style.color = 'inherit';
                highlight.style.padding = '2px 4px';
                highlight.style.borderRadius = '3px';
                highlight.style.boxShadow = '0 0 8px rgba(59, 130, 246, 0.6)';
                highlight.className = 'regen-evidence-highlight';
                highlight.setAttribute('data-evidence-id', ${JSON.stringify(activeEvidenceId)});
                
                try {
                  range.surroundContents(highlight);
                  
                  // Scroll into view
                  highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  
                  // Store cleanup function
                  window.__omnib_evidence_cleanup = function() {
                    const parent = highlight.parentNode;
                    if (parent) {
                      parent.replaceChild(document.createTextNode(quote), highlight);
                      parent.normalize();
                    }
                  };
                } catch (e) {
                  console.warn('Failed to highlight evidence:', e);
                }
              }
            }
          })();
        `;
                // Execute script in the page context via devtools or navigate to fragment
                if (activeEvidence.fragmentUrl) {
                    // Navigate to fragment URL which should highlight the evidence
                    await ipc.tabs.navigate(activeId, activeEvidence.fragmentUrl);
                }
                else {
                    // Try to scroll to quote if we can't inject script
                    // This is a fallback - full script injection would require backend support
                    console.log('Evidence highlight requires fragment URL or backend script injection support');
                }
                // Store cleanup (for future script injection support)
                highlightRefs.current.set(activeEvidenceId, () => {
                    // Cleanup would be handled by page navigation or script removal
                    // Currently relies on fragment URLs for highlighting
                });
            }
            catch (error) {
                console.warn('Failed to highlight evidence:', error);
            }
        };
        highlightEvidence();
        return () => {
            // Cleanup on unmount or when evidence changes
            highlightRefs.current.forEach(cleanup => cleanup());
            highlightRefs.current.clear();
        };
    }, [activeId, activeEvidenceId, evidence, sources]);
    // This component doesn't render anything visible
    // It just manages evidence highlighting in the active tab
    return null;
}
