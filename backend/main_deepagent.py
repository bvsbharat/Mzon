"""
FastAPI Backend with DeepAgent Implementation
Following Event Hunter AI pattern for news discovery and social media content generation
"""
import os
import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
import uuid
from datetime import datetime

from deep_agent.news_hunter_agent import NewsHunterDeepAgent
from models.news_models import NewsDiscoveryRequest, NewsResponse
from services.news_api_service import news_api_service
from services.trending_analyzer import trending_analyzer

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global DeepAgent instance
news_deep_agent = NewsHunterDeepAgent()
active_websockets: Dict[str, WebSocket] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    # Startup
    logger.info("🚀 Initializing News Hunter DeepAgent Backend...")
    logger.info("✅ DeepAgent system ready for news discovery and content generation")

    yield

    # Shutdown
    logger.info("🔄 Shutting down DeepAgent backend...")
    active_websockets.clear()

# Create FastAPI app
app = FastAPI(
    title="News Hunter DeepAgent API",
    description="Multi-agent system for intelligent news discovery and social media content generation",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "News Hunter DeepAgent API",
        "version": "2.0.0",
        "agents": ["news-search-agent", "news-details-agent"],
        "capabilities": ["news_discovery", "content_generation", "social_media_optimization"]
    }

@app.post("/api/news/discover", response_model=NewsResponse)
async def discover_news(request: NewsDiscoveryRequest):
    """
    Start DeepAgent news discovery process
    Returns session ID for WebSocket streaming
    """
    try:
        session_id = str(uuid.uuid4())
        logger.info(f"🎯 Starting DeepAgent discovery for session: {session_id}")
        logger.info(f"📝 Query tags: {request.tags}")

        return NewsResponse(
            session_id=session_id,
            status="started",
            message=f"DeepAgent news discovery started for: {', '.join(request.tags)}. Connect to WebSocket /ws/query for real-time updates."
        )

    except Exception as e:
        logger.error(f"❌ Error starting discovery: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/query")
