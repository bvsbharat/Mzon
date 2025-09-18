"""
FastAPI Backend for Agentic News Discovery
Based on Event Hunter AI multi-agent architecture
"""
import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import logging
from contextlib import asynccontextmanager

from services.agent_orchestrator import AgentOrchestrator
from models.news_models import NewsDiscoveryRequest, NewsResponse, TagSubscriptionRequest
from services.websocket_manager import WebSocketManager

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances
agent_orchestrator = None
websocket_manager = WebSocketManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    global agent_orchestrator

    # Startup
    logger.info("Initializing Agentic News Discovery Backend...")
    agent_orchestrator = AgentOrchestrator()
    await agent_orchestrator.initialize()
    logger.info("Backend initialized successfully")

    yield

    # Shutdown
    logger.info("Shutting down backend...")
    if agent_orchestrator:
        await agent_orchestrator.cleanup()

# Create FastAPI app
app = FastAPI(
    title="Agentic News Discovery API",
    description="Multi-agent system for intelligent news discovery and social media content generation",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Agentic News Discovery API"}

@app.post("/api/news/discover", response_model=NewsResponse)
async def discover_news(request: NewsDiscoveryRequest):
    """
    Trigger agentic news discovery based on user tags
    """
    try:
        logger.info(f"Starting news discovery for tags: {request.tags}")

        # Start the agent discovery process
        session_id = await agent_orchestrator.start_discovery(
            tags=request.tags,
            categories=request.categories,
            max_articles=request.max_articles,
            websocket_manager=websocket_manager
        )

        return NewsResponse(
            session_id=session_id,
            status="started",
            message="News discovery started. Connect to WebSocket for real-time updates."
        )

    except Exception as e:
        logger.error(f"Error starting news discovery: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/news/stream/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time agent updates
    """
    await websocket_manager.connect(websocket, session_id)

    try:
        while True:
            # Keep connection alive and handle any client messages
            data = await websocket.receive_text()
            logger.info(f"Received message from client {session_id}: {data}")

    except WebSocketDisconnect:
        websocket_manager.disconnect(session_id)
        logger.info(f"Client {session_id} disconnected")

@app.post("/api/tags/monitor")
async def monitor_tags(request: TagSubscriptionRequest):
    """
    Start continuous monitoring for specific tags
    """
    try:
        monitoring_id = await agent_orchestrator.start_monitoring(
            tags=request.tags,
            interval_minutes=request.interval_minutes,
            websocket_manager=websocket_manager
        )

        return {"monitoring_id": monitoring_id, "status": "monitoring_started"}

    except Exception as e:
        logger.error(f"Error starting tag monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/processed/{session_id}")
async def get_processed_news(session_id: str):
    """
    Get processed news ready for social media content
    """
    try:
        processed_news = await agent_orchestrator.get_processed_results(session_id)
        return processed_news

    except Exception as e:
        logger.error(f"Error getting processed news: {str(e)}")
        raise HTTPException(status_code=404, detail="Session not found or still processing")

@app.get("/api/news/stats")
async def get_news_stats():
    """
    Get current news discovery statistics
    """
    try:
        stats = await agent_orchestrator.get_stats()
        return stats

    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )