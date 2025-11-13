/**
 * Game Hub - Friv-style game browser
 * Legal, fast, browser-first game launcher
 */

// @ts-nocheck

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Grid3x3,
  List,
  Play,
  Star,
  Filter,
  Gamepad2,
} from 'lucide-react';
import gameCatalog from './gameCatalog.json';
import { GamePlayer } from './GamePlayer';

interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  type: string;
  source: string;
  embed_url: string | null;
  offline_capable: boolean;
  license: string;
  attribution: string;
  size_kb: number;
  tags: string[];
}

type ViewMode = 'grid' | 'list';
type SortOption = 'recent' | 'popular' | 'alphabetical' | 'size';

export function GameHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentGames, setRecentGames] = useState<string[]>([]);

  // Load favorites and recent from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('gameHub_favorites');
    const savedRecent = localStorage.getItem('gameHub_recent');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
    if (savedRecent) {
      setRecentGames(JSON.parse(savedRecent));
    }
  }, []);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let games = gameCatalog.games as Game[];

    // Filter by category
    if (selectedCategory !== 'all') {
      games = games.filter((g) => g.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      games = games.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query) ||
          g.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'alphabetical':
        games.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'size':
        games.sort((a, b) => a.size_kb - b.size_kb);
        break;
      case 'popular':
        // Sort by favorites count (simplified)
        games.sort((a, b) => {
          const aFav = favorites.has(a.id) ? 1 : 0;
          const bFav = favorites.has(b.id) ? 1 : 0;
          return bFav - aFav;
        });
        break;
      case 'recent':
      default:
        // Sort by recent first
        games.sort((a, b) => {
          const aRecent = recentGames.indexOf(a.id);
          const bRecent = recentGames.indexOf(b.id);
          if (aRecent === -1 && bRecent === -1) return 0;
          if (aRecent === -1) return 1;
          if (bRecent === -1) return -1;
          return aRecent - bRecent;
        });
        break;
    }

    return games;
  }, [searchQuery, selectedCategory, sortBy, favorites, recentGames]);

  const handlePlayGame = useCallback((game: Game) => {
    setSelectedGame(game);
    // Add to recent
    const newRecent = [game.id, ...recentGames.filter((id) => id !== game.id)].slice(0, 10);
    setRecentGames(newRecent);
    localStorage.setItem('gameHub_recent', JSON.stringify(newRecent));
  }, [recentGames]);

  const handleToggleFavorite = useCallback((gameId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(gameId)) {
      newFavorites.delete(gameId);
    } else {
      newFavorites.add(gameId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('gameHub_favorites', JSON.stringify(Array.from(newFavorites)));
  }, [favorites]);

  const handleClosePlayer = useCallback(() => {
    setSelectedGame(null);
  }, []);

  return (
    <div className="h-full w-full bg-[#0f111a] text-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#111422] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Gamepad2 size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Game Hub</h1>
              <p className="text-sm text-gray-400">Play instantly, no downloads required</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title={viewMode === 'grid' ? 'List view' : 'Grid view'}
            >
              {viewMode === 'grid' ? <List size={20} /> : <Grid3x3 size={20} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f111a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
          />
        </div>

        {/* Categories & Sort */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <div className="flex gap-1.5">
              {gameCatalog.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <span className="mr-1.5">{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="ml-auto px-3 py-1.5 bg-[#0f111a] border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
          >
            <option value="recent">Recent</option>
            <option value="popular">Popular</option>
            <option value="alphabetical">A-Z</option>
            <option value="size">Size</option>
          </select>
        </div>
      </header>

      {/* Games Grid/List */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        {filteredGames.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <Gamepad2 size={48} className="text-gray-600 mx-auto" />
              <p className="text-gray-400">No games found</p>
              <p className="text-sm text-gray-500">Try a different search or category</p>
            </div>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                : 'space-y-3'
            }
          >
            <AnimatePresence>
              {filteredGames.map((game) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`group relative ${
                    viewMode === 'grid'
                      ? 'aspect-[4/3]'
                      : 'flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {viewMode === 'grid' ? (
                    <>
                      <div className="absolute inset-0 rounded-xl overflow-hidden border border-white/10 bg-[#0f111a] group-hover:border-purple-500/50 transition-colors">
                        <img
                          src={game.thumbnail}
                          alt={game.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://via.placeholder.com/200x150/6366F1/FFFFFF?text=${encodeURIComponent(game.title)}`;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <h3 className="text-sm font-semibold text-white mb-1 truncate">
                            {game.title}
                          </h3>
                          <p className="text-xs text-gray-300 line-clamp-2 mb-2">
                            {game.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePlayGame(game)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              <Play size={12} />
                              Play
                            </button>
                            <button
                              onClick={() => handleToggleFavorite(game.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                favorites.has(game.id)
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-white/10 text-gray-400 hover:text-yellow-400'
                              }`}
                              title={favorites.has(game.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star size={14} fill={favorites.has(game.id) ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          {game.offline_capable && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 text-[10px] rounded border border-green-500/30">
                              Offline
                            </span>
                          )}
                          {favorites.has(game.id) && (
                            <Star size={12} className="text-yellow-400 fill-current" />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={game.thumbnail}
                        alt={game.title}
                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://via.placeholder.com/80/6366F1/FFFFFF?text=${encodeURIComponent(game.title.slice(0, 2))}`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white">{game.title}</h3>
                          {favorites.has(game.id) && (
                            <Star size={14} className="text-yellow-400 fill-current" />
                          )}
                          {game.offline_capable && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 text-[10px] rounded">
                              Offline
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">{game.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{game.category}</span>
                          <span>•</span>
                          <span>{game.size_kb} KB</span>
                          <span>•</span>
                          <span>{game.license}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFavorite(game.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            favorites.has(game.id)
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-white/5 text-gray-400 hover:text-yellow-400'
                          }`}
                        >
                          <Star size={16} fill={favorites.has(game.id) ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={() => handlePlayGame(game)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-200 transition-colors"
                        >
                          <Play size={14} />
                          Play
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Game Player Modal */}
      {selectedGame && (
        <GamePlayer game={selectedGame} onClose={handleClosePlayer} />
      )}
    </div>
  );
}

