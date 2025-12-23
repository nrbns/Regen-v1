export interface ContextEnvelope {
  activeTabs: Array<{
    id: string;
    url: string;
    title?: string;
  }>;
  mode: 'browse' | 'trade' | 'research' | 'automation';
  userIntent?: string;
  memoryRefs?: Array<{ id: string; type: string }>;
}
