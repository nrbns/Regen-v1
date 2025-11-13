"""
SSE Streaming Endpoint
"""

from fastapi import APIRouter, Request, HTTPException
from sse_starlette.sse import EventSourceResponse
from typing import Dict
import asyncio
import json

from app.services.retrieval import RetrievalService

router = APIRouter()

# In-memory store for query results (in production, use Redis)
query_streams: Dict[str, asyncio.Queue] = {}


@router.get("/stream")
async def stream_query_results(request: Request, query_id: str):
    """
    SSE endpoint for streaming query results.
    """
    if query_id not in query_streams:
        raise HTTPException(status_code=404, detail="Query not found")
    
    queue = query_streams[query_id]
    
    async def event_generator():
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                try:
                    # Get next event from queue (with timeout)
                    event = await asyncio.wait_for(queue.get(), timeout=1.0)
                    
                    if event is None:  # End of stream
                        yield {
                            "event": "complete",
                            "data": json.dumps({"query_id": query_id, "status": "completed"}),
                        }
                        break
                    
                    yield event
                    
                except asyncio.TimeoutError:
                    # Send heartbeat
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({"query_id": query_id}),
                    }
                    continue
                    
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"query_id": query_id, "error": str(e)}),
            }
        finally:
            # Cleanup
            if query_id in query_streams:
                del query_streams[query_id]
    
    return EventSourceResponse(event_generator())


def get_stream_queue(query_id: str) -> asyncio.Queue:
    """Get or create stream queue for query_id"""
    if query_id not in query_streams:
        query_streams[query_id] = asyncio.Queue()
    return query_streams[query_id]

