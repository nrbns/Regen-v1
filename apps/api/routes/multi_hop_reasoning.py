"""
Multi-Hop Reasoning for AI Search
Enables the AI to break down complex queries into multiple search steps
and synthesize answers from multiple sources
"""

import asyncio
import json
import logging
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from apps.api.ollama_client import get_ollama_client
from apps.api.huggingface_client import get_huggingface_client
from apps.api.openai_client import get_openai_client
from apps.api.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

router = APIRouter()

class MultiHopRequest(BaseModel):
    query: str
    max_hops: int = 3
    session_id: Optional[str] = None
    stream: bool = True


class SearchStep:
    """Represents a single search step in multi-hop reasoning"""
    def __init__(self, query: str, reasoning: str, sources: List[Dict[str, Any]] = None):
        self.query = query
        self.reasoning = reasoning
        self.sources = sources or []
        self.answer: Optional[str] = None


async def search_web(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """
    Search the web for a query using enhanced aggregated search engines
    """
    try:
        from apps.api.services.search_aggregator import aggregate_search
        import os
        
        # Get Bing API key from environment if available
        bing_api_key = os.getenv('BING_API_KEY')
        
        # Aggregate results from DuckDuckGo and Bing with enhanced ranking
        results = await aggregate_search(
            query=query,
            sources=['duckduckgo', 'bing'],
            max_results=max_results,
            bing_api_key=bing_api_key,
        )
        
        # Results are already ranked and deduplicated by aggregate_search
        return results
    except Exception as e:
        logger.debug(f"Web search failed: {e}")
        # Fallback to basic DuckDuckGo search
        try:
            import aiohttp
            from urllib.parse import quote_plus
            async with aiohttp.ClientSession() as session:
                url = f"https://api.duckduckgo.com/?q={quote_plus(query)}&format=json&no_html=1&skip_disambig=1"
                async with session.get(url, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        results = []
                        if data.get('AbstractText'):
                            results.append({
                                'title': data.get('Heading', query),
                                'snippet': data.get('AbstractText', ''),
                                'url': data.get('AbstractURL', ''),
                                'source': 'duckduckgo',
                                'relevance_score': 0.9,
                                'rank': 1,
                            })
                        return results
        except Exception as e2:
            logger.debug(f"Fallback search failed: {e2}")
    
    return []


async def decompose_query(query: str, ai_client, is_openai: bool = False, is_hf: bool = False) -> List[SearchStep]:
    """
    Use LLM to decompose a complex query into search steps
    """
    prompt = f"""Break down this complex query into 2-3 simpler search queries that need to be answered in sequence:

Query: "{query}"

Return a JSON array of search steps, each with:
- "query": the search query to run
- "reasoning": why this step is needed

Example format:
[
  {{"query": "first search query", "reasoning": "We need to find X first"}},
  {{"query": "second search query", "reasoning": "Then we can find Y"}}
]

Return only valid JSON, no markdown or explanation."""

    try:
        messages = [
            {"role": "system", "content": "You are a query decomposition assistant. Break complex queries into simpler search steps."},
            {"role": "user", "content": prompt}
        ]
        
        # Use AI client (OpenAI, Hugging Face, or Ollama)
        if is_openai:
            # OpenAI client - use streaming
            response_text = ""
            async for chunk in ai_client.stream_chat(messages=messages, model="gpt-4o-mini", temperature=0.3):
                if chunk.get("text"):
                    response_text += chunk["text"]
                if chunk.get("done"):
                    break
            text = response_text
        elif is_hf:
            # Hugging Face client
            response_text = ""
            async for chunk in ai_client.stream_chat(messages=messages, model="meta-llama/Meta-Llama-3-8B-Instruct", temperature=0.3):
                if chunk.get("text"):
                    response_text += chunk["text"]
                if chunk.get("done"):
                    break
            text = response_text
        else:
            # Ollama client
            response = await ai_client.chat(messages=messages, model="llama3.2", temperature=0.3)
            text = response.get("message", {}).get("content", "")
        
        # Extract JSON from response
        import re
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if json_match:
            steps_data = json.loads(json_match.group())
            return [SearchStep(step['query'], step.get('reasoning', '')) for step in steps_data]
    except Exception as e:
        logger.warn(f"Query decomposition failed: {e}")
    
    # Fallback: single step
    return [SearchStep(query, "Direct search")]


async def synthesize_answer(steps: List[SearchStep], original_query: str, ai_client, is_openai: bool = False, is_hf: bool = False) -> str:
    """
    Synthesize a final answer from multiple search steps
    """
    context = "\n\n".join([
        f"Step {i+1}: {step.query}\nSources: {json.dumps(step.sources[:3], indent=2)}\nAnswer: {step.answer or 'No answer found'}"
        for i, step in enumerate(steps)
    ])
    
    prompt = f"""Based on the following search steps and their results, provide a comprehensive answer to the original query.

Original Query: "{original_query}"

Search Steps and Results:
{context}

Provide a clear, well-structured answer that synthesizes information from all steps. Include citations where relevant."""

    try:
        messages = [
            {"role": "system", "content": "You are a research assistant that synthesizes information from multiple sources."},
            {"role": "user", "content": prompt}
        ]
        
        # Use AI client for synthesis (OpenAI, Hugging Face, or Ollama)
        if is_openai:
            # OpenAI
            answer_text = ""
            async for chunk in ai_client.stream_chat(messages=messages, model="gpt-4o-mini", temperature=0.5):
                if chunk.get("text"):
                    answer_text += chunk["text"]
                if chunk.get("done"):
                    break
            return answer_text or "Unable to synthesize answer."
        elif is_hf:
            # Hugging Face
            answer_text = ""
            async for chunk in ai_client.stream_chat(messages=messages, model="meta-llama/Meta-Llama-3-8B-Instruct", temperature=0.5):
                if chunk.get("text"):
                    answer_text += chunk["text"]
                if chunk.get("done"):
                    break
            return answer_text or "Unable to synthesize answer."
        else:
            # Ollama
            response = await ai_client.chat(messages=messages, model="llama3.2", temperature=0.5)
            return response.get("message", {}).get("content", "Unable to synthesize answer.")
    except Exception as e:
        logger.warn(f"Answer synthesis failed: {e}")
        return "Unable to synthesize answer from search results."


@router.post("/multi-hop")
async def multi_hop_reasoning(
    request: MultiHopRequest,
):
    """
    Multi-hop reasoning: break down complex queries and synthesize answers
    """
    openai = get_openai_client()
    openai_available = await openai.check_available()
    
    hf = get_huggingface_client()
    hf_available = await hf.check_available()
    
    ollama = get_ollama_client()
    ollama_available = await ollama.check_available()
    
    if not openai_available and not hf_available and not ollama_available:
        return {
            "error": "AI services unavailable. Please check your OpenAI, Hugging Face API key, or start Ollama.",
            "ready": False
        }
    
    async def generate():
        try:
            # Choose AI client (prefer OpenAI, then Hugging Face, then Ollama)
            if openai_available:
                ai_client = openai
                is_openai = True
                is_hf = False
            elif hf_available:
                ai_client = hf
                is_openai = False
                is_hf = True
            else:
                ai_client = ollama
                is_openai = False
                is_hf = False
            
            yield f"data: {json.dumps({'type': 'start', 'message': 'Analyzing query...'})}\n\n"
            
            # Step 1: Decompose query
            yield f"data: {json.dumps({'type': 'step', 'step': 'decompose', 'message': 'Breaking down query into search steps...'})}\n\n"
            steps = await decompose_query(request.query, ai_client, is_openai, is_hf)
            
            if len(steps) == 1:
                # Simple query, single hop
                step = steps[0]
                yield f"data: {json.dumps({'type': 'step', 'step': 'search', 'query': step.query, 'message': f'Searching: {step.query}'})}\n\n"
                
                step.sources = await search_web(step.query)
                
                # Generate answer from sources
                yield f"data: {json.dumps({'type': 'step', 'step': 'answer', 'message': 'Generating answer...'})}\n\n"
                
                sources_text = "\n".join([f"- {s.get('title', '')}: {s.get('snippet', '')[:200]}" for s in step.sources[:5]])
                answer_prompt = f"""Based on these search results, answer the query: "{request.query}"

Search Results:
{sources_text}

Provide a clear, concise answer."""

                messages = [
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on search results."},
                    {"role": "user", "content": answer_prompt}
                ]
                
                # Use AI client for streaming
                model = "gpt-4o-mini" if is_openai else ("meta-llama/Meta-Llama-3-8B-Instruct" if is_hf else "llama3.2")
                async for chunk in ai_client.stream_chat(messages=messages, model=model, temperature=0.5):
                    if chunk.get("error"):
                        yield f"data: {json.dumps({'type': 'error', 'text': chunk['error'], 'done': True})}\n\n"
                        break
                    
                    text = chunk.get("text", "")
                    if text:
                        yield f"data: {json.dumps({'type': 'token', 'text': text})}\n\n"
                    
                    if chunk.get("done"):
                        break
                
                yield f"data: {json.dumps({'type': 'done', 'sources': step.sources, 'done': True})}\n\n"
            else:
                # Multi-hop: execute steps sequentially
                for i, step in enumerate(steps):
                    yield f"data: {json.dumps({'type': 'step', 'step': f'hop_{i+1}', 'query': step.query, 'message': f'Step {i+1}/{len(steps)}: {step.query}'})}\n\n"
                    
                    # Search for this step
                    step.sources = await search_web(step.query)
                    
                    # Generate intermediate answer
                    if step.sources:
                        sources_text = "\n".join([f"- {s.get('title', '')}: {s.get('snippet', '')[:200]}" for s in step.sources[:3]])
                        answer_prompt = f"Based on these search results, provide a brief answer to: {step.query}\n\n{sources_text}"
                        
                        messages = [
                            {"role": "system", "content": "You are a research assistant."},
                            {"role": "user", "content": answer_prompt}
                        ]
                        
                        # Use AI client for chat
                        if is_openai:
                            # OpenAI
                            answer_text = ""
                            async for chunk in ai_client.stream_chat(messages=messages, model="gpt-4o-mini", temperature=0.3):
                                if chunk.get("text"):
                                    answer_text += chunk["text"]
                                if chunk.get("done"):
                                    break
                            step.answer = answer_text
                        elif is_hf:
                            # Hugging Face
                            answer_text = ""
                            async for chunk in ai_client.stream_chat(messages=messages, model="meta-llama/Meta-Llama-3-8B-Instruct", temperature=0.3):
                                if chunk.get("text"):
                                    answer_text += chunk["text"]
                                if chunk.get("done"):
                                    break
                            step.answer = answer_text
                        else:
                            # Ollama
                            response = await ai_client.chat(messages=messages, model="llama3.2", temperature=0.3)
                            step.answer = response.get("message", {}).get("content", "")
                    
                    yield f"data: {json.dumps({'type': 'hop_result', 'hop': i+1, 'answer': step.answer or 'No answer found', 'sources': step.sources})}\n\n"
                
                # Synthesize final answer
                yield f"data: {json.dumps({'type': 'step', 'step': 'synthesize', 'message': 'Synthesizing final answer...'})}\n\n"
                
                final_answer = await synthesize_answer(steps, request.query, ai_client, is_openai, is_hf)
                
                # Stream the final answer
                for char in final_answer:
                    yield f"data: {json.dumps({'type': 'token', 'text': char})}\n\n"
                    await asyncio.sleep(0.01)  # Small delay for streaming effect
                
                # Collect all sources
                all_sources = []
                for step in steps:
                    all_sources.extend(step.sources)
                
                yield f"data: {json.dumps({'type': 'done', 'sources': all_sources[:10], 'hops': len(steps), 'done': True})}\n\n"
        
        except Exception as e:
            logger.error(f"Multi-hop reasoning error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'text': f'Error: {str(e)}', 'done': True})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
