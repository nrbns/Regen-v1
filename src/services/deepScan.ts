const API_BASE =
  (typeof window !== 'undefined' ? window.__OB_API_BASE__ : '') ||
  import.meta.env.VITE_APP_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '';

export type DeepScanStep = {
  label: string;
  status: 'running' | 'complete' | 'error';
  detail?: string;
  started_at: string;
  completed_at?: string;
};

export type DeepScanSource = {
  id?: string;
  title?: string;
  url?: string;
  domain?: string;
  snippet?: string;
  text?: string;
  sourceType?: string;
  relevanceScore?: number;
  metadata?: Record<string, unknown>;
  image?: string;
  wordCount?: number;
  lang?: string;
  contentHash?: string;
  fromCache?: boolean;
  rendered?: boolean;
  fetchedAt?: string;
};

export type DeepScanResponse = {
  query: string;
  sources: DeepScanSource[];
  search_results: Array<Record<string, unknown>>;
  steps: DeepScanStep[];
  created_at: string;
};

type DeepScanOptions = {
  urls?: string[];
  maxPages?: number;
  allowRender?: boolean;
};

export async function runDeepScan(
  query: string,
  options: DeepScanOptions = {}
): Promise<DeepScanResponse> {
  if (!API_BASE) {
    throw new Error('API base URL not configured');
  }

  const response = await fetch(`${API_BASE.replace(/\/$/, '')}/api/research/deep-scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      urls: options.urls,
      max_pages: options.maxPages ?? 5,
      allow_render: options.allowRender ?? true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(errorText || 'Failed to run deep scan');
  }

  return (await response.json()) as DeepScanResponse;
}
