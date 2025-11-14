# Search Integration Guide

This document explains how to integrate the lightweight DuckDuckGo + Lunr search fallback into your app.

## Quick Start

### 1. Install Dependencies

```bash
npm install lunr
```

### 2. Build Lunr Index

Create a `public/docs/` directory and add your markdown/HTML files, then:

```bash
npm run build:lunr
```

This creates `public/lunr-index.json` with a searchable index of your docs.

### 3. Use the SearchBar Component

Import and use the `SearchBar` component anywhere in your app:

```tsx
import SearchBar from '../components/SearchBar';

// In your component:
<SearchBar />
```

## Integration Points

### Option 1: Replace Existing Search (Research Mode)

In `src/modes/research/index.tsx`, you can add a fallback that uses DuckDuckGo when Redix is unavailable:

```tsx
import { fetchDuckDuckGoInstant, formatDuckDuckGoResults } from '../../services/duckDuckGoSearch';

// In handleSearch function:
try {
  // Try Redix first
  const response = await ipc.research.queryEnhanced(query, {...});
  setResult(response);
} catch (err) {
  // Fallback to DuckDuckGo
  const duckResult = await fetchDuckDuckGoInstant(query);
  if (duckResult) {
    const formatted = formatDuckDuckGoResults(duckResult);
    // Convert to ResearchResult format
    setResult({
      query,
      summary: duckResult.AbstractText || duckResult.Answer || '',
      sources: formatted.map(f => ({
        title: f.title,
        url: f.url || '',
        snippet: f.snippet,
        domain: f.url ? new URL(f.url).hostname : '',
      })),
    });
  }
}
```

### Option 2: Add to Omnibox

In `src/components/TopNav/Omnibox.tsx`, add DuckDuckGo instant results as suggestions:

```tsx
import { fetchDuckDuckGoInstant } from '../../services/duckDuckGoSearch';

// In searchSuggestions function:
if (query.length > 2) {
  const duckResult = await fetchDuckDuckGoInstant(query);
  if (duckResult?.Heading) {
    pushSuggestion({
      type: 'search',
      title: duckResult.Heading,
      subtitle: duckResult.AbstractText,
      url: duckResult.AbstractURL,
      action: { type: 'nav', url: duckResult.AbstractURL || buildSearchUrl('duckduckgo', query) },
    });
  }
}
```

### Option 3: Standalone Search Page

Create a new route that uses the SearchBar component:

```tsx
// src/routes/Search.tsx
import SearchBar from '../components/SearchBar';

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <SearchBar />
    </div>
  );
}
```

## API Reference

### `fetchDuckDuckGoInstant(query: string)`

Fetches instant answers from DuckDuckGo API.

**Parameters:**
- `query`: Search query string (min 2 characters)

**Returns:** `Promise<DuckDuckGoResult | null>`

**Example:**
```tsx
const result = await fetchDuckDuckGoInstant('quantum computing');
if (result?.Heading) {
  console.log(result.Heading); // "Quantum computing"
  console.log(result.AbstractText); // Description
}
```

### `formatDuckDuckGoResults(result: DuckDuckGoResult)`

Formats DuckDuckGo results into a consistent structure.

**Returns:** Array of formatted results with `title`, `url`, `snippet`, `type`

### `searchLocal(query: string)`

Searches the local Lunr index.

**Parameters:**
- `query`: Search query string

**Returns:** `Promise<Array<{ id: string; title: string; snippet: string }>>`

**Example:**
```tsx
const results = await searchLocal('browser features');
results.forEach(r => {
  console.log(r.title, r.snippet);
});
```

## Building the Lunr Index

### Manual Build

```bash
node scripts/build-lunr.js
```

### Automatic Build (in package.json)

Add to your build process:

```json
{
  "scripts": {
    "prebuild": "npm run build:lunr",
    "dev": "npm run build:lunr && vite --mode development"
  }
}
```

### Index Structure

The index file (`public/lunr-index.json`) has this structure:

```json
{
  "index": { /* Lunr serialized index */ },
  "documents": {
    "0": { "id": "0", "title": "Document Title", "body": "Content..." },
    "1": { "id": "1", "title": "Another Doc", "body": "More content..." }
  }
}
```

## Performance Tips

1. **Debounce queries**: The SearchBar already debounces at 150ms
2. **Cache results**: Consider caching DuckDuckGo results for common queries
3. **Lazy load index**: The Lunr index loads on first search
4. **Limit results**: Both APIs return limited results (5-10 items)

## Troubleshooting

### Lunr index not found

- Ensure `public/lunr-index.json` exists
- Run `npm run build:lunr` to create it
- Check browser console for fetch errors

### DuckDuckGo API fails

- Check network connectivity
- Verify CORS isn't blocking (use proxy if needed)
- DuckDuckGo API has rate limits (informal)

### Search results empty

- Verify query is at least 2 characters
- Check that docs exist in `public/docs/`
- Ensure index was built successfully

## Next Steps

1. **Add to CI**: Include `build:lunr` in your build pipeline
2. **Enhance results**: Add result previews, images, etc.
3. **Add analytics**: Track which searches are most common
4. **Improve ranking**: Tune Lunr boost values for better relevance

