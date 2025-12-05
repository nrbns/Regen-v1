const API_BASE = (typeof window !== 'undefined' ? window.__OB_API_BASE__ : '') ||
    import.meta.env.VITE_APP_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    '';
export async function runDeepScan(query, options = {}) {
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
    return (await response.json());
}
