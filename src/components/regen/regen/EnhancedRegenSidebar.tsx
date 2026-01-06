/**
 * Enhanced Regen Sidebar - Feature #2
 * AI Chat + Notes + Saved Research + Quick Tools + Clipboard + Downloads
 */

import { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  X,
  Search,
  FileText,
  Clipboard,
  Download,
  Folder,
  Wrench,
  BookOpen,
  Copy,
} from 'lucide-react';
import { toast } from '../../utils/toast';
import ContextsList from './ContextsList';

type SidebarTab = 'chat' | 'notes' | 'research' | 'tools' | 'clipboard' | 'downloads' | 'files' | 'contexts';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface SavedResearch {
  id: string;
  query: string;
  summary: string;
  sources: string[];
  createdAt: number;
}

interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  type: 'text' | 'url' | 'code';
}

interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  size: number;
  status: 'downloading' | 'completed' | 'failed';
  progress: number;
}

export function EnhancedRegenSidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const [messages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading] = useState(false);
  // Contexts search state
  const [contextsQuery, setContextsQuery] = useState('');

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Research state
  const [savedResearch, setSavedResearch] = useState<SavedResearch[]>([]);

  // Clipboard state
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);

  // Downloads state
  const [downloads] = useState<DownloadItem[]>([]);

  // Files state (currently unused)
  // const [files] = useState<string[]>([]);

  // Load saved data
  useEffect(() => {
    // Load notes from localStorage
    const savedNotes = localStorage.getItem('regen-notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }

    // Load research
    const savedResearchData = localStorage.getItem('regen-research');
    if (savedResearchData) {
      setSavedResearch(JSON.parse(savedResearchData));
    }

    // Load clipboard history
    const savedClipboard = localStorage.getItem('regen-clipboard');
    if (savedClipboard) {
      setClipboardItems(JSON.parse(savedClipboard));
    }

    // Monitor clipboard
    const handleClipboardChange = () => {
      navigator.clipboard
        .readText()
        .then(text => {
          if (text && text.length > 0) {
            const newItem: ClipboardItem = {
              id: `clip-${Date.now()}`,
              text,
              timestamp: Date.now(),
              type: text.startsWith('http')
                ? 'url'
                : text.includes('function') || text.includes('const')
                  ? 'code'
                  : 'text',
            };
            setClipboardItems(prev => {
              const updated = [newItem, ...prev].slice(0, 50); // Keep last 50
              localStorage.setItem('regen-clipboard', JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch(() => {});
    };

    // Check clipboard every 2 seconds
    const clipboardInterval = setInterval(handleClipboardChange, 2000);

    return () => clearInterval(clipboardInterval);
  }, []);

  // Save notes
  const saveNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;

    const note: Note = selectedNote || {
      id: `note-${Date.now()}`,
      title: noteTitle || 'Untitled',
      content: noteContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (selectedNote) {
      note.title = noteTitle || note.title;
      note.content = noteContent;
      note.updatedAt = Date.now();
    }

    const updated = selectedNote ? notes.map(n => (n.id === note.id ? note : n)) : [note, ...notes];

    setNotes(updated);
    localStorage.setItem('regen-notes', JSON.stringify(updated));
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    toast.success('Note saved');
  };

  const _deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem('regen-notes', JSON.stringify(updated));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setNoteTitle('');
      setNoteContent('');
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="flex h-full flex-col border-l border-gray-700 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-200">Regen</h2>
        </div>
        <button
          onClick={async () => {
            const { useAppStore } = await import('../../state/appStore');
            useAppStore.getState().setRegenSidebarOpen(false);
          }}
          className="text-gray-400 transition-colors hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-700 p-2">
        {[
          { id: 'chat' as SidebarTab, icon: Sparkles, label: 'Chat' },
          { id: 'notes' as SidebarTab, icon: FileText, label: 'Notes' },
          { id: 'research' as SidebarTab, icon: BookOpen, label: 'Research' },
          { id: 'contexts' as SidebarTab, icon: Search, label: 'Contexts' },
          { id: 'tools' as SidebarTab, icon: Wrench, label: 'Tools' },
          { id: 'clipboard' as SidebarTab, icon: Clipboard, label: 'Clipboard' },
          { id: 'downloads' as SidebarTab, icon: Download, label: 'Downloads' },
          { id: 'files' as SidebarTab, icon: Folder, label: 'Files' },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chat' && (
          <div className="space-y-4 p-4">
            {messages.length === 0 && (
              <div className="mt-8 text-center text-gray-400">
                <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-sm">Ask me anything</p>
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-800 px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {notes.length === 0 ? (
                <div className="mt-8 text-center text-gray-400">
                  <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="text-sm">No notes yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => {
                        setSelectedNote(note);
                        setNoteTitle(note.title);
                        setNoteContent(note.content);
                      }}
                      className="cursor-pointer rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700"
                    >
                      <h3 className="mb-1 font-semibold text-white">{note.title}</h3>
                      <p className="line-clamp-2 text-sm text-gray-400">{note.content}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 border-t border-gray-700 p-4">
              <input
                type="text"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white"
              />
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Write your note..."
                className="min-h-[100px] w-full rounded-lg bg-gray-800 px-3 py-2 text-sm text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNote}
                  className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
                >
                  {selectedNote ? 'Update' : 'Save'} Note
                </button>
                {selectedNote && (
                  <button
                    onClick={() => {
                      setSelectedNote(null);
                      setNoteTitle('');
                      setNoteContent('');
                    }}
                    className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'research' && (
          <div className="p-4">
            {savedResearch.length === 0 ? (
              <div className="mt-8 text-center text-gray-400">
                <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-sm">No saved research yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedResearch.map(research => (
                  <div key={research.id} className="rounded-lg bg-gray-800 p-4">
                    <h3 className="mb-2 font-semibold text-white">{research.query}</h3>
                    <p className="mb-2 text-sm text-gray-300">{research.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {research.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          Source {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contexts' && (
          <div className="p-4">
            <h3 className="mb-3 font-semibold text-white">Navigation Contexts</h3>
            <div className="mb-2 flex items-center gap-2">
              <input
                value={contextsQuery}
                onChange={e => setContextsQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') setContextsQuery((s: string) => s.trim());
                }}
                placeholder="Search contexts..."
                className="flex-1 rounded bg-gray-700 px-2 py-1 text-sm text-white placeholder:text-gray-400"
                aria-label="Sidebar contexts search"
              />
              <button
                aria-label="Search contexts"
                onClick={() => setContextsQuery(contextsQuery.trim())}
                className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600"
              >
                Search
              </button>
            </div>
            <div className="rounded-lg bg-gray-800 p-2">
              {/* Reuse ContextPanel with larger limit for full sidebar */}
              <div style={{ padding: 0 }}>
                {/* Lightweight inline listing for contexts */}
                <ContextsList query={contextsQuery} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clipboard' && (
          <div className="p-4">
            {clipboardItems.length === 0 ? (
              <div className="mt-8 text-center text-gray-400">
                <Clipboard className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-sm">Clipboard history will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clipboardItems.map(item => (
                  <div
                    key={item.id}
                    className="rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-3 flex-1 text-sm text-gray-300">{item.text}</p>
                      <button
                        onClick={() => copyToClipboard(item.text)}
                        className="text-gray-400 transition-colors hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="p-4">
            {downloads.length === 0 ? (
              <div className="mt-8 text-center text-gray-400">
                <Download className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="text-sm">No downloads yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {downloads.map(download => (
                  <div key={download.id} className="rounded-lg bg-gray-800 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm text-white">{download.filename}</p>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          download.status === 'completed'
                            ? 'bg-green-600'
                            : download.status === 'failed'
                              ? 'bg-red-600'
                              : 'bg-blue-600'
                        }`}
                      >
                        {download.status}
                      </span>
                    </div>
                    {download.status === 'downloading' && (
                      <div className="h-2 w-full rounded-full bg-gray-700">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all"
                          style={{ width: `${download.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-3 p-4">
            <QuickToolButton
              icon={Search}
              label="Quick Search"
              onClick={() => {
                setActiveTab('chat');
                setInput('/search ');
              }}
            />
            <QuickToolButton
              icon={FileText}
              label="New Note"
              onClick={() => {
                setActiveTab('notes');
                setNoteTitle('');
                setNoteContent('');
              }}
            />
            <QuickToolButton
              icon={Clipboard}
              label="Paste Latest"
              onClick={async () => {
                const text = await navigator.clipboard.readText();
                if (text) {
                  setActiveTab('chat');
                  setInput(text);
                }
              }}
            />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="p-4">
            <p className="text-sm text-gray-400">File explorer coming soon</p>
          </div>
        )}
      </div>

      {/* Chat Input (only for chat tab) */}
      {activeTab === 'chat' && (
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // Handle send
                }
              }}
              placeholder="Ask Regen anything..."
              className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-700">
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickToolButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700"
    >
      <Icon className="h-5 w-5 text-purple-400" />
      <span className="text-sm text-white">{label}</span>
    </button>
  );
}
