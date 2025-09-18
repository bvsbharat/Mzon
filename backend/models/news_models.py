"""
Pydantic models for news discovery API (simplified version)
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class NewsCategory(str, Enum):
    TECHNOLOGY = "technology"
    AI = "ai"
    DESIGN = "design"
    MARKETING = "marketing"
    PHOTOGRAPHY = "photography"
    BUSINESS = "business"
    TOOLS = "tools"
    RESOURCES = "resources"

class AgentStatus(str, Enum):
    IDLE = "idle"
    SEARCHING = "searching"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

class NewsDiscoveryRequest(BaseModel):
    tags: List[str]
    categories: Optional[List[NewsCategory]] = None
    max_articles: Optional[int] = 20
    language: Optional[str] = "en"
    country: Optional[str] = "us"

class TagSubscriptionRequest(BaseModel):
    tags: List[str]
    interval_minutes: Optional[int] = 60

class NewsItem(BaseModel):
    id: str
    title: str
    description: str
    content: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    source: str
    published_at: datetime
    category: Optional[NewsCategory] = None
    tags: List[str] = []
    credibility_score: Optional[float] = None
    engagement_score: Optional[float] = None
    relevance_score: Optional[float] = None
    reading_time: Optional[int] = None
    hashtags: List[str] = []

class SocialMediaPost(BaseModel):
    platform: str
    content: str
    hashtags: List[str]
    image_url: Optional[str] = None
    character_count: int
    engagement_prediction: Optional[float] = None

class ProcessedNewsItem(NewsItem):
    summary: Optional[str] = None
    key_points: List[str] = []
    social_posts: List[SocialMediaPost] = []
    sentiment: Optional[str] = None
    trending_potential: Optional[float] = None

class AgentUpdate(BaseModel):
    agent_name: str
    status: AgentStatus
    message: str
    progress: Optional[float] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class NewsResponse(BaseModel):
    session_id: str
    status: str
    message: str
    articles: Optional[List[ProcessedNewsItem]] = None
    total_found: Optional[int] = None
    processing_time: Optional[float] = None

class NewsStats(BaseModel):
    active_sessions: int
    total_articles_processed: int
    active_monitors: int
    cache_hit_rate: float
    average_processing_time: float
    last_update: datetime

class MonitoringSession(BaseModel):
    session_id: str
    tags: List[str]
    categories: List[NewsCategory]
    status: str
    created_at: datetime
    last_update: datetime
    articles_found: int
    is_monitoring: bool = False