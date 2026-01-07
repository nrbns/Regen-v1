// Lightweight local search using Lunr
// npm i lunr
// @ts-ignore - lunr types may not be available
import lunr from 'lunr';

type IndexDoc = { id: string; title: string; body: string };

let idx: any = null;
let docs: Record<string, IndexDoc> = {};

export async function loadIndex() {
  if (idx) return idx;
  
  try {
    const res = await fetch('/lunr-index.json');
    if (!res.ok) throw new Error('No index available');
    const { index, documents } = await res.json();
    
    // Reconstruct lunr index
    idx = lunr.Index.load(index);
    docs = documents;
    return idx;
  } catch {
    // Fallback: build minimal in-memory index (empty)
    idx = lunr(function (this: any) {
      this.ref('id');
      this.field('title', { boost: 10 });
      this.field('body');
    });
    docs = {};
    return idx;
  }
}

export async function searchLocal(query: string): Promise<Array<{ id: string; title: string; snippet: string }>> {
  await loadIndex();
  if (!idx) return [];
  
  const hits = idx.search(query);
  return hits.slice(0, 10).map((h: any) => {
    const d = docs[h.ref];
    if (!d) return { id: h.ref, title: 'Unknown', snippet: '' };
    return { 
      id: d.id, 
      title: d.title, 
      snippet: d.body.slice(0, 180) + (d.body.length > 180 ? '...' : '')
    };
  });
}

