"""
Agent Routes - Plan, Run, Stream via SSE
"""

import asyncio
import hashlib
import json
import logging
from typing import Optional, Dict

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from apps.api.security import get_current_user
from apps.api.models import User
from apps.api.ollama_client import get_ollama_client
from apps.api.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

router = APIRouter()

# Circuit breaker for Ollama (simple implementation)
class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = "closed"  # closed, open, half_open

    def record_success(self):
        """Record successful call"""
        self.failure_count = 0
        self.state = "closed"

    def record_failure(self):
        """Record failed call"""
        import time
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")

    def can_attempt(self) -> bool:
        """Check if we can attempt a call"""
        import time
        if self.state == "closed":
            return True
        if self.state == "open":
            if self.last_failure_time and (time.time() - self.last_failure_time) > self.timeout:
                self.state = "half_open"
                logger.info("Circuit breaker entering half-open state")
                return True
            return False
        # half_open
        return True

ollama_circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=60)

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
    """Start agent run with caching and error resilience"""
    import time
    
    run_id = f"run_{len(runs_db)}"
    goal = request.goal or ""
    
    # Check cache for identical queries (cache key based on goal hash)
    cache_key = None
    if goal:
        goal_hash = hashlib.sha256(goal.encode()).hexdigest()[:16]
        cache_key = f"agent:run:cache:{goal_hash}"
        cached_result = await cache_get(cache_key)
        if cached_result:
            logger.info(f"Cache hit for goal: {goal[:50]}...")
            # Return cached run ID or create new run with cached response
            # For now, we'll still create a new run but could optimize further
    
    run = {
        "id": run_id,
        "plan_id": request.plan_id,
        "goal": goal,
        "status": "running",
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "owner_id": current_user.id,
    }
    
    runs_db[run_id] = run

    stream_queue: asyncio.Queue = asyncio.Queue()
    run_streams[run_id] = stream_queue
    task = asyncio.create_task(_simulate_run(run_id, stream_queue, goal, cache_key))
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

