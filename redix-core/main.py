"""
Redix Green Intelligence Engine - FastAPI Gateway
Regenerative AI backend with eco-scoring, model fusion, and consent ledger
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import asyncio
import psutil
import os
import time
import json
from datetime import datetime

# Local imports (LangChain is used in cognitive/router.py)
from cognitive.router import get_fusion_chain
from eco.scorer import EcoScorer
from ethics.consent import ConsentLedger
from deployment.ollama_local import OllamaLocal

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Redix Green Intelligence Engine",
    version="0.1.0",
    description="Regenerative AI backend with eco-scoring and ethical consent"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev
        "http://localhost:3000",  # Alternative dev port
        "http://localhost:5174",  # Vite preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
scorer = EcoScorer()
ledger = ConsentLedger()
ollama_local = OllamaLocal()

# Request/Response models
class QueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None  # Tab URL, title, etc.
    workflowType: Optional[str] = "rag"  # rag, research, multi-agent
    options: Optional[Dict[str, Any]] = {}  # maxTokens, temperature, useOllama, etc.

class AskRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None
    options: Optional[Dict[str, Any]] = {}

class MetricsResponse(BaseModel):
    cpu: float
    memory: float
    greenScore: Optional[float] = None
    timestamp: float

class ConsentRequest(BaseModel):
    userId: str
    action: str
    approved: bool
    context: Optional[str] = ""

# Sense: Input processing with device metrics
def sense_input(query: str, context: Optional[Dict] = None) -> Dict[str, Any]:
    """Sense: Collect device state and optimize input"""
    device_metrics = scorer.sense_device()
    
    # Optimize: Trim prompt if too long
    optimized_prompt = scorer.optimize_prompt(query, mode="default")
    
    # Check battery for local fallback
    battery = device_metrics.get('battery', 100)
    use_local = battery < 30 or device_metrics.get('cpu', 0) > 80
    
    return {
        "prompt": optimized_prompt,
        "context": context,
        "device_metrics": device_metrics,
        "use_local": use_local,
        "eco_note": "Local mode for battery save" if battery < 30 else None
    }

# Optimize: Model routing
async def optimize_route(sensed: Dict, options: Dict) -> Dict:
    """Optimize: Route to best model based on context"""
    use_ollama = options.get('useOllama', False) or sensed.get('use_local', False)
    
    if use_ollama:
        return {
            "model": "ollama",
            "llm": ollama_local,
            "note": "Using local Ollama for efficiency"
        }
    
    # Use fusion chain for cloud models
    return {
        "model": "fusion",
        "chain": get_fusion_chain(),
        "note": "Using multi-model fusion"
    }

# Regenerate: Output with eco-scoring
def regenerate_output(result: str, tokens: int, is_local: bool) -> Dict:
    """Regenerate: Score output and add eco metrics"""
    scored = scorer.regenerate_score(tokens, is_local=is_local)
    
    return {
        "text": result,
        "greenScore": scored["green_score"],
        "energyWh": scored["energy_wh"],
        "savedCo2g": scored.get("saved_co2_g", 0),
        "recommendation": scored.get("recommendation", ""),
        "modelUsed": "ollama-local" if is_local else "fusion",
        "latency": time.time() - scorer.start_time if hasattr(scorer, 'start_time') else 0
    }

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "redix-core",
        "version": "0.1.0",
        "timestamp": time.time()
    }

@app.post("/ask")
async def ask_redix(request: AskRequest):
    """
    Main /ask endpoint - Single query with AI response
    """
    try:
        # Sense: Start eco measurement
        sensed = sense_input(request.query, request.context)
        is_local_mode = request.options.get('useOllama', False)
        scorer.start_sensing(is_local=is_local_mode)
        
        # Optimize: Route to best model
        route = await optimize_route(sensed, request.options or {})
        
        # Execute: Generate response
        if route["model"] == "ollama":
            result = ollama_local.generate(sensed["prompt"])
            is_local = True
        else:
            # Use fusion chain
            chain = route["chain"]
            try:
                chain_result = chain.invoke({
                    "input": sensed["prompt"],
                    "context": json.dumps(sensed["context"]) if sensed["context"] else "",
                    "criteria": "ethical"
                })
                # Handle different chain output formats
                if isinstance(chain_result, dict):
                    result = chain_result.get("output", chain_result.get("text", str(chain_result)))
                else:
                    result = str(chain_result)
            except Exception as e:
                # Fallback to Ollama if chain fails
                if ollama_local.is_available():
                    result = ollama_local.generate(sensed["prompt"])
                    is_local = True
                else:
                    raise e
            is_local = False
        
        # Regenerate: Count tokens and calculate eco score
        scorer.count_tokens(result)
        eco_data = scorer.end_sensing()
        
        # Combine response with eco data
        return {
            "text": result,
            "provider": route["model"],
            "greenScore": eco_data["eco_score"],
            "greenTier": eco_data["green_tier"],
            "tierColor": eco_data["tier_color"],
            "energyWh": eco_data["energy_wh"],
            "co2EmittedG": eco_data["co2_emitted_g"],
            "co2SavedG": eco_data["co2_saved_g"],
            "latency": eco_data["duration_ms"],
            "tokensUsed": eco_data["tokens"],
            "modelMode": eco_data["model_mode"],
            "recommendation": eco_data["recommendation"],
            "batteryLevel": eco_data.get("battery_level", 100)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redix error: {str(e)}")

@app.post("/workflow")
async def workflow_redix(request: QueryRequest):
    """
    /workflow endpoint - Agentic workflows (RAG, research, multi-agent)
    """
    try:
        workflow_type = request.workflowType or "rag"
        options = request.options or {}
        
        # Sense: Start eco measurement
        sensed = sense_input(request.query, request.context)
        is_local_mode = options.get('useOllama', False)
        scorer.start_sensing(is_local=is_local_mode)
        
        # Route based on workflow type
        chain = get_fusion_chain()
        context_str = json.dumps(request.context) if request.context else ""
        
        try:
            result = chain.invoke({
                "input": request.query,
                "context": context_str,
                "criteria": "ethical"
            })
            # Handle different chain output formats
            if isinstance(result, dict):
                result_text = result.get("output", result.get("text", str(result)))
            else:
                result_text = str(result)
            is_local = False
        except Exception as e:
            # Fallback to Ollama if chain fails
            if ollama_local.is_available():
                result_text = ollama_local.generate(request.query)
                is_local = True
                # Update sensing if we switched to local
                if not is_local_mode:
                    scorer.start_sensing(is_local=True)
            else:
                raise e
        
        # Regenerate: Count tokens and calculate eco score
        scorer.count_tokens(result_text)
        eco_data = scorer.end_sensing()
        
        return {
            "result": result_text,
            "steps": [],  # Can be enhanced with actual step tracking
            "greenScore": eco_data["eco_score"],
            "greenTier": eco_data["green_tier"],
            "tierColor": eco_data["tier_color"],
            "latency": eco_data["duration_ms"],
            "tokensUsed": eco_data["tokens"],
            "energyWh": eco_data["energy_wh"],
            "co2EmittedG": eco_data["co2_emitted_g"],
            "co2SavedG": eco_data["co2_saved_g"],
            "agentsUsed": ["fusion-chain"],
            "modelMode": eco_data["model_mode"],
            "recommendation": eco_data["recommendation"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow error: {str(e)}")

@app.get("/metrics")
async def get_metrics():
    """Get current system metrics"""
    device_metrics = scorer.sense_device()
    
    return MetricsResponse(
        cpu=device_metrics.get('cpu', 0),
        memory=device_metrics.get('ram', 0),
        greenScore=None,  # Can calculate from recent operations
        timestamp=time.time()
    )

@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """WebSocket endpoint for real-time metrics"""
    await websocket.accept()
    try:
        while True:
            device_metrics = scorer.sense_device()
            await websocket.send_json({
                "cpu": device_metrics.get('cpu', 0),
                "ram": device_metrics.get('ram', 0),
                "battery": device_metrics.get('battery', 100),
                "timestamp": time.time()
            })
            await asyncio.sleep(2)  # Update every 2 seconds
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Redix] WebSocket error: {e}")

@app.post("/consent")
async def log_consent(request: ConsentRequest):
    """Log consent for ethical tracking"""
    try:
        ledger.log_consent(
            user_id=request.userId,
            action=request.action,
            approved=request.approved,
            context=request.context
        )
        return {"status": "logged", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Consent logging failed: {str(e)}")

@app.get("/consent/{user_id}/{action}")
async def query_consent(user_id: str, action: str):
    """Query consent status"""
    approved = ledger.query_consent(user_id, action)
    return {"user_id": user_id, "action": action, "approved": approved}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("REDIX_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)

