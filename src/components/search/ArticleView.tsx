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
import { useMobileDetection } from '../../hooks/useMobileDetection';

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
  const [loading, setLoading] = useState(!content);
  const [articleContent, setArticleContent] = useState(content || '');

  useEffect(() => {
    if (!content && url) {
      // Fetch article content if not provided
      fetchArticleContent(url);
    }
  }, [url, content]);

  const fetchArticleContent = async (articleUrl: string) => {
    try {
      setLoading(true);
      // In production, this would call your backend API to fetch and extract article content
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
        'fixed inset-0 z-50 bg-slate-950 overflow-y-auto',
        isMobile ? 'p-4' : 'p-8',
        className
      )}
    >
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            {onSave && (
              <button
                onClick={onSave}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                aria-label="Save article"
              >
                <Bookmark size={18} />
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              aria-label="Share article"
            >
              <Share2 size={18} />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              aria-label="Open original"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>

        {/* Article Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{title}</h1>
          
          {image && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <img src={image} alt={title} className="w-full h-auto max-h-96 object-cover" />
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
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
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
              <div className="h-4 bg-slate-800 rounded animate-pulse" />
              <div className="h-4 bg-slate-800 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-slate-800 rounded animate-pulse" />
            </div>
          ) : (
            <div
              className="text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: articleContent || 'No content available.' }}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            <span>Read on Original Site</span>
          </a>
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
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


