export type SemanticRegion = 'nav' | 'main' | 'footer' | 'form' | 'table' | 'list' | 'aside';

export function mapDomToRegions(html: string) {
  // naive heuristics; real impl would parse DOM
  const regions: { region: SemanticRegion; score: number }[] = [];
  if (/<nav[\s>]/i.test(html)) regions.push({ region: 'nav', score: 0.9 });
  if (/<main[\s>]/i.test(html)) regions.push({ region: 'main', score: 0.9 });
  if (/<footer[\s>]/i.test(html)) regions.push({ region: 'footer', score: 0.9 });
  if (/<form[\s>]/i.test(html)) regions.push({ region: 'form', score: 0.6 });
  if (/<table[\s>]/i.test(html)) regions.push({ region: 'table', score: 0.6 });
  if (/<ul[\s>]|<ol[\s>]/i.test(html)) regions.push({ region: 'list', score: 0.5 });
  if (/<aside[\s>]/i.test(html)) regions.push({ region: 'aside', score: 0.4 });
  return regions;
}


