export interface NexusPluginEntry {
  pluginId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  sourcePeer: string;
  signature: string;
  publishedAt: number;
  downloads: number;
  trusted: boolean;
  carbonScore?: number;
  tags?: string[];
}

export interface NexusListResponse {
  plugins: NexusPluginEntry[];
  peers: string[];
}
