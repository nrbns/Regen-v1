"""
OmniBrowser API Server - FastAPI Backend
REST + WebSocket API for desktop and mobile clients
"""

import asyncio
import random
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from apps.api.routes import auth, workspaces, agent, downloads, notes, search, sentinel, redix
from apps.api.database import init_db

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()
metrics_manager = ConnectionManager()
metrics_task: asyncio.Task | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("OmniBrowser API Server starting...")
    init_db()  # Initialize database tables
    global metrics_task
    metrics_task = asyncio.create_task(metrics_publisher())
    yield
    # Shutdown
    print("OmniBrowser API Server shutting down...")
    if metrics_task:
        metrics_task.cancel()
        with suppress(asyncio.CancelledError):
            await metrics_task

app = FastAPI(
    title="OmniBrowser API",
    description="REST + WebSocket API for OmniBrowser",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(downloads.router, prefix="/downloads", tags=["downloads"])
app.include_router(notes.router, prefix="/notes", tags=["notes"])
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(sentinel.router, prefix="/sentinel", tags=["sentinel"])
app.include_router(redix.router, prefix="/redix", tags=["redix"])

@app.get("/")
async def root():
    return {"message": "OmniBrowser API v1.0", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# WebSocket endpoint for real-time events
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Echo or handle client messages
            await websocket.send_json({"echo": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    await metrics_manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; any message from client is ignored.
            await websocket.receive_text()
    except WebSocketDisconnect:
        metrics_manager.disconnect(websocket)


async def metrics_publisher() -> None:
    """Broadcast real-time performance metrics to connected clients."""
    import psutil
    import os
    
    # Try to get real system metrics, fallback to mock if unavailable
    try:
        process = psutil.Process(os.getpid())
    except Exception:
        process = None
    
    while True:
        if metrics_manager.active_connections:
            loop = asyncio.get_running_loop()
            
            try:
                if process:
                    # Real metrics from system
                    cpu_percent = process.cpu_percent(interval=0.1) or 0.0
                    memory_info = process.memory_info()
                    memory_mb = memory_info.rss / (1024 * 1024)  # Convert to MB
                    
                    # System-wide CPU (if available)
                    try:
                        system_cpu = psutil.cpu_percent(interval=0.1) or 0.0
                    except Exception:
                        system_cpu = cpu_percent
                    
                    # Carbon intensity (mock for now, can be enhanced with real API)
                    # Default to US average (~400 gCO₂/kWh) with some variation
                    carbon_intensity = round(random.uniform(350, 450), 1)
                else:
                    # Fallback to mock metrics
                    cpu_percent = round(random.uniform(7.0, 32.0), 2)
                    memory_mb = round(random.uniform(1.2, 5.5), 2)
                    system_cpu = cpu_percent
                    carbon_intensity = round(random.uniform(140, 360), 1)
                
                payload = {
                    "type": "metrics",
                    "cpu": round(cpu_percent, 2),
                    "system_cpu": round(system_cpu, 2),
                    "memory": round(memory_mb, 2),
                    "carbon_intensity": carbon_intensity,
                    "timestamp": int(loop.time() * 1000),
                }
                await metrics_manager.broadcast(payload)
            except Exception as e:
                # Fallback to mock on any error
                payload = {
                    "type": "metrics",
                    "cpu": round(random.uniform(7.0, 32.0), 2),
                    "system_cpu": round(random.uniform(10.0, 40.0), 2),
                    "memory": round(random.uniform(1.2, 5.5), 2),
                    "carbon_intensity": round(random.uniform(140, 360), 1),
                    "timestamp": int(loop.time() * 1000),
                    "error": str(e) if isinstance(e, Exception) else "unknown",
                }
                await metrics_manager.broadcast(payload)
        await asyncio.sleep(2)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

