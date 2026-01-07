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
import { SessionWorkspace, ResearchSession } from '../../core/workspace/SessionWorkspace';
import { toast } from '../../utils/toast';
import { AgentSuggestions } from './AgentSuggestions';
import { StreamingAgentSidebar } from './StreamingAgentSidebar';
import { HighlightToNote } from '../../core/content/highlightToNote';
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
    } catch {
      toast.error('Export failed');
    }
  };

  const exportToMarkdown = async (sessionId: string) => {
    try {
      await SessionWorkspace.exportToMarkdown(sessionId);
      toast.success('Exported to Markdown');
    } catch {
      toast.error('Export failed');
    }
  };

  const exportToPDF = async (sessionId: string) => {
    try {
      await SessionWorkspace.exportToPDF(sessionId);
      toast.success('Exported to PDF');
    } catch {
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

  const filteredSessions = sessions.filter(
    s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.metadata.query?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-gray-900">
      {/* Sidebar */}
      <div className="flex w-80 flex-col border-r border-gray-700">
        <div className="border-b border-gray-700 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <BookOpen className="h-5 w-5" />
              Research Sessions
            </h2>
            <button
              onClick={createSession}
              className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search sessions..."
              className="w-full rounded-lg bg-gray-800 py-2 pl-10 pr-4 text-sm text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredSessions.length === 0 ? (
            <div className="mt-8 text-center text-gray-400">
              <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-sm">No sessions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`cursor-pointer rounded-lg p-3 transition-colors ${
                    currentSession?.id === session.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  <h3 className="mb-1 text-sm font-semibold">{session.title}</h3>
                  {session.metadata.query && (
                    <p className="line-clamp-1 text-xs opacity-75">{session.metadata.query}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs opacity-60">
                    <span>{session.tabs.length} tabs</span>
                    <span>{session.notes.length} notes</span>
                    <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        exportSession(session.id);
                      }}
                      className="rounded p-1 hover:bg-white/20"
                      title="Export"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        exportToMarkdown(session.id);
                      }}
                      className="rounded p-1 hover:bg-white/20"
                      title="Export to Markdown"
                    >
                      <FileText className="h-3 w-3" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        exportToPDF(session.id);
                      }}
                      className="rounded p-1 hover:bg-white/20"
                      title="Export to PDF"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="rounded p-1 text-red-400 hover:bg-white/20"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 p-4">
          <button
            onClick={importSession}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
          >
            <FolderOpen className="h-4 w-4" />
            Import Session
          </button>
        </div>
      </div>

      {/* Streaming Agent Sidebar */}
      <StreamingAgentSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {currentSession ? (
          <>
            <div className="border-b border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{currentSession.title}</h2>
                  {currentSession.metadata.query && (
                    <p className="mt-1 text-sm text-gray-400">{currentSession.metadata.query}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => SessionWorkspace.saveSession(currentSession)}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
                  >
                    <Save className="mr-2 inline h-4 w-4" />
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
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center">
              <Sparkles className="mx-auto mb-4 h-16 w-16 opacity-50" />
              <p className="mb-2 text-lg">No session selected</p>
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
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <FileText className="h-5 w-5" />
            Summaries ({session.summaries.length})
          </h3>
          <div className="space-y-3">
            {session.summaries.map(summary => (
              <div key={summary.id} className="rounded-lg bg-gray-800 p-4">
                <a
                  href={summary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 block text-sm font-semibold text-blue-400 hover:underline"
                >
                  {summary.url}
                </a>
                <p className="mb-2 text-sm text-gray-300">{summary.summary}</p>
                {summary.keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summary.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="rounded bg-purple-600/20 px-2 py-1 text-xs text-purple-300"
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
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <FileText className="h-5 w-5" />
            Notes ({session.notes.length})
          </h3>
          <div className="space-y-3">
            {session.notes.map(note => (
              <div key={note.id} className="rounded-lg bg-gray-800 p-4">
                {note.url && (
                  <a
                    href={note.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 block text-xs text-blue-400 hover:underline"
                  >
                    {note.url}
                  </a>
                )}
                {note.selection && (
                  <blockquote className="mb-2 border-l-4 border-purple-500 py-2 pl-3 text-sm italic text-gray-300">
                    {note.selection}
                  </blockquote>
                )}
                <p className="text-sm text-gray-200">{note.content}</p>
                {note.tags && note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {note.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded bg-blue-600/20 px-2 py-1 text-xs text-blue-300"
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
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <Highlighter className="h-5 w-5" />
            Highlights ({session.highlights.length})
          </h3>
          <div className="space-y-2">
            {session.highlights.map(highlight => (
              <div key={highlight.id} className="rounded-lg bg-gray-800 p-3">
                <blockquote className="border-l-4 border-yellow-500 py-1 pl-3 text-sm italic text-gray-300">
                  {highlight.text}
                </blockquote>
                {highlight.note && <p className="mt-2 text-xs text-gray-400">{highlight.note}</p>}
                <a
                  href={highlight.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-xs text-blue-400 hover:underline"
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
          <h3 className="mb-3 text-lg font-semibold text-white">Tabs ({session.tabs.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {session.tabs.map(tab => (
              <a
                key={tab.id}
                href={tab.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700"
              >
                <p className="truncate text-sm font-medium text-white">{tab.title}</p>
                <p className="mt-1 truncate text-xs text-gray-400">{tab.url}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {session.summaries.length === 0 &&
        session.notes.length === 0 &&
        session.highlights.length === 0 &&
        session.tabs.length === 0 && (
          <div className="mt-8 text-center text-gray-400">
            <p className="text-sm">This session is empty</p>
            <p className="mt-2 text-xs">Start researching to add content</p>
          </div>
        )}
    </div>
  );
}
