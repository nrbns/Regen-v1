export interface FilterList {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface BlockedRequest {
  url: string;
  type: string;
  timestamp: number;
  isBlocked?: boolean; // Add flag for block status
}

export interface AdblockerSettings {
  enabled: boolean;
  filterLists: FilterList[];
  blockedRequests: BlockedRequest[];
  whitelistedDomains?: string[];
  blockedDomains?: string[];
}
