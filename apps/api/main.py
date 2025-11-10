"""
OmniBrowser API Server - FastAPI Backend
REST + WebSocket API for desktop and mobile clients
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
import uvicorn

from apps.api.routes import auth, workspaces, agent, downloads, notes, search, sentinel
from apps.api.database import init_db, get_db

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("OmniBrowser API Server starting...")
    init_db()  # Initialize database tables
    yield
    # Shutdown
    print("OmniBrowser API Server shutting down...")

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

