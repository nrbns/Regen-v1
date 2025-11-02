import { registry } from './registry';
import { paginateCollect } from '../../pagination';
import { extractFirstTable } from '../../extractors/table';

registry.register('paginate_and_extract', async (_ctx, args: { url: string; nextSelector: string; maxPages?: number }) => {
  const pages = await paginateCollect(args.url, args.nextSelector, args.maxPages ?? 5);
  const allRows: string[][] = [];
  let headers: string[] = [];
  for (const html of pages) {
    const t = extractFirstTable(html);
    if (t.headers.length && headers.length === 0) headers = t.headers;
    for (const r of t.rows) allRows.push(r);
  }
  return { headers, rows: allRows, count: allRows.length };
});


