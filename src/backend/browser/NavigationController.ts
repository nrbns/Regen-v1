import { systemState } from '../state/SystemState';

export class NavigationController {
  static navigate(tabId: string, url: string) {
    // In a real implementation, this would call the WebView's navigate method
    // For now, just update state
    systemState.navigate(tabId, url);
  }

  static back(tabId: string) {
    // In a real implementation, this would call WebView.goBack()
    // For simulation, just stay on current page
    console.log('Navigation: back', tabId);
  }

  static forward(tabId: string) {
    // In a real implementation, this would call WebView.goForward()
    // For simulation, just stay on current page
    console.log('Navigation: forward', tabId);
  }

  static reload(tabId: string) {
    // In a real implementation, this would call WebView.reload()
    // For simulation, just set loading state briefly
    systemState.updateTab(tabId, { isLoading: true });
    setTimeout(() => {
      systemState.updateTab(tabId, { isLoading: false });
    }, 500);
  }
}
