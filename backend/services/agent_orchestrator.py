"""
Agent Orchestrator - Simplified version for demo
"""
import asyncio
import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from models.news_models import (
    NewsCategory, AgentStatus, AgentUpdate, ProcessedNewsItem,
    NewsStats, MonitoringSession, NewsItem, SocialMediaPost
)

logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """
    Simplified orchestrator for demo purposes
    """

    def __init__(self):
        self.active_sessions: Dict[str, MonitoringSession] = {}
        self.stats = {
            "total_sessions": 0,
            "total_articles_processed": 0,
            "active_monitors": 0,
            "start_time": datetime.now()
        }

    async def initialize(self):
        """Initialize the orchestrator"""
        logger.info("Initializing Agent Orchestrator (Demo Mode)...")
        logger.info("Agent Orchestrator initialized successfully")

    async def start_discovery(
        self,
        tags: List[str],
        categories: Optional[List[NewsCategory]] = None,
        max_articles: int = 20,
        websocket_manager: Optional[Any] = None
    ) -> str:
        """
        Start news discovery process (demo with mock data)
        """
        session_id = str(uuid.uuid4())
        logger.info(f"Starting discovery session {session_id} for tags: {tags}")

        # Create monitoring session
        session = MonitoringSession(
            session_id=session_id,
            tags=tags,
            categories=categories or [],
            status="starting",
            created_at=datetime.now(),
            last_update=datetime.now(),
            articles_found=0
        )

        self.active_sessions[session_id] = session
        self.stats["total_sessions"] += 1

        # Send initial update via WebSocket
        if websocket_manager:
            await websocket_manager.send_update(
                session_id,
                AgentUpdate(
                    agent_name="orchestrator",
                    status=AgentStatus.SEARCHING,
                    message=f"Starting news discovery for tags: {', '.join(tags)}",
                    progress=0
                )
            )

        # Start the discovery process in background
        asyncio.create_task(
            self._run_discovery_demo(session_id, tags, categories, max_articles, websocket_manager)
        )

        return session_id

    async def _run_discovery_demo(
        self,
        session_id: str,
        tags: List[str],
        categories: Optional[List[NewsCategory]],
        max_articles: int,
        websocket_manager: Optional[Any]
    ):
        """
        Demo discovery process with mock data and realistic progress
        """
        try:
            session = self.active_sessions[session_id]
            session.status = "running"

            # Simulate agent workflow
            agents = [
                {"name": "NewsSearchAgent", "task": "Searching multiple news sources..."},
                {"name": "NewsDetailsAgent", "task": "Extracting detailed content..."},
                {"name": "TagFilterAgent", "task": "Filtering by relevance..."},
                {"name": "SocialContentAgent", "task": "Optimizing for social media..."}
            ]

            total_steps = len(agents) * 3  # 3 steps per agent
            current_step = 0

            mock_articles = []

            for agent in agents:
                # Agent starting
                if websocket_manager:
                    await websocket_manager.send_update(
                        session_id,
                        AgentUpdate(
                            agent_name=agent["name"],
                            status=AgentStatus.PROCESSING,
                            message=f"Starting: {agent['task']}",
                            progress=(current_step / total_steps) * 100
                        )
                    )

                await asyncio.sleep(1)  # Simulate processing time
                current_step += 1

                # Agent processing
                if websocket_manager:
                    await websocket_manager.send_update(
                        session_id,
                        AgentUpdate(
                            agent_name=agent["name"],
                            status=AgentStatus.PROCESSING,
                            message=f"Processing: {agent['task']}",
                            progress=(current_step / total_steps) * 100
                        )
                    )

                await asyncio.sleep(1)
                current_step += 1

                # Agent completing with mock data
                if agent["name"] == "NewsSearchAgent":
                    mock_articles = self._generate_mock_articles(tags, max_articles)

                if websocket_manager:
                    await websocket_manager.send_update(
                        session_id,
                        AgentUpdate(
                            agent_name=agent["name"],
                            status=AgentStatus.COMPLETED,
                            message=f"Completed: {agent['task']}",
                            progress=(current_step / total_steps) * 100,
                            data={"articles_processed": len(mock_articles)} if mock_articles else None
                        )
                    )

                await asyncio.sleep(1)
                current_step += 1

            # Update session
            session.status = "completed"
            session.articles_found = len(mock_articles)
            session.last_update = datetime.now()
            self.stats["total_articles_processed"] += len(mock_articles)

            # Send final completion update
            if websocket_manager:
                await websocket_manager.send_update(
                    session_id,
                    AgentUpdate(
                        agent_name="orchestrator",
                        status=AgentStatus.COMPLETED,
                        message=f"Discovery completed! Found {len(mock_articles)} articles",
                        progress=100,
                        data={
                            "total_articles": len(mock_articles),
                            "processed_articles": [article.dict() for article in mock_articles[:3]]  # Send sample
                        }
                    )
                )

            logger.info(f"Discovery session {session_id} completed with {len(mock_articles)} articles")

        except Exception as e:
            logger.error(f"Error in discovery session {session_id}: {str(e)}")

            if session_id in self.active_sessions:
                self.active_sessions[session_id].status = "error"

            if websocket_manager:
                await websocket_manager.send_update(
                    session_id,
                    AgentUpdate(
                        agent_name="orchestrator",
                        status=AgentStatus.ERROR,
                        message=f"Discovery failed: {str(e)}",
                        progress=0
                    )
                )

    def _generate_mock_articles(self, tags: List[str], max_articles: int) -> List[ProcessedNewsItem]:
        """Generate mock articles based on tags"""
        mock_templates = [
            {
                "title": "AI-Powered Content Creation Transforms {tag} Industry",
                "description": "Latest developments in AI are revolutionizing how {tag} professionals work, offering unprecedented efficiency and creativity.",
                "category": "ai" if "ai" in " ".join(tags).lower() else "technology",
                "source": "Tech News Daily"
            },
            {
                "title": "Breaking: Major Breakthrough in {tag} Technology",
                "description": "Researchers announce significant advancement in {tag} that could change the industry landscape.",
                "category": "technology",
                "source": "Innovation Report"
            },
            {
                "title": "Top 10 {tag} Tools Every Professional Should Know in 2024",
                "description": "Comprehensive guide to the most essential {tag} tools that are shaping modern workflows.",
                "category": "tools",
                "source": "Professional Guide"
            }
        ]

        articles = []
        for i, template in enumerate(mock_templates[:max_articles]):
            primary_tag = tags[0] if tags else "technology"

            # Generate social media posts
            social_posts = [
                SocialMediaPost(
                    platform="twitter",
                    content=f"🚀 {template['title'].format(tag=primary_tag)}",
                    hashtags=[f"#{tag.replace(' ', '')}" for tag in tags[:3]],
                    character_count=140,
                    engagement_prediction=75.0 + (i * 5)
                ),
                SocialMediaPost(
                    platform="linkedin",
                    content=f"💡 {template['description'].format(tag=primary_tag)}\n\nWhat are your thoughts?",
                    hashtags=[f"#{tag.replace(' ', '')}" for tag in tags[:5]],
                    character_count=200,
                    engagement_prediction=80.0 + (i * 3)
                )
            ]

            article = ProcessedNewsItem(
                id=f"demo_{i+1}",
                title=template["title"].format(tag=primary_tag),
                description=template["description"].format(tag=primary_tag),
                url=f"https://example.com/news/demo_{i+1}",
                image_url=f"https://images.unsplash.com/photo-{1600000000 + i}?w=400&h=200&fit=crop",
                source=template["source"],
                published_at=datetime.now(),
                category=NewsCategory(template["category"]),
                tags=tags,
                credibility_score=85.0 + (i * 2),
                engagement_score=78.0 + (i * 3),
                relevance_score=90.0 - (i * 2),
                reading_time=2 + (i % 3),
                hashtags=[f"#{tag.replace(' ', '')}" for tag in tags[:4]],
                summary=f"This article discusses {primary_tag} and its impact on modern workflows.",
                key_points=[
                    f"Key insight about {primary_tag} applications",
                    f"Impact on {primary_tag} industry trends",
                    f"Future implications for {primary_tag} professionals"
                ],
                social_posts=social_posts,
                sentiment="positive" if i % 2 == 0 else "neutral",
                trending_potential=70.0 + (i * 5)
            )
            articles.append(article)

        return articles

    async def get_stats(self) -> NewsStats:
        """Get current statistics"""
        uptime = (datetime.now() - self.stats["start_time"]).total_seconds()
        avg_processing_time = uptime / max(self.stats["total_sessions"], 1)

        return NewsStats(
            active_sessions=len(self.active_sessions),
            total_articles_processed=self.stats["total_articles_processed"],
            active_monitors=self.stats["active_monitors"],
            cache_hit_rate=0.85,  # Mock cache hit rate
            average_processing_time=avg_processing_time,
            last_update=datetime.now()
        )

    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up Agent Orchestrator...")
        self.active_sessions.clear()
        logger.info("Agent Orchestrator cleanup completed")