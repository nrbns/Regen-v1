/**
 * Research Workspace UI - Real-time session management
 */

import { useState, useEffect } from 'react';
import { 
  Save, 
  FolderOpen, 
  FileText, 
  Download, 
  Trash2, 
  Plus,
  Search,
  BookOpen,
  Highlighter,
  Sparkles,
} from 'lucide-react';
import { SessionWorkspace, ResearchSession, SessionNote } from '../../core/workspace/SessionWorkspace';
import { toast } from '../../utils/toast';
import { AgentSuggestions } from './AgentSuggestions';
import { PageSummarizer } from '../../core/content/pageSummarizer';
import { HighlightToNote } from '../../core/content/highlightToNote';
import { CitationManager } from '../citations/CitationManager';
import { UniversalSearchUI } from '../search/UniversalSearchUI';

export function ResearchWorkspace() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSessions();
    const current = SessionWorkspace.getCurrentSession();
    if (current) setCurrentSession(current);
    
    // Enable highlight → note workflow
    HighlightToNote.enable();
    
    return () => {
      HighlightToNote.disable();
    };
  }, []);

  const loadSessions = () => {
    const all = SessionWorkspace.getAllSessions();
    setSessions(all);
  };

  const createSession = () => {
    const title = prompt('Session title:') || 'Untitled Session';
    const query = prompt('Research query (optional):') || undefined;
    const session = SessionWorkspace.createSession(title, query);
    setCurrentSession(session);
    loadSessions();
    toast.success('Session created');
  };

  const loadSession = (sessionId: string) => {
    const session = SessionWorkspace.getSession(sessionId);
    if (session) {
      setCurrentSession(session);
      SessionWorkspace['currentSessionId'] = sessionId;
      toast.success('Session loaded');
    }
  };

  const exportSession = async (sessionId: string) => {
    try {
      await SessionWorkspace.exportSession(sessionId);
      toast.success('Session exported');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const exportToMarkdown = async (sessionId: string) => {
    try {
      await SessionWorkspace.exportToMarkdown(sessionId);
      toast.success('Exported to Markdown');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const exportToPDF = async (sessionId: string) => {
    try {
      await SessionWorkspace.exportToPDF(sessionId);
      toast.success('Exported to PDF');
    } catch (error) {
      toast.error('PDF export failed');
    }
  };

  const importSession = async () => {
    try {
      const session = await SessionWorkspace.importSession();
      setCurrentSession(session);
      loadSessions();
      toast.success('Session imported');
    } catch (error) {
      if (error instanceof Error && error.message !== 'No file selected') {
        toast.error('Import failed');
      }
    }
  };

  const deleteSession = (sessionId: string) => {
    if (confirm('Delete this session?')) {
      SessionWorkspace.deleteSession(sessionId);
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      loadSessions();
      toast.success('Session deleted');
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.metadata.query?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Research Sessions
            </h2>
            <button
              onClick={createSession}
              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentSession?.id === session.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                  }`}
                >
                  <h3 className="font-semibold text-sm mb-1">{session.title}</h3>
                  {session.metadata.query && (
                    <p className="text-xs opacity-75 line-clamp-1">{session.metadata.query}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs opacity-60">
                    <span>{session.tabs.length} tabs</span>
                    <span>{session.notes.length} notes</span>
                    <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSession(session.id);
                      }}
                      className="p-1 hover:bg-white/20 rounded"
                      title="Export"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToMarkdown(session.id);
                      }}
                      className="p-1 hover:bg-white/20 rounded"
                      title="Export to Markdown"
                    >
                      <FileText className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToPDF(session.id);
                      }}
                      className="p-1 hover:bg-white/20 rounded"
                      title="Export to PDF"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1 hover:bg-white/20 rounded text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={importSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            <FolderOpen className="w-4 h-4" />
            Import Session
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{currentSession.title}</h2>
                  {currentSession.metadata.query && (
                    <p className="text-sm text-gray-400 mt-1">{currentSession.metadata.query}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => SessionWorkspace.saveSession(currentSession)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <SessionContent session={currentSession} />
            </div>
            
            {/* Agent Suggestions */}
            <AgentSuggestions />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No session selected</p>
              <p className="text-sm">Create a new session or load an existing one</p>
            </div>
          </div>
        )}
      </div>

      {/* Universal Search - Global (always available) */}
      <UniversalSearchUI />
    </div>
  );
}

function SessionContent({ session }: { session: ResearchSession }) {
  return (
    <div className="space-y-6">
      {/* Summaries */}
      {session.summaries.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Summaries ({session.summaries.length})
          </h3>
          <div className="space-y-3">
            {session.summaries.map(summary => (
              <div key={summary.id} className="bg-gray-800 rounded-lg p-4">
                <a
                  href={summary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm font-semibold mb-2 block"
                >
                  {summary.url}
                </a>
                <p className="text-gray-300 text-sm mb-2">{summary.summary}</p>
                {summary.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {summary.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-600/20 text-purple-300 rounded text-xs"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {session.notes.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notes ({session.notes.length})
          </h3>
          <div className="space-y-3">
            {session.notes.map(note => (
              <div key={note.id} className="bg-gray-800 rounded-lg p-4">
                {note.url && (
                  <a
                    href={note.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-xs mb-2 block"
                  >
                    {note.url}
                  </a>
                )}
                {note.selection && (
                  <blockquote className="border-l-4 border-purple-500 pl-3 py-2 mb-2 text-gray-300 italic text-sm">
                    {note.selection}
                  </blockquote>
                )}
                <p className="text-gray-200 text-sm">{note.content}</p>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {note.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highlights */}
      {session.highlights.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Highlighter className="w-5 h-5" />
            Highlights ({session.highlights.length})
          </h3>
          <div className="space-y-2">
            {session.highlights.map(highlight => (
              <div key={highlight.id} className="bg-gray-800 rounded-lg p-3">
                <blockquote className="border-l-4 border-yellow-500 pl-3 py-1 text-gray-300 italic text-sm">
                  {highlight.text}
                </blockquote>
                {highlight.note && (
                  <p className="text-gray-400 text-xs mt-2">{highlight.note}</p>
                )}
                <a
                  href={highlight.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-xs mt-2 block"
                >
                  {highlight.url}
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tabs */}
      {session.tabs.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-white mb-3">
            Tabs ({session.tabs.length})
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {session.tabs.map(tab => (
              <a
                key={tab.id}
                href={tab.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors"
              >
                <p className="text-white text-sm font-medium truncate">{tab.title}</p>
                <p className="text-gray-400 text-xs truncate mt-1">{tab.url}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {session.summaries.length === 0 && 
       session.notes.length === 0 && 
       session.highlights.length === 0 && 
       session.tabs.length === 0 && (
        <div className="text-center text-gray-400 mt-8">
          <p className="text-sm">This session is empty</p>
          <p className="text-xs mt-2">Start researching to add content</p>
        </div>
      )}
    </div>
  );
}