async def _simulate_run(run_id: str, queue: asyncio.Queue, goal: str, cache_key: Optional[str] = None) -> None:
    """
    Real agent run with Ollama streaming (with fallback to simulation).
    Includes caching, retry logic, and circuit breaker for resilience.
    """
    total_tokens = 0
    loop = asyncio.get_running_loop()
    timestamp_ms = lambda: int(loop.time() * 1000)
    
    # Check cache first
    cached_response = None
    if cache_key:
        cached_response = await cache_get(cache_key)
        if cached_response:
            try:
                cached_data = json.loads(cached_response)
                logger.info(f"Using cached response for run {run_id}")
                # Stream cached response
                await queue.put({
                    "type": "start",
                    "run_id": run_id,
                    "message": f"Redix is analysing '{goal or 'this task'}' (cached response)",
                    "timestamp": timestamp_ms(),
                })
                await queue.put({
                    "type": "step",
                    "run_id": run_id,
                    "step": 1,
                    "status": "running",
                    "delta": cached_data.get("response", ""),
                    "tokens": cached_data.get("tokens", 0),
                    "timestamp": timestamp_ms(),
                })
                await queue.put({
                    "type": "done",
                    "run_id": run_id,
                    "message": "Response served from cache",
                    "timestamp": timestamp_ms(),
                })
                runs_db[run_id]["status"] = "completed"
                runs_db[run_id]["total_tokens"] = cached_data.get("tokens", 0)
                return
            except Exception as e:
                logger.warning(f"Failed to parse cached response: {e}")
                # Continue with normal flow
    
    # Get Ollama client
    ollama = get_ollama_client()
    
    # Check circuit breaker
    use_ollama = ollama_circuit_breaker.can_attempt()
    is_available = False
    
    if use_ollama:
        try:
            is_available = await ollama.check_available()
            if not is_available:
                ollama_circuit_breaker.record_failure()
        except Exception as e:
            logger.error(f"Ollama check failed: {e}")
            ollama_circuit_breaker.record_failure()
            use_ollama = False
    
    mode_label = "simulation mode"
    if use_ollama and is_available:
        mode_label = "using Ollama"
    elif not ollama_circuit_breaker.can_attempt():
        mode_label = "circuit breaker open (simulation)"
    
    await queue.put({
        "type": "start",
        "run_id": run_id,
        "message": f"Redix is analysing '{goal or 'this task'}' ({mode_label})",
        "timestamp": timestamp_ms(),
    })

    # Prepare messages for Ollama
    messages = [
        {
            "role": "system",
            "content": "You are Redix, an AI assistant for Regen. Provide helpful, concise answers with citations when relevant.",
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

    accumulated_text = ""
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            if use_ollama and is_available:
                # Try Ollama with retry logic
                async for chunk in ollama.stream_chat(
                    messages=messages,
                    model="llama3.2",
                    temperature=0.7,
                    max_tokens=2048,
                ):
                    if chunk.get("error"):
                        error_msg = chunk["error"]
                        logger.error(f"Ollama error: {error_msg}")
                        
                        if retry_count < max_retries - 1:
                            retry_count += 1
                            await queue.put({
                                "type": "step",
                                "run_id": run_id,
                                "step": 2,
                                "status": "running",
                                "message": f"Retrying... ({retry_count}/{max_retries - 1})",
                                "timestamp": timestamp_ms(),
                            })
                            await asyncio.sleep(1)  # Brief delay before retry
                            break  # Break inner loop, retry outer loop
                        else:
                            ollama_circuit_breaker.record_failure()
                            await queue.put({
                                "type": "error",
                                "run_id": run_id,
                                "message": f"AI error after {max_retries} retries: {error_msg}",
                                "timestamp": timestamp_ms(),
                            })
                            # Fall through to simulation
                            use_ollama = False
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
                        # Success - record it
                        ollama_circuit_breaker.record_success()
                        break
                
                if accumulated_text or chunk.get("done"):
                    break  # Success, exit retry loop
            else:
                # Fallback to simulation
                break
                
        except Exception as e:
            logger.error(f"Agent run error (attempt {retry_count + 1}/{max_retries}): {e}")
            ollama_circuit_breaker.record_failure()
            
            if retry_count < max_retries - 1:
                retry_count += 1
                await queue.put({
                    "type": "step",
                    "run_id": run_id,
                    "step": 2,
                    "status": "running",
                    "message": f"Error occurred, retrying... ({retry_count}/{max_retries - 1})",
                    "timestamp": timestamp_ms(),
                })
                await asyncio.sleep(2 ** retry_count)  # Exponential backoff
                use_ollama = False  # Fallback to simulation
            else:
                await queue.put({
                    "type": "error",
                    "run_id": run_id,
                    "message": f"Run failed after {max_retries} attempts: {str(e)}",
                    "timestamp": timestamp_ms(),
                })
                break
    
    # If we still don't have text, use simulation fallback
    if not accumulated_text and not use_ollama:
        logger.info(f"Falling back to simulation for run {run_id}")
        await queue.put({
            "type": "step",
            "run_id": run_id,
            "step": 2,
            "status": "running",
            "message": "Using simulation mode (Ollama unavailable)",
            "timestamp": timestamp_ms(),
        })
        # Simulate a response
        simulated_text = f"Based on your request '{goal}', here's a simulated response. For real AI responses, ensure Ollama is running."
        accumulated_text = simulated_text
        total_tokens = len(simulated_text) // 4
        
        for word in simulated_text.split():
            await asyncio.sleep(0.05)
            await queue.put({
                "type": "step",
                "run_id": run_id,
                "step": 2,
                "status": "running",
                "delta": word + " ",
                "tokens": 1,
                "timestamp": timestamp_ms(),
            })

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

    # Cache the response if we got a real one
    if accumulated_text and cache_key and use_ollama and is_available:
        cache_data = {
            "response": accumulated_text,
            "tokens": total_tokens,
            "timestamp": timestamp_ms(),
        }
        await cache_set(cache_key, json.dumps(cache_data), ttl_seconds=3600)  # Cache for 1 hour
        logger.info(f"Cached response for run {run_id}")
    
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

