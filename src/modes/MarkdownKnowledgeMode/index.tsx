import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  listMarkdownFiles,
  loadMarkdownFile,
  saveMarkdownFile,
  semanticSearchMarkdown,
} from '../../services/markdownService';

export default function MarkdownKnowledgeMode() {
  const [files, setFiles] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [content, setContent] = React.useState('');
  const [edit, setEdit] = React.useState(false);
  const [newContent, setNewContent] = React.useState('');
  // Semantic search state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  // Semantic search handler
  async function handleSemanticSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const result = await semanticSearchMarkdown(searchQuery);
      setSearchResults(result.documents || []);
    } finally {
      setSearching(false);
    }
  }

  // Fetch file list
  const fetchFiles = React.useCallback(() => {
    listMarkdownFiles().then(setFiles);
  }, []);

  React.useEffect(() => {
    fetchFiles();

    // Subscribe to SSE for real-time updates
    const evtSource = new EventSource('/api/markdown/events');
    evtSource.addEventListener('file:add', _e => {
      fetchFiles();
    });
    evtSource.addEventListener('file:update', e => {
      const { file } = JSON.parse(e.data);
      if (file === selected) {
        loadMarkdownFile(file).then(setContent);
      }
      fetchFiles();
    });
    evtSource.addEventListener('file:delete', e => {
      const { file } = JSON.parse(e.data);
      fetchFiles();
      if (file === selected) {
        setSelected(null);
        setContent('');
      }
    });
    return () => evtSource.close();
  }, [fetchFiles, selected]);

  async function selectFile(file: string) {
    setSelected(file);
    setEdit(false);
    const text = await loadMarkdownFile(file);
    setContent(text);
    setNewContent(text);
  }

  async function saveFile() {
    if (selected) {
      await saveMarkdownFile(selected, newContent);
      setContent(newContent);
      setEdit(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <aside style={{ width: 260, borderRight: '1px solid #eee', padding: 8 }}>
        <h3>Knowledge Search</h3>
        <form onSubmit={handleSemanticSearch} style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Semantic search..."
            style={{ width: '80%' }}
          />
          <button type="submit" disabled={searching} style={{ marginLeft: 4 }}>
            Search
          </button>
        </form>
        {searching && <div>Searching...</div>}
        {searchResults.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <b>Results:</b>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {searchResults.map((doc, i) => (
                <li key={doc.id || i} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 13, color: '#444' }}>
                    <span style={{ fontWeight: 500 }}>
                      Match {(doc.similarity * 100).toFixed(1)}%
                    </span>
                    <br />
                    <span>{doc.content.slice(0, 80)}...</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h3>Markdown Files</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {files.map(f => (
            <li key={f}>
              <button
                style={{
                  background: f === selected ? '#e0e0e0' : 'none',
                  border: 'none',
                  textAlign: 'left',
                  width: '100%',
                }}
                onClick={() => selectFile(f)}
              >
                {f}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main style={{ flex: 1, padding: 16 }}>
        {selected ? (
          edit ? (
            <div>
              <textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                style={{ width: '100%', height: 300 }}
              />
              <br />
              <button onClick={saveFile}>Save</button>
              <button onClick={() => setEdit(false)}>Cancel</button>
            </div>
          ) : (
            <div>
              <button onClick={() => setEdit(true)}>Edit</button>
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )
        ) : (
          <div>Select a file to view</div>
        )}
      </main>
    </div>
  );
}
