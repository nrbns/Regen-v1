/**
 * PageExtractor (stub)
 * Original implementation moved to src/_deferred/ai/PageExtractor.tsx
 * Lightweight stub preserves the named export to avoid breaking imports
 * while keeping the active bundle minimal for v1.
 */

import React from 'react';

export interface ExtractedContent {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  lang: string;
}

interface PageExtractorProps {
  url: string;
  onExtract?: (content: ExtractedContent) => void;
  autoExtract?: boolean;
}

export function PageExtractor(_props: PageExtractorProps) {
  return null;
}
