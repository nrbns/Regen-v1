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
  Sparkles,
  Loader2,
} from 'lucide-react';
import gameCatalog from './gameCatalog.json';
import { GamePlayer } from './GamePlayer';
import { aiEngine } from '../../core/ai';
import { semanticSearchMemories } from '../../core/supermemory/search';

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
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [showAiRecommendations, setShowAiRecommendations] = useState(false);

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

  // Enhanced search state
  const [enhancedSearchResults, setEnhancedSearchResults] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  // Enhanced search with AI
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setEnhancedSearchResults(new Set());
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const aiResults = await enhancedSearch(searchQuery);
        setEnhancedSearchResults(new Set(aiResults));
      } catch (error) {
        console.warn('[GameHub] Enhanced search failed:', error);
        setEnhancedSearchResults(new Set());
      } finally {
        setIsSearching(false);
      }
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, enhancedSearch]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let games = gameCatalog.games as Game[];

    // Show AI recommendations if enabled
    if (showAiRecommendations && aiRecommendations.length > 0) {
      games = games.filter(g => aiRecommendations.includes(g.id));
    } else {
      // Filter by category
      if (selectedCategory !== 'all') {
        games = games.filter(g => g.category === selectedCategory);
      }

      // Filter by search (with AI enhancement)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        // Use AI-enhanced search results if available
        if (enhancedSearchResults.size > 0) {
          games = games.filter(g => enhancedSearchResults.has(g.id));
        } else {
          // Fallback to regular text search
          games = games.filter(
            g =>
              g.title.toLowerCase().includes(query) ||
              g.description.toLowerCase().includes(query) ||
              g.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }
      }
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
  }, [
    searchQuery,
    selectedCategory,
    sortBy,
    favorites,
    recentGames,
    showAiRecommendations,
    aiRecommendations,
    enhancedSearchResults,
  ]);

  const handlePlayGame = useCallback(
    (game: Game) => {
      setSelectedGame(game);
      // Add to recent
      const newRecent = [game.id, ...recentGames.filter(id => id !== game.id)].slice(0, 10);
      setRecentGames(newRecent);
      localStorage.setItem('gameHub_recent', JSON.stringify(newRecent));
    },
    [recentGames]
  );

  const handleToggleFavorite = useCallback(
    (gameId: string) => {
      const newFavorites = new Set(favorites);
      if (newFavorites.has(gameId)) {
        newFavorites.delete(gameId);
      } else {
        newFavorites.add(gameId);
      }
      setFavorites(newFavorites);
      localStorage.setItem('gameHub_favorites', JSON.stringify(Array.from(newFavorites)));
    },
    [favorites]
  );

  const handleClosePlayer = useCallback(() => {
    setSelectedGame(null);
  }, []);

  // AI-powered game recommendations
  const generateAiRecommendations = useCallback(async () => {
    if (isLoadingRecommendations) return;

    setIsLoadingRecommendations(true);
    try {
      const allGames = gameCatalog.games as Game[];

      // Build context from user preferences
      const context: any = {
        mode: 'games',
        favoriteGames: Array.from(favorites).slice(0, 10),
        recentGames: recentGames.slice(0, 10),
        favoriteCategories: Array.from(favorites)
          .map(id => allGames.find(g => g.id === id)?.category)
          .filter(Boolean),
      };

      // Fetch relevant gaming memories
      let relevantMemories: any[] = [];
      try {
        const memoryMatches = await semanticSearchMemories(
          `game recommendations ${Array.from(favorites).slice(0, 3).join(' ')}`,
          { limit: 3, minSimilarity: 0.5 }
        );
        relevantMemories = memoryMatches.map(m => ({
          value: m.event.value,
          metadata: m.event.metadata,
          similarity: m.similarity,
        }));
      } catch (error) {
        console.warn('[GameHub] Failed to fetch memory context:', error);
      }

      if (relevantMemories.length > 0) {
        context.memories = relevantMemories;
      }

      // Build game catalog summary for AI
      const gameSummary = allGames.slice(0, 50).map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        tags: g.tags,
      }));

      context.availableGames = gameSummary;

      const recommendationPrompt = `Based on the user's gaming preferences:
- Favorite games: ${
        Array.from(favorites)
          .slice(0, 5)
          .map(id => allGames.find(g => g.id === id)?.title)
          .filter(Boolean)
          .join(', ') || 'none'
      }
- Recent games: ${
        recentGames
          .slice(0, 5)
          .map(id => allGames.find(g => g.id === id)?.title)
          .filter(Boolean)
          .join(', ') || 'none'
      }
- Favorite categories: ${
        [
          ...new Set(
            Array.from(favorites)
              .map(id => allGames.find(g => g.id === id)?.category)
              .filter(Boolean)
          ),
        ].join(', ') || 'none'
      }

Recommend 5-8 games from the available catalog that match their preferences. Consider:
1. Similar gameplay mechanics
2. Genre preferences
3. Game complexity/style
4. Diversity (mix of categories)

Return a list of game IDs (one per line) that you recommend. Format: "Recommended game IDs:\nID1\nID2\nID3..."`;

      const aiResult = await aiEngine.runTask({
        kind: 'agent',
        prompt: recommendationPrompt,
        context,
        mode: 'games',
        metadata: {
          favoriteCount: favorites.size,
          recentCount: recentGames.length,
        },
        llm: {
          temperature: 0.7,
          maxTokens: 500,
        },
      });

      // Parse game IDs from AI response
      const text = aiResult?.text || '';
      const idLines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Extract potential game IDs
          const match = line.match(/^(?:-|\d+\.|•)?\s*([a-z0-9-_]+)/i);
          return (
            match &&
            allGames.some(
              g => g.id === match[1] || g.title.toLowerCase().includes(match[1].toLowerCase())
            )
          );
        })
        .map(line => {
          const match = line.match(/^(?:-|\d+\.|•)?\s*([a-z0-9-_]+)/i);
          if (match) {
            // Try to find game by ID or title
            const found = allGames.find(
              g => g.id === match[1] || g.title.toLowerCase().includes(match[1].toLowerCase())
            );
            return found?.id;
          }
          return null;
        })
        .filter(Boolean) as string[];

      // If no IDs parsed, use AI analysis to find similar games
      let recommendations: string[] = [];
      if (idLines.length > 0) {
        recommendations = idLines.slice(0, 8);
      } else {
        // Fallback: Use favorite games to find similar ones
        const favoriteGameIds = Array.from(favorites).slice(0, 5);
        favoriteGameIds.forEach(favId => {
          const favGame = allGames.find(g => g.id === favId);
          if (favGame) {
            // Find games with similar tags/category
            const similar = allGames
              .filter(
                g =>
                  g.id !== favId &&
                  !favorites.has(g.id) &&
                  (g.category === favGame.category ||
                    g.tags.some(tag => favGame.tags.includes(tag)))
              )
              .slice(0, 2);
            recommendations.push(...similar.map(g => g.id));
          }
        });
        recommendations = [...new Set(recommendations)].slice(0, 8);
      }

      setAiRecommendations(recommendations);
      setShowAiRecommendations(true);
    } catch (error) {
      console.error('[GameHub] AI recommendation failed:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [favorites, recentGames, isLoadingRecommendations]);

  // Enhanced AI-powered search
  const enhancedSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 3) return [];

    try {
      const allGames = gameCatalog.games as Game[];
      const gameSummary = allGames.slice(0, 100).map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        tags: g.tags,
      }));

      const searchPrompt = `Find games matching this search query: "${query}"

Available games:
${gameSummary.map(g => `- ${g.title} (${g.category}): ${g.description} [${g.tags.join(', ')}]`).join('\n')}

Return game IDs that match the query, considering:
1. Title similarity
2. Description relevance
3. Tag matches
4. Category relevance

Format: "Matching game IDs:\nID1\nID2\nID3..."`;

      const aiResult = await aiEngine.runTask({
        kind: 'agent',
        prompt: searchPrompt,
        context: { mode: 'games', query },
        mode: 'games',
        llm: { temperature: 0.3, maxTokens: 400 },
      });

      const text = aiResult?.text || '';
      const idLines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('Matching'))
        .map(line => {
          const match = line.match(/^(?:-|\d+\.|•)?\s*([a-z0-9-_]+)/i);
          if (match) {
            const found = allGames.find(
              g => g.id === match[1] || g.title.toLowerCase().includes(match[1].toLowerCase())
            );
            return found?.id;
          }
          return null;
        })
        .filter(Boolean) as string[];

      return idLines;
    } catch (error) {
      console.warn('[GameHub] Enhanced search failed:', error);
      return [];
    }
  }, []);

  return (
    <div className="mode-theme mode-theme--games h-full w-full text-gray-100 flex flex-col overflow-hidden">
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
                onClick={() => {
                  if (showAiRecommendations) {
                    setShowAiRecommendations(false);
                  } else {
                    generateAiRecommendations();
                  }
                }}
                disabled={isLoadingRecommendations || favorites.size === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                title={
                  favorites.size === 0
                    ? 'Add favorites to get recommendations'
                    : showAiRecommendations
                      ? 'Show all games'
                      : 'Get AI recommendations'
                }
              >
                {isLoadingRecommendations ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {showAiRecommendations ? 'Show All' : 'AI Recommendations'}
              </button>
              {showAiRecommendations && (
                <button
                  onClick={() => setShowAiRecommendations(false)}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              )}
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
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowAiRecommendations(false);
              }}
              placeholder="Search games... (AI-powered)"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0f111a] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 size={16} className="text-purple-400 animate-spin" />
              </div>
            )}
            {enhancedSearchResults.size > 0 && !isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Sparkles
                  size={14}
                  className="text-purple-400"
                  title={`${enhancedSearchResults.size} AI-matched games`}
                />
              </div>
            )}
          </div>

          {/* Categories & Sort */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <div className="flex gap-1.5">
                {gameCatalog.categories.map(cat => (
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
              onChange={e => setSortBy(e.target.value as SortOption)}
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
                {filteredGames.map(game => (
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
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                `https://via.placeholder.com/200x150/6366F1/FFFFFF?text=${encodeURIComponent(game.title)}`;
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
                                title={
                                  favorites.has(game.id)
                                    ? 'Remove from favorites'
                                    : 'Add to favorites'
                                }
                              >
                                <Star
                                  size={14}
                                  fill={favorites.has(game.id) ? 'currentColor' : 'none'}
                                />
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
                          onError={e => {
                            (e.target as HTMLImageElement).src =
                              `https://via.placeholder.com/80/6366F1/FFFFFF?text=${encodeURIComponent(game.title.slice(0, 2))}`;
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
                          <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                            {game.description}
                          </p>
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
                            <Star
                              size={16}
                              fill={favorites.has(game.id) ? 'currentColor' : 'none'}
                            />
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
        {selectedGame && <GamePlayer game={selectedGame} onClose={handleClosePlayer} />}
      </div>
    </div>
  );
}
