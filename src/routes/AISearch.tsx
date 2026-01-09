/**
 * AI Search Page - Functional search interface
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  Loader2,
  ArrowUp,
} from 'lucide-react';
import { useCommandController } from '../hooks/useCommandController';
import { showToast } from '../components/ui/Toast';

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  domain: string;
}

export default function AISearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<string>('');
  const { executeCommand } = useCommandController();

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setResults([]);
    setSummary('');

    try {
      const result = await executeCommand(`search ${query}`, {});
      
      if (result.success && result.data?.results) {
        setResults(result.data.results);
        setSummary(result.message);
        showToast(`Found ${result.data.results.length} results`, 'success');
      } else {
        showToast(result.message || 'Search failed', 'error');
      }
    } catch (error) {
      showToast('Search error occurred', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Sparkles className="w-8 h-8 text-purple-400" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Search & Summarize
            </h1>
          </div>
          <p className="text-slate-400">
            Search the web and get AI-powered summaries
          </p>
        </motion.div>

        {/* Search Input */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything or search the web..."
              className="w-full pl-6 pr-14 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all text-lg"
              disabled={isSearching}
            />
            <motion.button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-3 rounded-lg transition-all ${
                isSearching || !query.trim()
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
              whileHover={!isSearching && query.trim() ? { scale: 1.05 } : {}}
              whileTap={!isSearching && query.trim() ? { scale: 0.95 } : {}}
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Results */}
        <motion.div
          className="flex-1 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {results.length > 0 ? (
            <div className="space-y-4">
              {summary && (
                <motion.div
                  className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-700 rounded-xl p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-slate-200 leading-relaxed font-medium">{summary}</p>
                </motion.div>
              )}
              {results.map((result, index) => (
                <motion.a
                  key={index}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500 transition-all group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-100 group-hover:text-purple-300 transition-colors line-clamp-2">
                      {result.title}
                    </h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{result.snippet}</p>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span className="font-mono">{result.domain}</span>
                    <span>•</span>
                    <span className="text-purple-400">{result.url}</span>
                  </div>
                </motion.a>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Search className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">Start Searching</h3>
              <p className="text-slate-500 max-w-md">
                Enter a query above to search the web and get AI-powered summaries
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}