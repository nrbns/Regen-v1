/**
 * Browser Automation Bridge
 * Connects browser automation API with iframe tabs
 */

import { useEffect, useRef } from 'react';
import { useBrowserAutomation } from '../../hooks/useBrowserAutomation';
import { useTabsStore } from '../../state/tabsStore';

interface BrowserAutomationBridgeProps {
  tabId?: string;
  iframeId?: string;
  sessionId?: string;
}

export function BrowserAutomationBridge({ 
  tabId, 
  iframeId, 
  sessionId 
}: BrowserAutomationBridgeProps) {
  const activeTabId = useTabsStore(state => state.activeId);
  const tabs = useTabsStore(state => state.tabs);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // Get current tab
  const _currentTab = tabs.find(t => t.id === (tabId || activeTabId));
  const currentTabId = tabId || activeTabId;
  
  // Connect to browser automation WebSocket
  const { isConnected, execute } = useBrowserAutomation({
    sessionId: sessionId || `tab-${currentTabId}`,
    tabId: currentTabId || undefined,
    iframeId: iframeId || currentTabId || undefined,
    onEvent: (event) => {
      // Handle browser automation events
      handleBrowserEvent(event);
    },
  });

  // Handle browser automation events
  const handleBrowserEvent = (event: any) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      return;
    }

    const { type, payload } = event;
    
    try {
      // Send message to iframe content
      iframeRef.current.contentWindow.postMessage({
        type: 'browser:automation',
        action: type,
        payload,
      }, '*');
    } catch (error) {
      console.error('[BrowserAutomationBridge] Error sending message to iframe:', error);
    }
  };

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from our iframe
      if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        const { type, action, params } = event.data;
        
        if (type === 'browser:action') {
          // Execute browser action
          execute(action, params).catch(error => {
            console.error('[BrowserAutomationBridge] Error executing action:', error);
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [execute]);

  // Get iframe element
  useEffect(() => {
    if (currentTabId) {
      // Find iframe for this tab
      const iframe = document.querySelector(`iframe[data-tab-id="${currentTabId}"]`) as HTMLIFrameElement;
      if (iframe) {
        iframeRef.current = iframe;
      }
    }
  }, [currentTabId]);

  // Inject automation script into iframe
  useEffect(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      return;
    }

    try {
      // Inject automation helper script
      const script = `
        (function() {
          if (window.browserAutomation) return;
          
          window.browserAutomation = {
            execute: function(action, params) {
              window.parent.postMessage({
                type: 'browser:action',
                action: action,
                params: params
              }, '*');
            },
            
            navigate: function(url) {
              window.location.href = url;
            },
            
            click: function(selector) {
              const element = document.querySelector(selector);
              if (element) {
                element.click();
              }
            },
            
            type: function(selector, text) {
              const element = document.querySelector(selector);
              if (element) {
                element.value = text;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
              }
            },
            
            scroll: function(selector, direction) {
              const element = selector ? document.querySelector(selector) : window;
              if (element) {
                const scrollAmount = 100;
                if (direction === 'down' || !direction) {
                  element.scrollBy(0, scrollAmount);
                } else if (direction === 'up') {
                  element.scrollBy(0, -scrollAmount);
                } else if (direction === 'left') {
                  element.scrollBy(-scrollAmount, 0);
                } else if (direction === 'right') {
                  element.scrollBy(scrollAmount, 0);
                }
              }
            },
            
            extract: function(selector, attribute) {
              const element = document.querySelector(selector);
              if (!element) return null;
              
              if (attribute) {
                return element.getAttribute(attribute);
              }
              return element.textContent || element.innerText;
            }
          };
          
          // Listen for automation commands
          window.addEventListener('message', function(event) {
            if (event.data.type === 'browser:automation') {
              const { action, payload } = event.data;
              
              switch (action) {
                case 'navigate':
                  if (payload.url) {
                    window.browserAutomation.navigate(payload.url);
                  }
                  break;
                case 'click':
                  if (payload.selector) {
                    window.browserAutomation.click(payload.selector);
                  }
                  break;
                case 'type':
                  if (payload.selector && payload.text) {
                    window.browserAutomation.type(payload.selector, payload.text);
                  }
                  break;
                case 'scroll':
                  window.browserAutomation.scroll(payload.selector, payload.direction);
                  break;
                case 'extract':
                  if (payload.selector) {
                    const result = window.browserAutomation.extract(payload.selector, payload.attribute);
                    window.parent.postMessage({
                      type: 'browser:extract:result',
                      selector: payload.selector,
                      result: result
                    }, '*');
                  }
                  break;
              }
            }
          });
        })();
      `;

      // Try to inject script (may fail due to CORS)
      try {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          const scriptEl = iframeDoc.createElement('script');
          scriptEl.textContent = script;
          iframeDoc.head.appendChild(scriptEl);
        }
      } catch {
        // CORS restriction - script injection not possible
        // Automation will work via postMessage only
        console.warn('[BrowserAutomationBridge] Cannot inject script due to CORS, using postMessage only');
      }
    } catch (setupError) {
      console.error('[BrowserAutomationBridge] Error setting up automation:', setupError);
    }
  }, [currentTabId, isConnected]);

  return null; // This component doesn't render anything
}

