export function heuristicScan(url: string) {
  const issues: string[] = [];
  try {
    const u = new URL(url);
    if (u.protocol === 'http:') issues.push('Insecure scheme');
    if ((u.hostname.match(/\./g) || []).length > 3) issues.push('Deep subdomain nesting');
    if (/data:/.test(url)) issues.push('Data URL present');
  } catch { issues.push('Malformed URL'); }
  const score = issues.length;
  return { url, score, issues };
}


