import { create } from 'zustand';
// Simple store for voice control (used by VoiceControl component)
export const useVoiceControlStore = create(set => ({
    status: 'idle',
    transcript: '',
    stream: '',
    actions: [],
    actionResults: [],
    actionProgress: {},
    error: undefined,
    setStatus: status => set({ status }),
    setTranscript: text => set({ transcript: text }),
    appendStream: chunk => set(state => ({ stream: state.stream + chunk })),
    setActions: actions => set({ actions }),
    setActionResults: results => set({ actionResults: results }),
    setActionProgress: (action, progress) => set(state => ({
        actionProgress: {
            ...state.actionProgress,
            [action]: progress,
        },
    })),
    clearActionProgress: action => set(state => {
        const { [action]: _, ...rest } = state.actionProgress;
        return { actionProgress: rest };
    }),
    cancelledActions: new Set(),
    cancelAction: action => set(state => {
        const newCancelled = new Set(state.cancelledActions);
        newCancelled.add(action);
        return { cancelledActions: newCancelled };
    }),
    isActionCancelled: (action) => {
        return useVoiceControlStore.getState().cancelledActions.has(action);
    },
    setError: message => set({ error: message }),
    reset: () => set({
        status: 'idle',
        transcript: '',
        stream: '',
        actions: [],
        actionResults: [],
        actionProgress: {},
        cancelledActions: new Set(),
        error: undefined,
    }),
}));
import { persist } from 'zustand/middleware';
export const useAgentStreamStore = create()(persist(set => ({
    runId: null,
    status: 'idle',
    transcript: '',
    events: [],
    error: undefined,
    lastGoal: null,
    activeTabId: null,
    setRun: (runId, goal, tabId = null) => {
        console.log('[AGENT_STREAM] setRun', { runId, goal, tabId });
        set({
            runId,
            status: 'live',
            error: undefined,
            transcript: '',
            events: [],
            lastGoal: goal,
            activeTabId: tabId,
        });
    },
    setStatus: (status) => set({ status }),
    setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
    appendEvent: (event) => {
        // PR: Fix tab switch - only append events for current active tab
        const state = useAgentStreamStore.getState();
        if (event.tabId && state.activeTabId && event.tabId !== state.activeTabId) {
            console.log('[AGENT_STREAM] Ignoring event for inactive tab', {
                eventTabId: event.tabId,
                activeTabId: state.activeTabId,
                eventType: event.type,
            });
            return;
        }
        console.log('[AGENT_STREAM] appendEvent', {
            eventId: event.id,
            type: event.type,
            tabId: event.tabId,
            activeTabId: state.activeTabId,
        });
        set(state => ({
            events: [...state.events, event],
        }));
    },
    appendTranscript: (delta) => {
        const state = useAgentStreamStore.getState();
        console.log('[AGENT_STREAM] appendTranscript', {
            deltaLength: delta.length,
            activeTabId: state.activeTabId,
        });
        set(state => ({
            transcript: state.transcript ? `${state.transcript}${delta}` : delta,
        }));
    },
    setActiveTabId: (tabId) => {
        console.log('[AGENT_STREAM] setActiveTabId', { tabId });
        set({ activeTabId: tabId });
    },
    reset: () => {
        console.log('[AGENT_STREAM] reset');
        set({
            runId: null,
            status: 'idle',
            transcript: '',
            events: [],
            error: undefined,
            lastGoal: null,
            activeTabId: null,
        });
    },
}), {
    name: 'regen-agent-stream-storage',
    // Only persist critical state, not transient streaming data
    partialize: state => ({
        runId: state.runId,
        status: state.status,
        transcript: state.transcript,
        events: state.events.slice(-50), // Keep last 50 events
        lastGoal: state.lastGoal,
        activeTabId: state.activeTabId, // PR: Fix tab switch - persist active tab
        // Don't persist error state (should be cleared on restart)
    }),
}));
