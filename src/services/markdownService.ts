// Semantic search for markdown knowledge
export async function semanticSearchMarkdown(query: string) {
  const res = await fetch(`/api/markdown/semantic-search?query=${encodeURIComponent(query)}`);
  return res.json();
}
// Markdown service for Regenbrowser Knowledge Engine
// Handles API calls to backend for markdown CRUD operations

export async function listMarkdownFiles() {
  const res = await fetch('/api/markdown/list');
  return res.json();
}

export async function loadMarkdownFile(file: string) {
  const res = await fetch(`/api/markdown/load?file=${encodeURIComponent(file)}`);
  return res.text();
}

export async function saveMarkdownFile(file: string, content: string) {
  const res = await fetch('/api/markdown/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file, content }),
  });
  return res.json();
}
