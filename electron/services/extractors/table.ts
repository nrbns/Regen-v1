export function extractFirstTable(html: string) {
  // naive regex-based; replace with DOM parse later
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return { headers: [], rows: [] };
  const headerMatches = [...tableMatch[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>strip(m[1]));
  const rowMatches = [...tableMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1).map(m=>m[1]);
  const rows = rowMatches.map(r => [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>strip(m[1])));
  return { headers: headerMatches, rows };
}

function strip(s: string) {
  return s.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
}


