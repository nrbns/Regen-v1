import { type ClosedTab } from '../state/tabsStore';
export declare function reopenClosedTab(entry?: ClosedTab): Promise<boolean>;
export declare function reopenMostRecentClosedTab(): Promise<boolean>;
