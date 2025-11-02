export type TabId = string;

export interface ProxyProfile {
  id: string;
  name: string;
  type: 'socks5' | 'http';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface ScrapeActionClick { type: 'click'; selector: string }
export interface ScrapeActionType { type: 'type'; selector: string; text: string }
export interface ScrapeActionWait { type: 'wait'; ms: number }
export type ScrapeAction = ScrapeActionClick | ScrapeActionType | ScrapeActionWait;

export interface ScrapeTask {
  id: string;
  url: string;
  actions?: ScrapeAction[];
}


