declare module '../../../redix-core/runtime/pkg/redix_runtime' {
  export default function init(): Promise<void>;

  export class RedixRuntime {
    constructor(maxHotEntries: number, coldBudgetBytes: number);
    snapshotTab(
      tabId: string,
      payload: { state: unknown; meta?: Record<string, unknown> }
    ): Record<string, unknown>;
    restoreTab(tabId: string): Record<string, unknown> | null;
    saveContext(key: string, value: unknown): void;
    fetchContext(key: string): Record<string, unknown> | null;
    stats(): Record<string, unknown>;
    clear(): void;
  }
}
