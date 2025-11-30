/**
 * Enhanced Regen Sidebar - Feature #2
 * AI Chat + Notes + Saved Research + Quick Tools + Clipboard + Downloads
 */

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  X,
  Search,
  TrendingUp,
  FileText,
  Clipboard,
  Download,
  Folder,
  Wrench,
  BookOpen,
  Plus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { toast } from '../../utils/toast';

type SidebarTab = 'chat' | 'notes' | 'research' | 'tools' | 'clipboard' | 'downloads' | 'files';

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
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  
  // Files state
  const [files, setFiles] = useState<string[]>([]);

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
      navigator.clipboard.readText().then(text => {
        if (text && text.length > 0) {
          const newItem: ClipboardItem = {
            id: `clip-${Date.now()}`,
            text,
            timestamp: Date.now(),
            type: text.startsWith('http') ? 'url' : text.includes('function') || text.includes('const') ? 'code' : 'text',
          };
          setClipboardItems(prev => {
            const updated = [newItem, ...prev].slice(0, 50); // Keep last 50
            localStorage.setItem('regen-clipboard', JSON.stringify(updated));
            return updated;
          });
        }
      }).catch(() => {});
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
    
    const updated = selectedNote
      ? notes.map(n => n.id === note.id ? note : n)
      : [note, ...notes];
    
    setNotes(updated);
    localStorage.setItem('regen-notes', JSON.stringify(updated));
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    toast.success('Note saved');
  };

  const deleteNote = (id: string) => {
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
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-gray-200">Regen</h2>
        </div>
        <button
          onClick={async () => {
            const { useAppStore } = await import('../../state/appStore');
            useAppStore.getState().setRegenSidebarOpen(false);
          }}
          className="text-gray-400 hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-700 overflow-x-auto">
        {[
          { id: 'chat' as SidebarTab, icon: Sparkles, label: 'Chat' },
          { id: 'notes' as SidebarTab, icon: FileText, label: 'Notes' },
          { id: 'research' as SidebarTab, icon: BookOpen, label: 'Research' },
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
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chat' && (
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Ask me anything</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
              {notes.length === 0 ? (
                <div className="text-center text-gray-400 mt-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
                      className="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                    >
                      <h3 className="font-semibold text-white mb-1">{note.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-700 space-y-2">
              <input
                type="text"
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Write your note..."
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm min-h-[100px]"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNote}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
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
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
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
              <div className="text-center text-gray-400 mt-8">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No saved research yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedResearch.map(research => (
                  <div key={research.id} className="p-4 bg-gray-800 rounded-lg">
                    <h3 className="font-semibold text-white mb-2">{research.query}</h3>
                    <p className="text-sm text-gray-300 mb-2">{research.summary}</p>
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

        {activeTab === 'clipboard' && (
          <div className="p-4">
            {clipboardItems.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <Clipboard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Clipboard history will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clipboardItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-300 flex-1 line-clamp-3">{item.text}</p>
                      <button
                        onClick={() => copyToClipboard(item.text)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
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
              <div className="text-center text-gray-400 mt-8">
                <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No downloads yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {downloads.map(download => (
                  <div key={download.id} className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-white">{download.filename}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        download.status === 'completed' ? 'bg-green-600' :
                        download.status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                      }`}>
                        {download.status}
                      </span>
                    </div>
                    {download.status === 'downloading' && (
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
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
          <div className="p-4 space-y-3">
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
        <div className="p-4 border-t border-gray-700">
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
              className="flex-1 bg-gray-800 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickToolButton({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
    >
      <Icon className="w-5 h-5 text-purple-400" />
      <span className="text-sm text-white">{label}</span>
    </button>
  );
}

