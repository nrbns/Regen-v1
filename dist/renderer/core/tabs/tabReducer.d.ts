/**
 * Tab State Reducer - Stable tab management with UUID keys
 * Prevents null tab states and race conditions
 */
import type { Tab, TabGroup, ClosedTab } from '../../state/tabsStore';
export type TabAction = {
    type: 'ADD_TAB';
    payload: Omit<Tab, 'id'> & {
        id?: string;
    };
} | {
    type: 'SET_ACTIVE';
    payload: {
        id: string | null;
    };
} | {
    type: 'SET_ALL';
    payload: {
        tabs: Tab[];
    };
} | {
    type: 'REMOVE_TAB';
    payload: {
        id: string;
    };
} | {
    type: 'UPDATE_TAB';
    payload: {
        id: string;
        updates: Partial<Tab>;
    };
} | {
    type: 'NAVIGATE_TAB';
    payload: {
        id: string;
        url: string;
    };
} | {
    type: 'GO_BACK';
    payload: {
        id: string;
    };
} | {
    type: 'GO_FORWARD';
    payload: {
        id: string;
    };
} | {
    type: 'PIN_TAB';
    payload: {
        id: string;
    };
} | {
    type: 'UNPIN_TAB';
    payload: {
        id: string;
    };
} | {
    type: 'REMEMBER_CLOSED';
    payload: {
        tab: Tab;
    };
} | {
    type: 'POP_RECENTLY_CLOSED';
} | {
    type: 'CLEAR_RECENTLY_CLOSED';
} | {
    type: 'CREATE_GROUP';
    payload: {
        group: TabGroup;
    };
} | {
    type: 'UPDATE_GROUP';
    payload: {
        id: string;
        updates: Partial<TabGroup>;
    };
} | {
    type: 'DELETE_GROUP';
    payload: {
        id: string;
    };
} | {
    type: 'ASSIGN_TAB_TO_GROUP';
    payload: {
        tabId: string;
        groupId: string | null;
    };
};
export interface TabState {
    tabs: Map<string, Tab>;
    activeId: string | null;
    recentlyClosed: ClosedTab[];
    tabGroups: Map<string, TabGroup>;
}
/**
 * Generate UUID for tab/group IDs
 */
export declare function generateTabId(): string;
/**
 * Tab reducer - pure function for state updates
 */
export declare function tabReducer(state: TabState, action: TabAction): TabState;
/**
 * Initial tab state
 */
export declare function createInitialTabState(): TabState;
