/**
 * BookmarkButton - Quick bookmark toggle button
 * Shows in URL bar or tab strip
 */

import { Star } from 'lucide-react';
import { useBookmarksStore } from '../../state/bookmarksStore';
import { useTabsStore } from '../../state/tabsStore';

interface BookmarkButtonProps {
  url?: string;
  title?: string;
  className?: string;
  size?: number;
}

export function BookmarkButton({ url, title, className = '', size = 16 }: BookmarkButtonProps) {
  const activeTab = useTabsStore((state) => {
    if (!state.activeId) return null;
    return state.tabs.find((t) => t.id === state.activeId) || null;
  });
  
  const currentUrl = url || activeTab?.url || '';
  const currentTitle = title || activeTab?.title || '';
  
  const { isBookmarked, addBookmark, removeBookmark, getBookmarkByUrl } = useBookmarksStore();
  const bookmarked = isBookmarked(currentUrl);
  const bookmark = getBookmarkByUrl(currentUrl);
  
  const handleToggle = () => {
    if (!currentUrl || currentUrl === 'about:blank') return;
    
    if (bookmarked && bookmark) {
      removeBookmark(bookmark.id);
    } else {
      addBookmark({
        title: currentTitle || new URL(currentUrl).hostname,
        url: currentUrl,
        folder: 'Favorites',
      });
    }
  };
  
  if (!currentUrl || currentUrl === 'about:blank') {
    return null;
  }
  
  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${className}`}
      title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <Star
        size={size}
        className={bookmarked ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
      />
    </button>
  );
}

