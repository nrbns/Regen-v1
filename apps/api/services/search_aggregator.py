"""
Search Aggregator Service
Aggregates results from multiple search engines (DuckDuckGo, Bing)
with advanced source ranking, deduplication, relevance scoring, and AI summarization
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional
import aiohttp
from urllib.parse import quote_plus, urlparse
import re
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class SearchResult:
    """Represents a search result from any source"""
    def __init__(
        self,
        title: str,
        url: str,
        snippet: str,
        source: str,
        rank: int = 0,
        relevance_score: float = 0.0,
    ):
        self.title = title
        self.url = url
        self.snippet = snippet
        self.source = source
        self.rank = rank
        self.relevance_score = relevance_score


async def search_duckduckgo(query: str, max_results: int = 10) -> List[SearchResult]:
    """
    Search DuckDuckGo using Instant Answer API and HTML scraping
    """
    results: List[SearchResult] = []
    
    try:
        async with aiohttp.ClientSession() as session:
            # Try Instant Answer API first
            url = f"https://api.duckduckgo.com/?q={quote_plus(query)}&format=json&no_html=1&skip_disambig=1"
            async with session.get(url, timeout=5) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Add abstract if available
                    if data.get('AbstractText'):
                        results.append(SearchResult(
                            title=data.get('Heading', query),
                            url=data.get('AbstractURL', ''),
                            snippet=data.get('AbstractText', ''),
                            source='duckduckgo',
                            rank=1,
                            relevance_score=0.9,
                        ))
                    
                    # Add related topics
                    if data.get('RelatedTopics'):
                        for idx, topic in enumerate(data.get('RelatedTopics', [])[:max_results - len(results)], start=len(results) + 1):
                            if isinstance(topic, dict) and topic.get('Text'):
                                results.append(SearchResult(
                                    title=topic.get('Text', '')[:100],
                                    url=topic.get('FirstURL', ''),
                                    snippet=topic.get('Text', ''),
                                    source='duckduckgo',
                                    rank=idx,
                                    relevance_score=0.7,
                                ))
            
            # Fallback: Use HTML scraping for more results
            if len(results) < max_results:
                try:
                    html_url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
                    async with session.get(html_url, timeout=8, headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }) as resp:
                        if resp.status == 200:
                            html = await resp.text()
                            
                            # Parse HTML results using regex (simple but effective)
                            # DuckDuckGo HTML structure: results are in <div class="result">
                            result_pattern = r'<div class="result[^"]*"[^>]*>.*?<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?<a[^>]*class="result__snippet"[^>]*>(.*?)</a>'
                            matches = re.finditer(result_pattern, html, re.DOTALL)
                            
                            for idx, match in enumerate(matches, start=len(results) + 1):
                                if len(results) >= max_results:
                                    break
                                
                                url = match.group(1)
                                title = re.sub(r'<[^>]+>', '', match.group(2)).strip()
                                snippet = re.sub(r'<[^>]+>', '', match.group(3)).strip()
                                
                                if url and title and snippet:
                                    results.append(SearchResult(
                                        title=title[:200],
                                        url=url,
                                        snippet=snippet[:300],
                                        source='duckduckgo',
                                        rank=idx,
                                        relevance_score=0.6,  # Lower score for scraped results
                                    ))
                except Exception as e:
                    logger.debug(f"DuckDuckGo HTML scraping failed: {e}")
                        
    except Exception as e:
        logger.debug(f"DuckDuckGo search failed: {e}")
    
    return results[:max_results]


async def search_bing(query: str, max_results: int = 10, api_key: Optional[str] = None) -> List[SearchResult]:
    """
    Search Bing using Bing Search API (requires API key)
    Falls back to web scraping if no API key
    """
    results: List[SearchResult] = []
    
    # If API key is available, use Bing Search API
    if api_key:
        try:
            async with aiohttp.ClientSession() as session:
                url = "https://api.bing.microsoft.com/v7.0/search"
                headers = {
                    'Ocp-Apim-Subscription-Key': api_key,
                }
                params = {
                    'q': query,
                    'count': max_results,
                    'mkt': 'en-US',
                }
                async with session.get(url, headers=headers, params=params, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        web_results = data.get('webPages', {}).get('value', [])
                        
                        for idx, item in enumerate(web_results, start=1):
                            results.append(SearchResult(
                                title=item.get('name', ''),
                                url=item.get('url', ''),
                                snippet=item.get('snippet', ''),
                                source='bing',
                                rank=idx,
                                relevance_score=0.8,
                            ))
        except Exception as e:
            logger.debug(f"Bing API search failed: {e}")
    
    # Fallback: Web scraping (simplified)
    if not results:
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://www.bing.com/search?q={quote_plus(query)}"
                async with session.get(url, timeout=8, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }) as resp:
                    if resp.status == 200:
                        html = await resp.text()
                        
                        # Parse Bing HTML results
                        # Bing structure: results are in <li class="b_algo">
                        result_pattern = r'<li class="b_algo"[^>]*>.*?<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>(.*?)</a></h2>.*?<p[^>]*>(.*?)</p>'
                        matches = re.finditer(result_pattern, html, re.DOTALL)
                        
                        for idx, match in enumerate(matches, start=1):
                            if len(results) >= max_results:
                                break
                            
                            url = match.group(1)
                            title = re.sub(r'<[^>]+>', '', match.group(2)).strip()
                            snippet = re.sub(r'<[^>]+>', '', match.group(3)).strip()
                            
                            if url and title and snippet:
                                results.append(SearchResult(
                                    title=title[:200],
                                    url=url,
                                    snippet=snippet[:300],
                                    source='bing',
                                    rank=idx,
                                    relevance_score=0.65,  # Lower score for scraped results
                                ))
        except Exception as e:
            logger.debug(f"Bing web search failed: {e}")
    
    return results[:max_results]


def calculate_domain_authority(domain: str) -> float:
    """
    Calculate domain authority score based on known authoritative domains
    """
    authority_domains = {
        'wikipedia.org': 0.95,
        'github.com': 0.90,
        'stackoverflow.com': 0.90,
        'reddit.com': 0.75,
        'medium.com': 0.70,
        'youtube.com': 0.80,
        'arxiv.org': 0.95,
        'edu': 0.85,  # Educational domains
        'gov': 0.90,  # Government domains
        'org': 0.70,  # Organizations
    }
    
    domain_lower = domain.lower()
    
    # Check exact matches
    for auth_domain, score in authority_domains.items():
        if auth_domain in domain_lower:
            return score
    
    # Check TLD
    if domain_lower.endswith('.edu'):
        return 0.85
    if domain_lower.endswith('.gov'):
        return 0.90
    if domain_lower.endswith('.org'):
        return 0.70
    
    # Default score
    return 0.50


def rank_and_deduplicate_results(
    all_results: List[SearchResult],
    query: str,
    max_results: int = 20,
) -> List[SearchResult]:
    """
    Advanced ranking and deduplication with domain authority, recency, and relevance
    """
    # Deduplicate by URL (normalize URLs)
    seen_urls = set()
    unique_results: List[SearchResult] = []
    
    for result in all_results:
        try:
            parsed = urlparse(result.url)
            # Normalize: remove www, trailing slash, query params for deduplication
            domain = parsed.netloc.lower().replace('www.', '')
            path = parsed.path.rstrip('/')
            url_normalized = f"{domain}{path}".lower()
            
            if url_normalized not in seen_urls and url_normalized and result.url:
                seen_urls.add(url_normalized)
                unique_results.append(result)
        except Exception:
            # Skip invalid URLs
            continue
    
    # Calculate enhanced relevance scores
    query_lower = query.lower()
    query_words = set(re.findall(r'\w+', query_lower))
    
    for result in unique_results:
        # Start with base score from source
        score = result.relevance_score
        
        # Extract domain for authority scoring
        try:
            domain = urlparse(result.url).netloc.lower().replace('www.', '')
            domain_authority = calculate_domain_authority(domain)
            score += domain_authority * 0.2  # Authority boost (up to +0.2)
        except Exception:
            domain_authority = 0.5
        
        # Title matching (strong signal)
        title_lower = result.title.lower()
        title_words = set(re.findall(r'\w+', title_lower))
        title_overlap = len(query_words & title_words)
        if title_overlap > 0:
            score += (title_overlap / len(query_words)) * 0.3  # Up to +0.3
        
        # Exact phrase match in title (very strong signal)
        if query_lower in title_lower:
            score += 0.2
        
        # Snippet matching
        snippet_lower = result.snippet.lower()
        snippet_words = set(re.findall(r'\w+', snippet_lower))
        snippet_overlap = len(query_words & snippet_words)
        if snippet_overlap > 0:
            score += (snippet_overlap / len(query_words)) * 0.15  # Up to +0.15
        
        # Exact phrase match in snippet
        if query_lower in snippet_lower:
            score += 0.1
        
        # Penalize very short snippets
        if len(result.snippet) < 20:
            score -= 0.15
        elif len(result.snippet) > 200:
            score += 0.05  # Prefer longer, more informative snippets
        
        # Boost if URL contains query words
        url_lower = result.url.lower()
        url_matches = sum(1 for word in query_words if word in url_lower)
        if url_matches > 0:
            score += url_matches * 0.05
        
        # Normalize score to 0-1 range
        result.relevance_score = min(1.0, max(0.0, score))
    
    # Sort by relevance score (descending), then by source priority, then by domain authority
    source_priority = {'duckduckgo': 1, 'bing': 2}
    
    def sort_key(r: SearchResult) -> tuple:
        try:
            domain = urlparse(r.url).netloc.lower().replace('www.', '')
            authority = calculate_domain_authority(domain)
        except Exception:
            authority = 0.5
        
        return (
            -r.relevance_score,  # Higher relevance first
            source_priority.get(r.source, 99),  # Source priority
            -authority,  # Higher authority first
        )
    
    unique_results.sort(key=sort_key)
    
    return unique_results[:max_results]


async def summarize_search_results(
    query: str,
    results: List[Dict[str, Any]],
    max_summary_length: int = 200,
) -> str:
    """
    Summarize search results using AI
    """
    if not results or len(results) == 0:
        return "No search results to summarize."
    
    # Build context from top results
    top_results = results[:5]  # Use top 5 results
    context_parts = [f"Query: {query}\n\nSearch Results:"]
    
    for idx, result in enumerate(top_results, 1):
        context_parts.append(
            f"{idx}. {result.get('title', 'Untitled')}\n"
            f"   URL: {result.get('url', '')}\n"
            f"   Snippet: {result.get('snippet', '')[:200]}"
        )
    
    context = "\n\n".join(context_parts)
    
    # Try to get AI client
    try:
        from apps.api.openai_client import get_openai_client
        from apps.api.huggingface_client import get_huggingface_client
        from apps.api.ollama_client import get_ollama_client
        
        openai = get_openai_client()
        openai_available = await openai.check_available()
        
        hf = get_huggingface_client()
        hf_available = await hf.check_available()
        
        ollama = get_ollama_client()
        ollama_available = await ollama.check_available()
        
        if not openai_available and not hf_available and not ollama_available:
            # Fallback to simple summary
            return generate_fallback_summary(query, results)
        
        # Build prompt
        system_prompt = "You are a search assistant. Summarize search results concisely."
        user_prompt = f"""Based on these search results, provide a {max_summary_length}-word summary answering: "{query}"