async def websocket_query_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time DeepAgent streaming
    Follows Event Hunter AI pattern: /ws/query
    """
    await websocket.accept()
    session_id = None

    try:
        logger.info("🔌 WebSocket connection established")

        # Wait for query message
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)

            if data.get("action") == "start_query":
                session_id = data.get("session_id") or str(uuid.uuid4())
                query_data = {
                    "session_id": session_id,
                    "tags": data.get("tags", []),
                    "max_articles": data.get("max_articles", 5),
                    "categories": data.get("categories", [])
                }

                # Store WebSocket connection
                active_websockets[session_id] = websocket

                logger.info(f"🎬 Starting DeepAgent execution for session: {session_id}")

                # Execute DeepAgent query with streaming
                async for response_chunk in news_deep_agent.execute_query(query_data, websocket.send_text):
                    # Send each chunk as it's generated
                    await websocket.send_text(json.dumps(response_chunk))

                    # Add small delay to make streaming visible
                    await asyncio.sleep(0.5)

                break

    except WebSocketDisconnect:
        if session_id and session_id in active_websockets:
            del active_websockets[session_id]
        logger.info(f"🔌 WebSocket disconnected for session: {session_id}")

    except Exception as e:
        logger.error(f"❌ WebSocket error: {str(e)}")
        if websocket:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Connection error: {str(e)}"
            }))

@app.get("/api/news/session/{session_id}")
async def get_session_data(session_id: str):
    """
    Get complete session data including all articles and social media content
    """
    try:
        session_data = news_deep_agent.get_session_data(session_id)

        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "session_id": session_id,
            "data": session_data,
            "content_ready": True
        }

    except Exception as e:
        logger.error(f"❌ Error getting session data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/articles/{session_id}")
async def get_articles_with_content(session_id: str):
    """
    Get all articles for a session with complete social media content
    This provides the content context for AI generation
    """
    try:
        articles = news_deep_agent.get_articles_for_session(session_id)

        if not articles:
            raise HTTPException(status_code=404, detail="No articles found for session")

        # Prepare articles with full context for content generation
        articles_with_context = []
        for article in articles:
            article_context = {
                **article,
                "content_context": {
                    "title": article.get("title"),
                    "summary": article.get("summary"),
                    "key_points": article.get("key_points", []),
                    "sentiment": article.get("sentiment"),
                    "hashtags": article.get("hashtags", []),
                    "social_posts": article.get("social_posts", []),
                    "relevance_score": article.get("relevance_score"),
                    "trending_potential": article.get("trending_potential"),
                    "tags": article.get("tags", [])
                }
            }
            articles_with_context.append(article_context)

        return {
            "session_id": session_id,
            "articles": articles_with_context,
            "total_articles": len(articles_with_context),
            "content_ready": True,
            "usage_context": "social_media_content_generation"
        }

    except Exception as e:
        logger.error(f"❌ Error getting articles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/stats")
async def get_system_stats():
    """Get DeepAgent system statistics"""
    try:
        total_sessions = len(news_deep_agent.session_data)
        total_articles = sum(
            len(session.get("articles", []))
            for session in news_deep_agent.session_data.values()
        )
        total_social_posts = sum(
            session.get("total_social_posts", 0)
            for session in news_deep_agent.session_data.values()
        )

        return {
            "system": "News Hunter DeepAgent",
            "active_sessions": len(active_websockets),
            "total_sessions": total_sessions,
            "total_articles_processed": total_articles,
            "total_social_posts_generated": total_social_posts,
            "active_agents": ["news-search-agent", "news-details-agent"],
            "last_update": datetime.now().isoformat(),
            "status": "operational"
        }

    except Exception as e:
        logger.error(f"❌ Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/latest")
async def get_latest_news(
    category: Optional[str] = None,
    limit: int = 50,
    breaking_only: bool = False
):
    """Get latest real-time news with engagement metrics"""
    try:
        async with news_api_service as service:
            latest_news = await service.fetch_latest_news(
                category=category,
                page_size=limit
            )

            # Filter for breaking news if requested
            if breaking_only:
                latest_news = [news for news in latest_news if news.get('isBreaking', False)]

            # Enhance with trend analysis
            enhanced_news = []
            for news_item in latest_news:
                # Calculate virality score
                social_engagement = news_item.get('socialEngagement', {})
                virality_score = trending_analyzer.calculate_virality_score(social_engagement)

                # Analyze sentiment
                sentiment_analysis = trending_analyzer.analyze_social_sentiment(social_engagement)

                # Add enhanced data
                enhanced_item = {
                    **news_item,
                    'viralityScore': virality_score,
                    'sentimentAnalysis': sentiment_analysis,
                    'lastFetched': datetime.now().isoformat()
                }

                enhanced_news.append(enhanced_item)

            return {
                'status': 'success',
                'data': enhanced_news,
                'total': len(enhanced_news),
                'timestamp': datetime.now().isoformat(),
                'category': category,
                'breaking_only': breaking_only
            }

    except Exception as e:
        logger.error(f"❌ Error fetching latest news: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/trending")
async def get_trending_topics(
    timeframe: str = '24h',
    limit: int = 20,
    category: Optional[str] = None
):
    """Get trending topics with virality analysis"""
    try:
        async with news_api_service as service:
            trending_topics = await service.fetch_trending_topics(
                timeframe=timeframe,
                limit=limit
            )

            # Filter by category if specified
            if category:
                trending_topics = [
                    topic for topic in trending_topics
                    if topic.get('category') == category
                ]

            # Analyze content opportunities
            opportunities = trending_analyzer.identify_content_opportunities(trending_topics)

            return {
                'status': 'success',
                'data': {
                    'trending_topics': trending_topics,
                    'content_opportunities': opportunities,
                    'analysis': {
                        'total_topics': len(trending_topics),
                        'high_opportunity_count': len([
                            opp for opp in opportunities
                            if opp.get('opportunity_score', 0) > 80
                        ]),
                        'timeframe': timeframe,
                        'last_updated': datetime.now().isoformat()
                    }
                },
                'timestamp': datetime.now().isoformat()
            }

    except Exception as e:
        logger.error(f"❌ Error fetching trending topics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/social-hooks")
async def get_social_hooks(
    platforms: Optional[str] = None,
    limit: int = 10,
    min_engagement_potential: int = 70
):
    """Get social media hooks and viral opportunities"""
    try:
        platform_list = platforms.split(',') if platforms else None

        async with news_api_service as service:
            social_hooks = await service.fetch_social_hooks(
                platforms=platform_list,
                limit=limit * 2  # Get more to filter by engagement potential
            )

            # Filter by engagement potential
            filtered_hooks = [
                hook for hook in social_hooks
                if hook.get('engagementPotential', 0) >= min_engagement_potential
            ][:limit]

            # Add trend analysis for each hook
            analyzed_hooks = []
            for hook in filtered_hooks:
                # Analyze timing and competition
                timing_analysis = {
                    'optimal_window': hook.get('optimalPostTime'),
                    'time_remaining': hook.get('expiryTime'),
                    'urgency': 'high' if hook.get('difficulty') == 'easy' else 'medium'
                }

                analyzed_hook = {
                    **hook,
                    'timing_analysis': timing_analysis,
                    'recommendation': 'create_now' if hook.get('engagementPotential', 0) > 85 else 'monitor'
                }

                analyzed_hooks.append(analyzed_hook)

            return {
                'status': 'success',
                'data': analyzed_hooks,
                'total': len(analyzed_hooks),
                'filters': {
                    'platforms': platform_list or ['all'],
                    'min_engagement_potential': min_engagement_potential
                },
                'timestamp': datetime.now().isoformat()
            }

    except Exception as e:
        logger.error(f"❌ Error fetching social hooks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/live-feed")
async def get_live_news_feed(
    refresh_rate: int = 30,  # seconds
    categories: Optional[str] = None,
    personalized: bool = False
):
    """Get real-time news feed configuration"""
    try:
        category_list = categories.split(',') if categories else None

        # Get latest news
        async with news_api_service as service:
            latest_news = await service.fetch_latest_news(
                category=category_list[0] if category_list else None,
                page_size=20
            )

            # Get trending topics
            trending_topics = await service.fetch_trending_topics(limit=10)

        # Configure live feed
        feed_config = {
            'refresh_rate_seconds': refresh_rate,
            'categories': category_list or ['all'],
            'personalized': personalized,
            'websocket_url': '/ws/live-news',
            'last_updated': datetime.now().isoformat()
        }

        return {
            'status': 'success',
            'data': {
                'initial_news': latest_news[:10],  # First 10 items
                'trending_preview': trending_topics[:5],  # First 5 trends
                'feed_config': feed_config,
                'total_available': len(latest_news)
            },
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ Error configuring live news feed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/news/personalize")
async def personalize_news_feed(request: dict):
    """Configure personalized news preferences"""
    try:
        user_preferences = request.get('preferences', {})

        # Validate preferences structure
        required_fields = ['followedTopics', 'preferredSources']
        for field in required_fields:
            if field not in user_preferences:
                user_preferences[field] = []

        # Get personalized content recommendations
        async with news_api_service as service:
            # Fetch news based on followed topics
            personalized_news = []
            for topic in user_preferences.get('followedTopics', []):
                topic_news = await service.fetch_latest_news(
                    category=topic,
                    page_size=5
                )
                personalized_news.extend(topic_news)

            # Get trending topics in user's areas of interest
            trending_topics = await service.fetch_trending_topics(limit=20)
            relevant_trends = [
                trend for trend in trending_topics
                if trend.get('category') in user_preferences.get('followedTopics', [])
            ]

        return {
            'status': 'success',
            'data': {
                'personalized_news': personalized_news[:15],
                'relevant_trends': relevant_trends[:8],
                'preferences_applied': user_preferences,
                'recommendation_count': len(personalized_news)
            },
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"❌ Error personalizing news feed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/docs")
async def get_docs():
    """API Documentation"""
    return {
        "api_version": "2.0.0",
        "endpoints": {
            "POST /api/news/discover": "Start news discovery (returns session_id)",
            "WS /ws/query": "WebSocket for real-time agent streaming",
            "GET /api/news/session/{session_id}": "Get complete session data",
            "GET /api/news/articles/{session_id}": "Get articles with content context",
            "GET /api/news/stats": "System statistics",
            "GET /api/news/latest": "Get real-time latest news with engagement metrics",
            "GET /api/news/trending": "Get trending topics with virality analysis",
            "GET /api/news/social-hooks": "Get social media hooks and viral opportunities",
            "GET /api/news/live-feed": "Get real-time news feed configuration",
            "POST /api/news/personalize": "Configure personalized news preferences"
        },
        "websocket_message_format": {
            "start_query": {
                "action": "start_query",
                "session_id": "optional-uuid",
                "tags": ["ai", "social media"],
                "max_articles": 5
            }
        },
        "streaming_responses": ["start", "stream", "complete", "error"]
    }

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"

    logger.info(f"🚀 Starting News Hunter DeepAgent on {host}:{port}")

    uvicorn.run(
        "main_deepagent:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )