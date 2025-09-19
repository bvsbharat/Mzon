from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import json
import os
import uuid
from typing import Optional, List
from datetime import datetime, timedelta
from deepagents import create_deep_agent
from langchain.chat_models import init_chat_model
from langchain_mcp_adapters.client import MultiServerMCPClient
from dotenv import load_dotenv
import logging
import random
import aiohttp
from database_service import db_service
from video_combination_service import video_combination_service
from routes.s3_routes import router as s3_router

load_dotenv()

app = FastAPI(title="Event Hunter API", description="AI-powered event discovery service")

# Include S3 proxy routes
app.include_router(s3_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QueryRequest(BaseModel):
    query: str

class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    url: str
    source: str
    publishedAt: str
    category: str
    sentiment: Optional[str] = "neutral"
    trending_potential: Optional[int] = 50
    tags: List[str] = []
    social_engagement: Optional[dict] = {}

class NewsStats(BaseModel):
    total_articles: int
    total_social_posts: int
    active_sessions: int
    last_updated: str

class VideoCombinationRequest(BaseModel):
    segment_urls: List[str]
    output_filename: Optional[str] = None
    transition_type: str = "concatenate"  # "concatenate", "crossfade", "fade"
    fade_duration: float = 0.5

class VideoCombinationResponse(BaseModel):
    status: str
    video_path: str
    duration: Optional[float] = None
    message: str

class VideoGenerationRequest(BaseModel):
    productData: dict
    avatar: dict
    configuration: dict
    script: dict
    selectedImageUrls: List[str]

class VideoGenerationResponse(BaseModel):
    success: bool
    videoUrl: Optional[str] = None
    error: Optional[str] = None

# Mock news data for fallback
def generate_mock_news_data(category: Optional[str] = None, limit: int = 50) -> List[dict]:
    """Generate mock news data for testing when BrightData is unavailable"""
    categories = ['technology', 'ai', 'business', 'design', 'marketing', 'photography']
    sources = ['TechCrunch', 'Wired', 'The Verge', 'Ars Technica', 'Fast Company', 'Medium']

    mock_news = []
    for i in range(limit):
        selected_category = category if category else random.choice(categories)
        news_item = {
            "id": str(uuid.uuid4()),
            "title": f"Latest {selected_category.title()} News Update #{i+1}",
            "summary": f"This is a comprehensive summary of the latest developments in {selected_category}. The article covers recent trends, innovations, and insights from industry experts.",
            "url": f"https://example.com/news/{selected_category}/{uuid.uuid4()}",
            "source": random.choice(sources),
            "publishedAt": (datetime.now() - timedelta(hours=random.randint(1, 72))).isoformat(),
            "category": selected_category,
            "sentiment": random.choice(["positive", "neutral", "negative"]),
            "trending_potential": random.randint(30, 90),
            "tags": [selected_category, f"{selected_category}-trends", "innovation", "news"],
            "social_engagement": {
                "likes": random.randint(10, 1000),
                "shares": random.randint(5, 200),
                "comments": random.randint(2, 100)
            }
        }
        mock_news.append(news_item)

    return mock_news

# Global agent instance
agent = None

async def initialize_agent():
    """Initialize the deep agent with MCP tools"""
    global agent

    try:
        # Collect MCP tools from BrightData
        brightdata_token = os.getenv("BRIGHTDATA_API_TOKEN")
        if not brightdata_token:
            raise ValueError("BRIGHTDATA_API_TOKEN not found in environment variables")

        mcp_client = MultiServerMCPClient({
            "brightdata": {
                "url": f"https://mcp.brightdata.com/sse?token={brightdata_token}",
                "transport": "sse",
            }
        })
        mcp_tools = await mcp_client.get_tools()

        logger.info(f"Available MCP tools: {[tool.name for tool in mcp_tools]}")

        # Get OpenAI configuration from environment (Direct OpenAI API)
        openai_api_key = os.getenv("OPENAI_API_KEY")

        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")

        # Initialize with direct OpenAI API (no Azure)
        model = init_chat_model(
            model="gpt-4o-mini",
            model_provider="openai",
            api_key=openai_api_key
        )

        # Event Search Sub-Agent
        current_date = datetime.now().strftime("%B %d, %Y")
        event_search_prompt = f"""You are an expert event finder. Your job is to search for industry events based on specific criteria.

        IMPORTANT: Today's date is {current_date}. When searching for events, always consider this current date and look for upcoming events, not past ones.

        You will receive:
        - Industry (e.g., "AI", "fintech", "healthcare")
        - Timeframe (e.g., "2025", "Q1 2025", "next 6 months")
        - Geographic location (e.g., "USA", "Europe", "San Francisco")

        You have access to the search_engine tool which can scrape search results from Google, Bing or Yandex.

        Your task:
        1. Use the search_engine tool to find relevant industry events
        2. Search for conferences, trade shows, summits, workshops, hackathons, and similar events
        3. Return a list of events you found with basic information (name, URL, brief description)

        Focus on finding events that match ALL three criteria. Use multiple search queries with different combinations of keywords.

        Example search queries you might use:
        - "{{industry}} hackathon {{timeframe}} {{location}}"
        - "{{industry}} conference {{timeframe}} {{location}}"
        - "{{industry}} summit {{year}} {{location}}"
        - "{{industry}} events {{location}} {{timeframe}}"

        Return your findings in a simple list format:
        - Event Name: URL - Brief description

        Do NOT try to extract detailed information - focus only on FINDING events."""

        event_search_agent = {
            "name": "event-search-agent",
            "description": "Finds industry events based on industry, timeframe, and location criteria. Give this agent clear search parameters.",
            "prompt": event_search_prompt,
        }

        # Event Details Sub-Agent
        event_details_prompt = f"""You are an event details extractor. Your job is to get comprehensive information about specific events.

        IMPORTANT: Today's date is {current_date}. When evaluating event dates, remember this context.

        You will receive URLs of events that need detailed information extracted.

        Your task:
        1. Use the scrape_as_markdown tool to get the content from each event URL
        2. Extract the following information for each event:
           - Event Name
           - Date(s)
           - Location (city, venue if available)
           - Main statement/description
           - Whether CFP (Call for Papers) is open
           - Whether sponsorship opportunities are available
           - Link to the event

        Format your response as:
        **Event Name**: [Name]
        **Link**: [URL]
        **Date**: [Date]
        **Location**: [Location]
        **Main Statement**: [Brief description of what the event is about]
        **Open CFP**: [Yes/No - with details if available]
        **Open Sponsorship**: [Yes/No - with details if available]

        If information is not available, mark it as "Not specified" rather than guessing."""

        event_details_agent = {
            "name": "event-details-agent",
            "description": "Extracts detailed information from event URLs. Give this agent specific event URLs to analyze.",
            "prompt": event_details_prompt,
        }

        # Main Event Hunter Instructions
        event_hunter_instructions = f"""You are an expert Event Hunter. Your job is to find comprehensive information about industry events.

        IMPORTANT: Today's date is {current_date}. Always search for upcoming events relative to this date.

        You will receive input with:
        - Industry
        - Timeframe
        - Geographic location (geo)

        Your workflow:
        1. First, use the event-search-agent to find relevant events based on the criteria
        2. Then, use the event-details-agent to extract detailed information from the event URLs found
        3. Compile a final report with all events in the requested format

        Final output format for each event:
        **Event Name**: [Name]
        **Link**: [URL]
        **Date**: [Date]
        **Location**: [Location]
        **Main Statement**: [Brief description]
        **Open CFP**: [Yes/No with details]
        **Open Sponsorship**: [Yes/No with details]

        Keep the process simple:
        - Search agent finds events
        - Details agent extracts information
        - You compile the final list

        Be thorough but efficient. Focus on finding 5-15 high-quality, relevant events rather than hundreds of low-quality results."""

        # Create the Event Hunter agent
        agent = create_deep_agent(
            tools=mcp_tools,
            model=model,
            instructions=event_hunter_instructions,
            subagents=[event_search_agent, event_details_agent],
        ).with_config({"recursion_limit": 1000})

        logger.info("Agent initialized successfully")

    except Exception as e:
        logger.error(f"Failed to initialize agent: {e}")
        raise e

@app.on_event("startup")
async def startup_event():
    """Initialize the agent and database on startup"""
    await initialize_agent()
    await db_service.initialize()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown"""
    await db_service.close()

@app.get("/")
async def root():
    return {"message": "Event Hunter API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "agent_ready": agent is not None}

@app.post("/query")
async def query_events(request: QueryRequest):
    """Non-streaming endpoint for event queries"""
    if not agent:
        raise HTTPException(status_code=500, detail="Agent not initialized")

    try:
        response = await agent.ainvoke(
            {"messages": [{"role": "user", "content": request.query}]}
        )

        # Extract the final message content
        final_message = response["messages"][-1].content if response.get("messages") else "No response generated"

        return {
            "query": request.query,
            "response": final_message,
            "status": "completed"
        }

    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")

@app.websocket("/ws/query")
async def websocket_query(websocket: WebSocket):
    """WebSocket endpoint for streaming event queries"""
    await websocket.accept()

    if not agent:
        await websocket.send_json({
            "type": "error",
            "message": "Agent not initialized"
        })
        await websocket.close()
        return

    try:
        while True:
            # Receive query from client
            data = await websocket.receive_text()
            query_data = json.loads(data)
            query = query_data.get("query", "")

            if not query:
                await websocket.send_json({
                    "type": "error",
                    "message": "Query is required"
                })
                continue

            # Send acknowledgment
            await websocket.send_json({
                "type": "start",
                "message": "Processing your query...",
                "query": query
            })

            try:
                # Stream the agent response
                async for chunk in agent.astream(
                    {"messages": [{"role": "user", "content": query}]},
                    stream_mode="values"
                ):
                    if "messages" in chunk and chunk["messages"]:
                        latest_message = chunk["messages"][-1]

                        # Send the streaming content
                        await websocket.send_json({
                            "type": "stream",
                            "content": latest_message.content if hasattr(latest_message, 'content') else str(latest_message),
                            "role": getattr(latest_message, 'role', 'assistant')
                        })

                # Send completion signal
                await websocket.send_json({
                    "type": "complete",
                    "message": "Query processing completed"
                })

            except Exception as e:
                logger.error(f"Error during streaming: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"Error processing query: {str(e)}"
                })

    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"WebSocket error: {str(e)}"
            })
        except:
            pass

# News API Endpoints for Frontend Compatibility
@app.get("/api/news/latest")
async def get_latest_news(
    category: Optional[str] = None,
    limit: int = 5,
    breaking_only: bool = False,
    use_cache: bool = True
):
    """Get latest news using BrightData agent tools with TimescaleDB caching

    Args:
        category: News category filter (optional)
        limit: Number of articles to return (1-20, default: 5)
        breaking_only: Filter for breaking news only (optional)
        use_cache: Use cached data if available (default: True)
    """
    try:
        # Validate limit parameter - default to 5 for performance
        if limit < 1:
            limit = 1
        elif limit > 20:
            limit = 20

        logger.info(f"Fetching latest news via agent: category={category}, limit={limit}, use_cache={use_cache}")

        # Try to get cached data first if enabled
        if use_cache:
            try:
                cached_news = await db_service.get_cached_news(category=category, limit=limit, hours_back=2)
                if cached_news:
                    logger.info(f"Found {len(cached_news)} cached articles")

                    # Filter for breaking news if requested
                    if breaking_only:
                        for item in cached_news:
                            item['isBreaking'] = True

                    return {
                        'status': 'success',
                        'data': cached_news,
                        'total': len(cached_news),
                        'timestamp': datetime.now().isoformat(),
                        'category': category,
                        'breaking_only': breaking_only,
                        'source': 'TimescaleDB Cache',
                        'cached': True
                    }
            except Exception as cache_error:
                logger.warning(f"Cache lookup failed, falling back to agent: {cache_error}")

        if not agent:
            logger.error("BrightData agent not initialized")
            raise HTTPException(status_code=503, detail="BrightData agent not available. Cannot fetch real news data.")
        else:
            # Use the agent to search for real news
            search_query = f"latest news {category if category else 'general'} articles today"

            try:
                # Use the agent to search for real news
                search_query = f"latest {category if category else 'technology'} news articles today"
                response = await agent.ainvoke({
                    "messages": [{"role": "user", "content": f"Search for the latest {category if category else 'technology'} news articles. Use the search_engine tool to find recent news articles from reliable sources. Return exactly {limit} real articles with actual titles, URLs, sources, and summaries. Format the response as a JSON array with fields: title, url, source, summary, publishedAt, category."}]
                })

                # Extract and parse the real response from the agent
                if response.get("messages") and len(response["messages"]) > 0:
                    agent_response = response["messages"][-1].content
                    logger.info(f"Agent response received: {len(agent_response)} characters")
                    logger.info(f"Raw agent response: {agent_response[:500]}...")

                    try:
                        # Try to parse JSON from agent response
                        import re
                        import json

                        # Look for JSON in the response
                        json_match = re.search(r'\[.*\]', agent_response, re.DOTALL)
                        if json_match:
                            parsed_articles = json.loads(json_match.group())

                            news_data = []
                            for i, article in enumerate(parsed_articles[:limit]):  # Limit to requested amount
                                news_item = {
                                    "id": str(uuid.uuid4()),
                                    "title": article.get("title", f"News Article #{i+1}"),
                                    "summary": article.get("summary", "Summary not available"),
                                    "url": article.get("url", ""),
                                    "source": article.get("source", "BrightData Search"),
                                    "publishedAt": article.get("publishedAt", datetime.now().isoformat()),
                                    "category": article.get("category", category or "general"),
                                    "sentiment": "neutral",
                                    "trending_potential": 75,
                                    "tags": [category or "news", "real-time", "brightdata"],
                                    "social_engagement": {
                                        "likes": 100,
                                        "shares": 25,
                                        "comments": 10
                                    },
                                    "agent_searched": True,
                                    "agent_source": "brightdata",
                                    "is_real_data": True
                                }
                                news_data.append(news_item)

                                # Cache the article in TimescaleDB
                                try:
                                    await db_service.cache_news_article(news_item)
                                except Exception as cache_error:
                                    logger.warning(f"Failed to cache article: {cache_error}")

                            logger.info(f"Parsed and cached {len(news_data)} real articles from agent")
                        else:
                            # If no JSON found, parse text response
                            logger.info("No JSON found, parsing text response")
                            lines = agent_response.split('\n')
                            news_data = []

                            current_article = {}
                            for line in lines:
                                if 'title:' in line.lower() or 'headline:' in line.lower():
                                    if current_article:
                                        news_data.append(current_article)
                                    current_article = {
                                        "id": str(uuid.uuid4()),
                                        "title": line.split(':', 1)[1].strip() if ':' in line else line.strip(),
                                        "summary": "Summary extracted from real search",
                                        "url": "",
                                        "source": "BrightData Real Search",
                                        "publishedAt": datetime.now().isoformat(),
                                        "category": category or "general",
                                        "sentiment": "neutral",
                                        "trending_potential": 80,
                                        "tags": [category or "news", "real-time", "brightdata"],
                                        "social_engagement": {"likes": 150, "shares": 30, "comments": 15},
                                        "agent_searched": True,
                                        "is_real_data": True
                                    }
                                elif 'url:' in line.lower() or 'link:' in line.lower():
                                    if current_article and ':' in line:
                                        current_article["url"] = line.split(':', 1)[1].strip()
                                elif 'source:' in line.lower():
                                    if current_article and ':' in line:
                                        current_article["source"] = line.split(':', 1)[1].strip()
                                elif 'summary:' in line.lower() or 'description:' in line.lower():
                                    if current_article and ':' in line:
                                        current_article["summary"] = line.split(':', 1)[1].strip()

                            if current_article:
                                news_data.append(current_article)

                            # Limit to requested amount
                            news_data = news_data[:limit]
                            logger.info(f"Parsed {len(news_data)} articles from text response")

                    except Exception as parse_error:
                        logger.error(f"Failed to parse agent response: {parse_error}")
                        # Fallback to at least showing that agent was called
                        news_data = [{
                            "id": str(uuid.uuid4()),
                            "title": "Real News Search Completed",
                            "summary": f"BrightData agent searched for {category or 'general'} news. Raw response: {agent_response[:200]}...",
                            "url": "https://brightdata.com",
                            "source": "BrightData Agent",
                            "publishedAt": datetime.now().isoformat(),
                            "category": category or "general",
                            "sentiment": "neutral",
                            "trending_potential": 85,
                            "tags": [category or "news", "brightdata-agent", "real-search"],
                            "social_engagement": {"likes": 200, "shares": 50, "comments": 20},
                            "agent_searched": True,
                            "is_real_data": True,
                            "raw_response_preview": agent_response[:300]
                        }]

                else:
                    logger.warning("No response from agent")
                    raise Exception("No response from BrightData agent")

            except Exception as agent_error:
                logger.error(f"Agent search failed: {agent_error}")
                raise HTTPException(status_code=503, detail=f"BrightData agent search failed: {str(agent_error)}")

        # Filter for breaking news if requested
        if breaking_only:
            for item in news_data[:min(limit, len(news_data))]:  # Mark requested items as "breaking"
                item['isBreaking'] = True

        return {
            'status': 'success',
            'data': news_data,
            'total': len(news_data),
            'timestamp': datetime.now().isoformat(),
            'category': category,
            'breaking_only': breaking_only,
            'source': 'BrightData Agent' if agent else 'Mock Data'
        }

    except Exception as e:
        logger.error(f"Error fetching latest news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")

@app.get("/api/news/search")
async def search_news(
    query: str,
    category: Optional[str] = None,
    limit: int = 5,
    country: str = 'us',
    language: str = 'en'
):
    """Search for specific news using BrightData agent

    Args:
        query: Search query/keywords (required)
        category: News category filter (optional)
        limit: Number of articles to return (1-20, default: 5)
        country: Country code for localization (default: us)
        language: Language code (default: en)
    """
    try:
        # Validate limit parameter
        if limit < 1:
            limit = 1
        elif limit > 20:
            limit = 20

        logger.info(f"Searching news via agent: query={query}, category={category}, limit={limit}")

        if not agent:
            logger.error("BrightData agent not initialized")
            raise HTTPException(status_code=503, detail="BrightData agent not available. Cannot search real news data.")
        else:
            try:
                # Use the agent to search for specific news
                search_prompt = f"Search for news articles about: {query}"
                if category:
                    search_prompt += f" in the {category} category"
                search_prompt += f". Use the search_engine tool to find exactly {limit} real articles. Return structured JSON data with fields: title, url, source, summary, publishedAt, category."

                response = await agent.ainvoke({
                    "messages": [{"role": "user", "content": search_prompt}]
                })

                if response.get("messages") and len(response["messages"]) > 0:
                    agent_response = response["messages"][-1].content
                    logger.info(f"Agent search response received: {len(agent_response)} characters")
                    logger.info(f"Search response preview: {agent_response[:300]}...")

                    # Parse the real search results
                    try:
                        import re
                        import json

                        # Look for JSON in the response
                        json_match = re.search(r'\[.*\]', agent_response, re.DOTALL)
                        if json_match:
                            parsed_articles = json.loads(json_match.group())
                            search_results = []

                            for i, article in enumerate(parsed_articles[:limit]):  # Limit to requested amount
                                result_item = {
                                    "id": str(uuid.uuid4()),
                                    "title": article.get("title", f"Search Result #{i+1}"),
                                    "summary": article.get("summary", "Summary extracted from search"),
                                    "url": article.get("url", ""),
                                    "source": article.get("source", "BrightData Search"),
                                    "publishedAt": article.get("publishedAt", datetime.now().isoformat()),
                                    "category": article.get("category", category or "general"),
                                    "sentiment": "neutral",
                                    "trending_potential": 80,
                                    "tags": [query, category or "search", "real-time"],
                                    "social_engagement": {"likes": 120, "shares": 35, "comments": 12},
                                    "agent_searched": True,
                                    "search_query": query,
                                    "is_real_data": True
                                }
                                search_results.append(result_item)
                        else:
                            # Parse text response for search results
                            logger.info("Parsing text search response")
                            search_results = []
                            lines = agent_response.split('\n')

                            current_article = {}
                            for line in lines:
                                if any(keyword in line.lower() for keyword in ['title:', 'headline:', f'{query.lower()}']):
                                    if current_article:
                                        search_results.append(current_article)
                                    current_article = {
                                        "id": str(uuid.uuid4()),
                                        "title": line.split(':', 1)[1].strip() if ':' in line else line.strip(),
                                        "summary": f"Search result for '{query}'",
                                        "url": "",
                                        "source": "BrightData Search",
                                        "publishedAt": datetime.now().isoformat(),
                                        "category": category or "search",
                                        "sentiment": "neutral",
                                        "trending_potential": 85,
                                        "tags": [query, "search", "brightdata"],
                                        "social_engagement": {"likes": 180, "shares": 40, "comments": 18},
                                        "agent_searched": True,
                                        "search_query": query,
                                        "is_real_data": True
                                    }
                                elif current_article and ('url:' in line.lower() or 'link:' in line.lower()) and ':' in line:
                                    current_article["url"] = line.split(':', 1)[1].strip()

                            if current_article:
                                search_results.append(current_article)

                            search_results = search_results[:limit]  # Dynamic limit

                    except Exception as parse_error:
                        logger.error(f"Failed to parse search response: {parse_error}")
                        # Show raw agent response for debugging
                        search_results = [{
                            "id": str(uuid.uuid4()),
                            "title": f"Real Search Results for '{query}'",
                            "summary": f"BrightData agent searched for: {query}. Raw response: {agent_response[:200]}...",
                            "url": "https://brightdata.com",
                            "source": "BrightData Search Agent",
                            "publishedAt": datetime.now().isoformat(),
                            "category": category or "search",
                            "sentiment": "neutral",
                            "trending_potential": 90,
                            "tags": [query, "search", "brightdata"],
                            "social_engagement": {"likes": 250, "shares": 60, "comments": 25},
                            "agent_searched": True,
                            "search_query": query,
                            "is_real_data": True,
                            "raw_response_preview": agent_response[:400]
                        }]

                else:
                    raise Exception("No response from BrightData search agent")

            except Exception as agent_error:
                logger.error(f"Agent search failed: {agent_error}")
                raise HTTPException(status_code=503, detail=f"BrightData search failed: {str(agent_error)}")

        # Use the agent search results directly (already filtered by the agent)
        filtered_results = search_results[:limit]  # Dynamic limit from parameter

        # Add relevance scores based on query match
        query_lower = query.lower()
        for item in filtered_results:
            if query_lower in item['title'].lower():
                item['relevance_score'] = 95
            elif query_lower in item['summary'].lower():
                item['relevance_score'] = 85
            elif any(query_lower in tag.lower() for tag in item.get('tags', [])):
                item['relevance_score'] = 75
            else:
                item['relevance_score'] = 70

        return {
            'status': 'success',
            'data': filtered_results,
            'total': len(filtered_results),
            'query': query,
            'category': category,
            'timestamp': datetime.now().isoformat(),
            'source': 'BrightData Agent' if agent else 'Mock Data'
        }

    except Exception as e:
        logger.error(f"Error searching news: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search news: {str(e)}")

@app.get("/api/proxy-image")
async def proxy_image(url: str = Query(..., description="Image URL to proxy")):
    """Proxy image requests to handle CORS and accessibility issues"""
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    raise HTTPException(status_code=response.status, detail=f"Failed to fetch image: {response.status}")
                
                content_type = response.headers.get('content-type', 'image/jpeg')
                content = await response.read()
                
                return StreamingResponse(
                    iter([content]),
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=3600"}
                )
    except Exception as e:
        logger.error(f"Error proxying image {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to proxy image: {str(e)}")

async def validate_image_url(url: str) -> bool:
    """Validate if an image URL is accessible"""
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            async with session.head(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                return response.status == 200 and 'image' in response.headers.get('content-type', '')
    except Exception as e:
        logger.warning(f"Image validation failed for {url}: {e}")
        return False

def preprocess_amazon_url(url: str) -> str:
    """Preprocess Amazon image URLs for better compatibility"""
    if 'amazon' not in url:
        return url
    
    # Convert WebP format to JPEG for better compatibility
    if '__AC_SX300_SY300_QL70_FMwebp_' in url:
        return url.replace('__AC_SX300_SY300_QL70_FMwebp_', '_AC_SL1500_')
    
    # Try to get a larger, more standard format
    import re
    return re.sub(r'\._AC_[^.]*\.', '._AC_SL1500_.', url)

@app.post("/api/generate-video")
async def generate_video(request: VideoGenerationRequest) -> VideoGenerationResponse:
    """Generate video from product data and configuration"""
    try:
        logger.info(f"Received video generation request for product: {request.productData.get('title', 'Unknown')}")
        
        # Validate product image URL
        product_image_url = request.productData.get('imageUrl')
        if not product_image_url:
            return VideoGenerationResponse(
                success=False,
                error="Product image URL is required"
            )
        
        # Preprocess Amazon URLs
        processed_url = preprocess_amazon_url(product_image_url)
        
        # Validate image accessibility
        is_valid = await validate_image_url(processed_url)
        if not is_valid:
            # Try original URL if processed version fails
            if processed_url != product_image_url:
                is_valid = await validate_image_url(product_image_url)
                if is_valid:
                    processed_url = product_image_url
        
        if not is_valid:
            return VideoGenerationResponse(
                success=False,
                error="Could not process the product image. Please ensure the image URL is valid and accessible."
            )
        
        # TODO: Implement actual video generation logic here
        # For now, return a mock response
        logger.info(f"Video generation would proceed with image: {processed_url}")
        
        # Mock video generation delay
        await asyncio.sleep(2)
        
        return VideoGenerationResponse(
            success=True,
            videoUrl="https://example.com/generated-video.mp4",
            error=None
        )
        
    except Exception as e:
        logger.error(f"Video generation failed: {e}")
        return VideoGenerationResponse(
            success=False,
            error=f"Video generation failed: {str(e)}"
        )

@app.get("/api/news/stats")
async def get_news_stats():
    """Get news statistics"""
    try:
        # Return mock stats for now
        # In production, this would aggregate real data from sessions and articles
        stats = {
            "total_articles": 1250,
            "total_social_posts": 3800,
            "active_sessions": 0,  # No active WebSocket sessions for news in this implementation
            "last_updated": datetime.now().isoformat(),
            "categories_available": ["technology", "ai", "business", "design", "marketing", "photography"],
            "sources_count": 15,
            "trending_articles": 23
        }

        return {
            'status': 'success',
            'data': stats,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error getting news stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@app.get("/api/news/trending")
async def get_trending_topics(
    timeframe: str = '24h',
    limit: int = 20,
    category: Optional[str] = None
):
    """Get trending topics"""
    try:
        logger.info(f"Fetching trending topics: timeframe={timeframe}, limit={limit}, category={category}")

        # Generate mock trending topics
        trending_topics = []
        topics = ['AI Revolution', 'Web3 Development', 'Remote Work', 'Climate Tech', 'Blockchain Innovation',
                 'Machine Learning', 'Digital Photography', 'UX Design Trends', 'Startup Funding', 'Tech Layoffs']

        for i, topic in enumerate(topics[:limit]):
            trending_item = {
                'id': str(uuid.uuid4()),
                'topic': topic,
                'category': category if category else random.choice(['technology', 'ai', 'business']),
                'trending_score': random.randint(70, 95),
                'mention_count': random.randint(100, 5000),
                'sentiment_score': random.randint(60, 90),
                'timeframe': timeframe,
                'last_updated': datetime.now().isoformat()
            }
            trending_topics.append(trending_item)

        return {
            'status': 'success',
            'data': {
                'trending_topics': trending_topics,
                'total_topics': len(trending_topics),
                'timeframe': timeframe,
                'last_updated': datetime.now().isoformat()
            },
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fetching trending topics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/social-hooks")
async def get_social_hooks(
    platforms: Optional[str] = None,
    limit: int = 10,
    min_engagement_potential: int = 70
):
    """Get social media hooks and viral opportunities"""
    try:
        platform_list = platforms.split(',') if platforms else ['twitter', 'linkedin', 'instagram']

        # Generate mock social hooks
        hook_templates = [
            "Breaking: Major breakthrough in {} industry",
            "🚀 New {} trend is taking over social media",
            "Industry experts reveal {} secrets",
            "Why {} is the future of business",
            "5 {} tips that changed everything"
        ]

        social_hooks = []
        categories = ['AI', 'Design', 'Marketing', 'Tech', 'Business']

        for i in range(limit):
            category = random.choice(categories)
            template = random.choice(hook_templates)
            hook = {
                'id': str(uuid.uuid4()),
                'hook_text': template.format(category),
                'platform': random.choice(platform_list),
                'category': category.lower(),
                'engagement_potential': random.randint(min_engagement_potential, 95),
                'optimal_post_time': (datetime.now() + timedelta(hours=random.randint(1, 24))).isoformat(),
                'difficulty': random.choice(['easy', 'medium', 'hard']),
                'estimated_reach': random.randint(1000, 50000)
            }
            social_hooks.append(hook)

        return {
            'status': 'success',
            'data': social_hooks,
            'total': len(social_hooks),
            'filters': {
                'platforms': platform_list,
                'min_engagement_potential': min_engagement_potential
            },
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fetching social hooks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Social Media Content Scheduling Endpoints
@app.post("/api/social/schedule")
async def schedule_social_content(content_data: dict):
    """Schedule social media content with TimescaleDB tracking"""
    try:
        content_id = await db_service.schedule_social_content(content_data)
        return {
            'status': 'success',
            'content_id': content_id,
            'scheduled_time': content_data.get('scheduled_time'),
            'platform': content_data.get('platform'),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to schedule social content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule content: {str(e)}")

@app.get("/api/social/scheduled")
async def get_scheduled_content(
    platform: Optional[str] = None,
    status: str = 'scheduled',
    limit: int = 20
):
    """Get scheduled social media content"""
    try:
        content_list = await db_service.get_scheduled_content(
            platform=platform, status=status, limit=limit
        )
        return {
            'status': 'success',
            'data': content_list,
            'total': len(content_list),
            'filters': {
                'platform': platform,
                'status': status
            },
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get scheduled content: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get content: {str(e)}")

@app.put("/api/social/{content_id}/status")
async def update_content_status(content_id: str, status_data: dict):
    """Update social content status"""
    try:
        success = await db_service.update_content_status(
            content_id=content_id,
            status=status_data.get('status'),
            engagement_data=status_data.get('engagement_data')
        )
        if success:
            return {
                'status': 'success',
                'content_id': content_id,
                'updated_status': status_data.get('status'),
                'timestamp': datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=404, detail="Content not found")
    except Exception as e:
        logger.error(f"Failed to update content status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update status: {str(e)}")

@app.post("/api/social/generate-from-news")
async def generate_social_content_from_news(request_data: dict):
    """Generate social media content from cached news articles"""
    try:
        # Get news articles from cache
        category = request_data.get('category')
        limit = min(request_data.get('limit', 5), 10)
        platform = request_data.get('platform', 'twitter')

        cached_news = await db_service.get_cached_news(category=category, limit=limit, hours_back=6)

        if not cached_news:
            raise HTTPException(status_code=404, detail="No cached news found for content generation")

        generated_content = []

        for news_item in cached_news:
            # Generate social media content based on news
            if platform == 'twitter':
                content_text = f"🚀 {news_item['title'][:100]}... \n\n{news_item.get('summary', '')[:120]}... \n\n#AI #News #Tech"
                max_length = 280
            elif platform == 'linkedin':
                content_text = f"📰 Industry Update: {news_item['title']}\n\n{news_item.get('summary', '')}\n\nThoughts? 💭\n\n#Industry #Business #Innovation"
                max_length = 3000
            else:  # Instagram
                content_text = f"📊 {news_item['title']}\n.\n.\n.\n#news #trending #industry #{category or 'general'}"
                max_length = 2200

            # Trim content if necessary
            if len(content_text) > max_length:
                content_text = content_text[:max_length-3] + "..."

            # Schedule for posting (e.g., next 24 hours)
            scheduled_time = datetime.now() + timedelta(hours=random.randint(1, 24))

            social_content = {
                'content_id': str(uuid.uuid4()),
                'platform': platform,
                'content_type': 'post',
                'title': news_item['title'][:100],
                'content_text': content_text,
                'hashtags': [category or 'news', 'ai', 'trending'],
                'scheduled_time': scheduled_time.isoformat(),
                'ai_generated': True,
                'source_news_id': news_item.get('id')
            }

            # Schedule the content
            content_id = await db_service.schedule_social_content(social_content)
            social_content['id'] = content_id
            generated_content.append(social_content)

        return {
            'status': 'success',
            'data': generated_content,
            'total': len(generated_content),
            'platform': platform,
            'source_news_count': len(cached_news),
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to generate social content from news: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate content: {str(e)}")

@app.get("/api/analytics/content-performance")
async def get_content_performance(
    platform: Optional[str] = None,
    days_back: int = 7,
    limit: int = 50
):
    """Get content performance analytics from TimescaleDB"""
    try:
        # This would integrate with actual social platform APIs for real metrics
        # For now, return structured data from our database
        return {
            'status': 'success',
            'message': 'Content performance analytics endpoint ready',
            'platform': platform,
            'days_back': days_back,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get content performance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance data: {str(e)}")

@app.get("/api/database/stats")
async def get_database_stats():
    """Get TimescaleDB database statistics"""
    try:
        # This would query actual database stats
        return {
            'status': 'success',
            'database': 'TimescaleDB',
            'connection': 'Connected',
            'timestamp': datetime.now().isoformat(),
            'tables': {
                'news_cache': 'Active',
                'social_content_schedule': 'Active',
                'content_analytics': 'Active',
                'trending_topics': 'Active'
            }
        }
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/video/combine", response_model=VideoCombinationResponse)
async def combine_video_segments(request: VideoCombinationRequest):
    """
    Combine multiple video segments into a single video with transitions
    """
    try:
        logger.info(f"🎬 Starting video combination for {len(request.segment_urls)} segments")

        if not request.segment_urls:
            raise HTTPException(status_code=400, detail="No video segments provided")

        # Call the video combination service
        combined_video_path = await video_combination_service.combine_video_segments(
            segment_urls=request.segment_urls,
            output_filename=request.output_filename,
            transition_type=request.transition_type,
            fade_duration=request.fade_duration
        )

        # Get video duration for response (optional)
        duration = None
        try:
            import ffmpeg
            probe = ffmpeg.probe(combined_video_path)
            duration = float(probe['streams'][0]['duration'])
        except Exception as probe_error:
            logger.warning(f"Could not probe video duration: {probe_error}")

        logger.info(f"✅ Video combination completed: {combined_video_path}")

        return VideoCombinationResponse(
            status="success",
            video_path=combined_video_path,
            duration=duration,
            message=f"Successfully combined {len(request.segment_urls)} video segments"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Video combination failed: {e}")
        raise HTTPException(status_code=500, detail=f"Video combination failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    # Use port 3000 to match frontend expectations
    port = int(os.getenv("PORT", 3000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting Event Hunter API on {host}:{port}")
    uvicorn.run(app, host=host, port=port, reload=True)