{context}

Provide a concise summary that synthesizes information from the top results."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        
        # Try AI backends
        if openai_available:
            summary_text = ""
            async for chunk in openai.stream_chat(
                messages=messages,
                model="gpt-4o-mini",
                temperature=0.5,
                max_tokens=max_summary_length,
            ):
                if chunk.get("text"):
                    summary_text += chunk["text"]
                if chunk.get("done"):
                    break
            return summary_text or generate_fallback_summary(query, results)
        
        elif hf_available:
            summary_text = ""
            async for chunk in hf.stream_chat(
                messages=messages,
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                temperature=0.5,
                max_tokens=max_summary_length,
            ):
                if chunk.get("text"):
                    summary_text += chunk["text"]
                if chunk.get("done"):
                    break
            return summary_text or generate_fallback_summary(query, results)
        
        else:
            response = await ollama.chat(
                messages=messages,
                model="llama3.2",
                temperature=0.5,
                max_tokens=max_summary_length,
            )
            answer = response.get("message", {}).get("content", "")
            return answer or generate_fallback_summary(query, results)
    
    except Exception as e:
        logger.warning(f"AI summarization failed: {e}")
        return generate_fallback_summary(query, results)


def generate_fallback_summary(query: str, results: List[Dict[str, Any]]) -> str:
    """
    Generate a simple fallback summary without AI
    """
    if not results:
        return f"No results found for '{query}'."
    
    top_domains = {}
    for result in results[:5]:
        domain = result.get('domain', '')
        if domain:
            top_domains[domain] = top_domains.get(domain, 0) + 1
    
    domain_list = ", ".join(list(top_domains.keys())[:3])
    
    return f"Found {len(results)} results for '{query}' from sources including {domain_list}. Top results cover: {', '.join([r.get('title', '')[:30] for r in results[:3]])}."


