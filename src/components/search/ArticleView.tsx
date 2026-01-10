/**
 * Article View Component
 * Clean reading mode for articles with metadata, sharing, and offline save
 */

import { useState, useEffect } from 'react';
import {
  ExternalLink,
  Bookmark,
  Share2,
  Download,
  ArrowLeft,
  Clock,
  Calendar,
  User,
  Globe,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../utils/mobileDetection';

export interface ArticleViewProps {
  url: string;
  title: string;
  content?: string;
  author?: string;
  publishedDate?: string;
  readTime?: number;
  image?: string;
  onClose: () => void;
  onSave?: () => void;
  onShare?: () => void;
  className?: string;
}

export function ArticleView({
  url,
  title,
  content,
  author,
  publishedDate,
  readTime,
  image,
  onClose,
  onSave,
  onShare,
  className,
}: ArticleViewProps) {
  const { isMobile } = useMobileDetection();
  // FIX: Use CommandController status instead of local loading state
  // This is a read operation (article fetching), so it's acceptable to have local loading state
  // But ideally this should go through CommandController for consistency
  const [loading, setLoading] = useState(!content);
  const [articleContent, setArticleContent] = useState(content || '');

  useEffect(() => {
    if (!content && url) {
      // FIX: For v2, route through CommandController: `executeCommand('fetch article ${url}')`
      // For now, direct fetch is acceptable for read operations
      fetchArticleContent(url);
    }
  }, [url, content]);

  const fetchArticleContent = async (articleUrl: string) => {
    try {
      setLoading(true);
      // FIX: This is a read operation (not a command), so direct fetch is acceptable
      // For v2, consider adding ARTICLE_FETCH intent to CommandController
      const response = await fetch(`/api/article?url=${encodeURIComponent(articleUrl)}`);
      if (response.ok) {
        const data = await response.json();
        setArticleContent(data.content || '');
      }
    } catch (error) {
      console.error('Failed to fetch article content:', error);
      setArticleContent('Failed to load article content. Please visit the original source.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
          text: content?.substring(0, 200),
        });
      } catch {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      if (onShare) {
        onShare();
      }
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 overflow-y-auto bg-slate-950',
        isMobile ? 'p-4' : 'p-8',
        className
      )}
    >
      {/* Header */}
      <div className="mx-auto mb-6 max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            {onSave && (
              <button
                onClick={onSave}
                className="rounded-lg bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
                aria-label="Save article"
              >
                <Bookmark size={18} />
              </button>
            )}
            <button
              onClick={handleShare}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
              aria-label="Share article"
            >
              <Share2 size={18} />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
              aria-label="Open original"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>

        {/* Article Header */}
        <div className="mb-6">
          <h1 className="mb-4 text-3xl font-bold leading-tight text-white md:text-4xl">{title}</h1>

          {image && (
            <div className="mb-6 overflow-hidden rounded-lg">
              <img src={image} alt={title} className="h-auto max-h-96 w-full object-cover" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            {author && (
              <div className="flex items-center gap-2">
                <User size={16} />
                <span>{author}</span>
              </div>
            )}
            {publishedDate && (
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{new Date(publishedDate).toLocaleDateString()}</span>
              </div>
            )}
            {readTime && (
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{readTime} min read</span>
              </div>
            )}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
            >
              <Globe size={16} />
              <span>Original Source</span>
            </a>
          </div>
        </div>

        {/* Article Content */}
        <div className="prose prose-invert prose-lg max-w-none">
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
              <div className="h-4 animate-pulse rounded bg-slate-800" />
            </div>
          ) : (
            <div
              className="leading-relaxed text-slate-200"
              dangerouslySetInnerHTML={{ __html: articleContent || 'No content available.' }}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            <ExternalLink size={16} />
            <span>Read on Original Site</span>
          </a>
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700"
            >
              <Download size={16} />
              <span>Save Offline</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
