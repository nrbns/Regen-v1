/**
 * Bookmark Button - Tier 2
 * Star icon in URL bar to toggle bookmark
 */

import { Star } from 'lucide-react';
import { useBookmarksStore } from '../state/bookmarksStore';
import { useTabsStore } from '../state/tabsStore';
import { track } from '../services/analytics';
import { showToast } from '../state/toastStore';

export function BookmarkButton() {
  const activeTab = useTabsStore(state => state.tabs.find(t => t.id === state.activeId));
  const add = useBookmarksStore(state => state.add);
  const remove = useBookmarksStore(state => state.remove);
  const getByUrl = useBookmarksStore(state => state.getByUrl);

  if (!activeTab || !activeTab.url || activeTab.url === 'about:blank') {
    return null;
  }

  const isBookmarked = getByUrl(activeTab.url) !== undefined;

  const handleToggle = () => {
    if (isBookmarked) {
      const bookmark = getByUrl(activeTab.url!);
      if (bookmark) {
        remove(bookmark.id);
        track('bookmark_removed', { url: activeTab.url });
        showToast('info', 'Bookmark removed');
      }
    } else {
      add({
        url: activeTab.url!,
        title: activeTab.title || 'Untitled',
      });
      track('bookmark_added', { url: activeTab.url });
      showToast('success', 'Bookmarked!');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded transition-colors ${
        isBookmarked ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-gray-300'
      }`}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <Star size={16} className={isBookmarked ? 'fill-current' : ''} />
    </button>
  );
}