async def aggregate_search(
    query: str,
    sources: List[str] = None,
    max_results: int = 20,
    bing_api_key: Optional[str] = None,
    include_summary: bool = False,
    summary_length: int = 200,
) -> Any:  # Returns List[Dict] or Dict[str, Any] depending on include_summary
    """
    Aggregate search results from multiple sources with optional AI summarization
    
    Returns:
        If include_summary=False: List[Dict] (backward compatible)
        If include_summary=True: Dict with 'results' and 'summary' keys
    """
    if sources is None:
        sources = ['duckduckgo', 'bing']
    
    # Search all sources in parallel
    search_tasks = []
    
    if 'duckduckgo' in sources:
        search_tasks.append(search_duckduckgo(query, max_results=max_results))
    
    if 'bing' in sources:
        search_tasks.append(search_bing(query, max_results=max_results, api_key=bing_api_key))
    
    # Wait for all searches to complete
    all_results_lists = await asyncio.gather(*search_tasks, return_exceptions=True)
    
    # Flatten results
    all_results: List[SearchResult] = []
    for results_list in all_results_lists:
        if isinstance(results_list, list):
            all_results.extend(results_list)
        elif isinstance(results_list, Exception):
            logger.debug(f"Search source failed: {results_list}")
    
    # Rank and deduplicate
    ranked_results = rank_and_deduplicate_results(all_results, query, max_results)
    
    # Convert to dict format with enhanced metadata
    results = [
        {
            'title': r.title,
            'url': r.url,
            'snippet': r.snippet,
            'source': r.source,
            'relevance_score': round(r.relevance_score, 3),
            'rank': idx + 1,
            'domain': urlparse(r.url).netloc if r.url else '',
        }
        for idx, r in enumerate(ranked_results)
    ]
    
    # Generate AI summary if requested
    if include_summary:
        summary = await summarize_search_results(query, results, summary_length)
        return {
            'results': results,
            'summary': summary,
            'query': query,
            'total_results': len(results),
        }
    
    # Backward compatible: return list if summary not requested
    return results

