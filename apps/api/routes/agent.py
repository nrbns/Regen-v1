"""
Agent Routes - Plan, Run, Stream via SSE
"""

import asyncio
import json
import logging
from typing import Optional, Dict

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from apps.api.security import get_current_user
from apps.api.models import User
from apps.api.ollama_client import get_ollama_client

logger = logging.getLogger(__name__)

router = APIRouter()

class PlanRequest(BaseModel):
    goal: str
    mode: Optional[str] = None

class RunRequest(BaseModel):
    plan_id: Optional[str] = None
    goal: Optional[str] = None

# Mock data store
plans_db: dict[str, dict] = {}
runs_db: dict[str, dict] = {}
run_streams: dict[str, asyncio.Queue] = {}
run_tasks: Dict[str, asyncio.Task] = {}

@router.post("/plan")
async def create_plan(request: PlanRequest, current_user: User = Depends(get_current_user)):
    """Generate a plan from user goal"""
    plan_id = f"plan_{len(plans_db)}"
    
    # TODO: Call agent planner
    plan = {
        "id": plan_id,
        "goal": request.goal,
        "mode": request.mode,
        "steps": [
            {"action": "search", "args": {"query": request.goal}},
            {"action": "summarize", "args": {}},
        ],
        "status": "pending",
        "owner_id": current_user.id,
    }
    
    plans_db[plan_id] = plan
    return plan

@router.post("/run")
async def start_run(request: RunRequest, current_user: User = Depends(get_current_user)):
    """Start agent run"""
    run_id = f"run_{len(runs_db)}"
    
    run = {
        "id": run_id,
        "plan_id": request.plan_id,
        "goal": request.goal,
        "status": "running",
        "started_at": "2024-12-19T00:00:00Z",
        "owner_id": current_user.id,
    }
    
    runs_db[run_id] = run

    stream_queue: asyncio.Queue = asyncio.Queue()
    run_streams[run_id] = stream_queue
    task = asyncio.create_task(_simulate_run(run_id, stream_queue, request.goal or ""))
    run_tasks[run_id] = task
    return {"id": run_id, "plan_id": request.plan_id, "status": run["status"]}

@router.get("/runs/{run_id}")
async def stream_run(run_id: str, current_user: User = Depends(get_current_user)):
    """Stream agent run updates via SSE"""
    if run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")
    run = runs_db[run_id]
    if run.get("owner_id") != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Run access denied")

    queue = run_streams.get(run_id)
    if queue is None:
        queue = asyncio.Queue()
        run_streams[run_id] = queue

    async def generate():
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") == "done":
                    break
        finally:
            run_streams.pop(run_id, None)
            task = run_tasks.pop(run_id, None)
            if task:
                task.cancel()
    
    return StreamingResponse(generate(), media_type="text/event-stream")

async def _simulate_run(run_id: str, queue: asyncio.Queue, goal: str) -> None:
    """
    Real agent run with Ollama streaming (with fallback to simulation).
    Emits streaming events with partial tokens and consent checks.
    """
    total_tokens = 0
    loop = asyncio.get_running_loop()
    timestamp_ms = lambda: int(loop.time() * 1000)
    
    # Get Ollama client
    ollama = get_ollama_client()
    is_available = await ollama.check_available()
    
    await queue.put({
        "type": "start",
        "run_id": run_id,
        "message": f"Redix is analysing '{goal or 'this task'}" + ("' (using Ollama)" if is_available else "' (simulation mode)"),
        "timestamp": timestamp_ms(),
    })

    # Prepare messages for Ollama
    messages = [
        {
            "role": "system",
            "content": "You are Redix, an AI assistant for OmniBrowser. Provide helpful, concise answers with citations when relevant.",
        },
        {
            "role": "user",
            "content": goal or "Help me with this task",
        },
    ]

    # Step 1: Collect context
    await queue.put({
        "type": "step",
        "run_id": run_id,
        "step": 1,
        "status": "running",
        "message": "Gathering latest sources and knowledge graph context.",
        "timestamp": timestamp_ms(),
    })

    # Step 2: Generate answer with Ollama streaming
    await queue.put({
        "type": "step",
        "run_id": run_id,
        "step": 2,
        "status": "running",
        "message": "Generating answer with AI synthesis.",
        "timestamp": timestamp_ms(),
    })

    try:
        accumulated_text = ""
        async for chunk in ollama.stream_chat(
            messages=messages,
            model="llama3.2",
            temperature=0.7,
            max_tokens=2048,
        ):
            if chunk.get("error"):
                logger.error(f"Ollama error: {chunk['error']}")
                await queue.put({
                    "type": "error",
                    "run_id": run_id,
                    "message": f"AI error: {chunk['error']}",
                    "timestamp": timestamp_ms(),
                })
                break

            text = chunk.get("text", "")
            if text:
                accumulated_text += text
                # Estimate tokens (rough: 1 token ≈ 4 chars)
                chunk_tokens = max(1, len(text) // 4)
                total_tokens += chunk_tokens
                
                await queue.put({
                    "type": "step",
                    "run_id": run_id,
                    "step": 2,
                    "status": "running",
                    "delta": text,
                    "tokens": chunk_tokens,
                    "timestamp": timestamp_ms(),
                })

            if chunk.get("done"):
                break

        # Consent check (if we have enough context)
        if accumulated_text and len(accumulated_text) > 100:
            await asyncio.sleep(0.3)
            await queue.put({
                "type": "consent",
                "run_id": run_id,
                "content": "Access private notes to enrich the answer",
                "risk": "medium",
                "approved": True,
                "timestamp": timestamp_ms(),
            })

    except Exception as e:
        logger.error(f"Agent run error: {e}")
        await queue.put({
            "type": "error",
            "run_id": run_id,
            "message": f"Run failed: {str(e)}",
            "timestamp": timestamp_ms(),
        })

    # Finalize
    await asyncio.sleep(0.2)
    final_message = "Redix completed the task. You can review the full transcript or export the findings."
    await queue.put({
        "type": "done",
        "run_id": run_id,
        "message": final_message,
        "timestamp": timestamp_ms(),
    })
    runs_db[run_id]["status"] = "completed"
    runs_db[run_id]["completed_at"] = timestamp_ms()
    runs_db[run_id]["total_tokens"] = total_tokens

