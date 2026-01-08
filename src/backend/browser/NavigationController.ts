import { systemState } from '../state/SystemState';

export class NavigationController {
  static navigate(tabId: string, url: string) {
    // IMMEDIATE: Update SystemState first - UI shows navigation immediately
    systemState.navigate(tabId, url);

    // ASYNC: Try to navigate actual WebView in backend
    try {
      console.log(`[NavigationController] Navigating tab ${tabId} to ${url}`);
      // In real implementation: IPCHandler.send('navigation-started', { tabId, url });
    } catch (error) {
      console.error('[NavigationController] Failed to navigate backend:', error);
      // UI still shows navigation even if backend fails
    }
  }

  static back(tabId: string) {
    // IMMEDIATE: UI shows back navigation immediately
    console.log(`[NavigationController] Going back in tab ${tabId}`);
    // In real implementation: IPCHandler.send('navigation-back', { tabId });
  }

  static forward(tabId: string) {
    // IMMEDIATE: UI shows forward navigation immediately
    console.log(`[NavigationController] Going forward in tab ${tabId}`);
    // In real implementation: IPCHandler.send('navigation-forward', { tabId });
  }

  static reload(tabId: string) {
    // IMMEDIATE: Update SystemState to show loading
    systemState.updateTab(tabId, { isLoading: true });

    // ASYNC: Try to reload actual WebView
    try {
      console.log(`[NavigationController] Reloading tab ${tabId}`);
      // In real implementation: IPCHandler.send('navigation-reload', { tabId });

      // Simulate loading completion (in real app, WebView would emit load event)
      setTimeout(() => {
        systemState.updateTab(tabId, { isLoading: false });
      }, 1000);
    } catch (error) {
      console.error('[NavigationController] Failed to reload backend:', error);
      // Still stop loading indicator even if backend fails
      systemState.updateTab(tabId, { isLoading: false });
    }
  }
}
