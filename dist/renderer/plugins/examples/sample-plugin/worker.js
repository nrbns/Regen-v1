/**
 * Sample Plugin Worker
 * Example implementation of an Regen plugin
 */
class SamplePlugin {
    host = null;
    async init(host) {
        this.host = host;
        console.log('[SamplePlugin] Initialized');
        // Example: Subscribe to events
        if (host.events) {
            host.events.on('tab:activated', (...args) => {
                const tabId = args[0];
                console.log('[SamplePlugin] Tab activated:', tabId);
            });
        }
        // Example: Store some data
        if (host.storage) {
            await host.storage.set('initialized', new Date().toISOString());
        }
    }
    async dispose() {
        console.log('[SamplePlugin] Disposed');
    }
}
// Export for plugin loader
export default SamplePlugin;
