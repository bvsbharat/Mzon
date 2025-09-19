import asyncpg
import asyncio
import json
import os
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from asyncio_throttle import Throttler
import uuid
import logging
from dotenv import load_dotenv

load_dotenv()  # Load environment variables explicitly

logger = logging.getLogger(__name__)

class TimescaleDBService:
    """
    TimescaleDB service for news caching and social media content scheduling.
    Optimized for time-series data with automatic retention policies.
    """

    def __init__(self):
        self.connection_string = os.getenv("TIMESCALE_CONNECTION_STRING")
        self.pool = None
        self.throttler = Throttler(rate_limit=100)  # 100 queries per second

    async def initialize(self):
        """Initialize the database connection pool and create tables"""
        if not self.connection_string:
            raise ValueError("TIMESCALE_CONNECTION_STRING not found in environment variables")

        try:
            # Create connection pool
            self.pool = await asyncpg.create_pool(
                self.connection_string,
                min_size=5,
                max_size=20,
                command_timeout=60
            )

            logger.info("TimescaleDB connection pool created successfully")

            # Initialize database schema
            await self._create_tables()
            logger.info("Database schema initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize TimescaleDB: {e}")
            raise e

    async def close(self):
        """Close the database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("TimescaleDB connection pool closed")

    async def _create_tables(self):
        """Create TimescaleDB tables with hypertables for time-series data"""
        async with self.pool.acquire() as conn:
            # Enable TimescaleDB extension
            await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

            # News cache table with time-series optimization
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS news_cache (
                    id UUID DEFAULT gen_random_uuid(),
                    article_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    summary TEXT,
                    url TEXT,
                    source TEXT,
                    published_at TIMESTAMPTZ,
                    category TEXT,
                    sentiment TEXT DEFAULT 'neutral',
                    trending_potential INTEGER DEFAULT 50,
                    tags TEXT[], -- Array of tags
                    social_engagement JSONB DEFAULT '{}',
                    content_hash TEXT, -- For deduplication
                    fetch_timestamp TIMESTAMPTZ DEFAULT NOW(),
                    last_updated TIMESTAMPTZ DEFAULT NOW(),
                    expiry_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
                    is_cached BOOLEAN DEFAULT true,
                    agent_source TEXT, -- Which agent/tool fetched this
                    raw_data JSONB, -- Store original API response
                    PRIMARY KEY (id, fetch_timestamp) -- Composite key for hypertable
                );
            """)

            # Convert to hypertable for time-series optimization
            try:
                await conn.execute("""
                    SELECT create_hypertable('news_cache', 'fetch_timestamp',
                                           if_not_exists => TRUE);
                """)
            except Exception as e:
                if "already a hypertable" not in str(e):
                    logger.warning(f"Failed to create hypertable for news_cache: {e}")

            # Social media content scheduling table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS social_content_schedule (
                    id UUID DEFAULT gen_random_uuid(),
                    content_id TEXT NOT NULL,
                    platform TEXT NOT NULL, -- twitter, linkedin, instagram, etc.
                    content_type TEXT NOT NULL, -- post, story, video, etc.
                    title TEXT,
                    content_text TEXT,
                    media_urls TEXT[], -- Array of image/video URLs
                    hashtags TEXT[],
                    scheduled_time TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    status TEXT DEFAULT 'scheduled', -- scheduled, posted, failed, cancelled
                    posted_at TIMESTAMPTZ,
                    engagement_data JSONB DEFAULT '{}', -- likes, shares, comments
                    campaign_id TEXT, -- Link to campaign
                    target_audience JSONB, -- Audience targeting info
                    ai_generated BOOLEAN DEFAULT false,
                    source_news_id UUID,
                    performance_metrics JSONB DEFAULT '{}',
                    retry_count INTEGER DEFAULT 0,
                    last_error TEXT,
                    PRIMARY KEY (id, scheduled_time) -- Composite key for hypertable
                );
            """)

            # Convert to hypertable
            try:
                await conn.execute("""
                    SELECT create_hypertable('social_content_schedule', 'scheduled_time',
                                           if_not_exists => TRUE);
                """)
            except Exception as e:
                if "already a hypertable" not in str(e):
                    logger.warning(f"Failed to create hypertable for social_content_schedule: {e}")

            # Content performance analytics table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS content_analytics (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    content_id UUID REFERENCES social_content_schedule(id),
                    metric_name TEXT NOT NULL, -- views, likes, shares, comments, etc.
                    metric_value NUMERIC NOT NULL,
                    recorded_at TIMESTAMPTZ DEFAULT NOW(),
                    platform TEXT,
                    additional_data JSONB DEFAULT '{}'
                );
            """)

            # Convert to hypertable
            try:
                await conn.execute("""
                    SELECT create_hypertable('content_analytics', 'recorded_at',
                                           if_not_exists => TRUE);
                """)
            except Exception as e:
                if "already a hypertable" not in str(e):
                    logger.warning(f"Failed to create hypertable for content_analytics: {e}")

            # Trending topics table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS trending_topics (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    topic TEXT NOT NULL,
                    category TEXT,
                    trending_score INTEGER DEFAULT 0,
                    mention_count INTEGER DEFAULT 0,
                    sentiment_score NUMERIC DEFAULT 0.0,
                    first_detected TIMESTAMPTZ DEFAULT NOW(),
                    last_updated TIMESTAMPTZ DEFAULT NOW(),
                    peak_score INTEGER DEFAULT 0,
                    peak_time TIMESTAMPTZ,
                    related_keywords TEXT[],
                    source_data JSONB DEFAULT '{}'
                );
            """)

            # Convert to hypertable
            try:
                await conn.execute("""
                    SELECT create_hypertable('trending_topics', 'last_updated',
                                           if_not_exists => TRUE);
                """)
            except Exception as e:
                if "already a hypertable" not in str(e):
                    logger.warning(f"Failed to create hypertable for trending_topics: {e}")

            # Create indexes for better performance
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_news_cache_category ON news_cache(category);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_news_cache_tags ON news_cache USING GIN(tags);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_news_cache_content_hash ON news_cache(content_hash);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_social_schedule_platform ON social_content_schedule(platform);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_social_schedule_status ON social_content_schedule(status);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_trending_topic ON trending_topics(topic);")

            # Skip retention policies for now to get basic functionality working
            # These can be added later once hypertables are properly configured
            logger.info("Database schema setup completed")

    # News caching methods
    async def cache_news_article(self, article_data: Dict[str, Any]) -> str:
        """Cache a news article in TimescaleDB"""
        async with self.throttler:
            try:
                async with self.pool.acquire() as conn:
                    # Generate content hash for deduplication
                    content_hash = str(hash(f"{article_data.get('title', '')}{article_data.get('url', '')}"))

                    # Check if article already exists
                    existing = await conn.fetchrow(
                        "SELECT id FROM news_cache WHERE content_hash = $1",
                        content_hash
                    )

                    if existing:
                        # Update existing article
                        await conn.execute("""
                            UPDATE news_cache SET
                                last_updated = NOW(),
                                social_engagement = $1,
                                trending_potential = $2
                            WHERE content_hash = $3
                        """,
                        json.dumps(article_data.get('social_engagement', {})),
                        article_data.get('trending_potential', 50),
                        content_hash
                        )
                        return str(existing['id'])
                    else:
                        # Insert new article
                        article_id = await conn.fetchval("""
                            INSERT INTO news_cache (
                                article_id, title, summary, url, source, published_at,
                                category, sentiment, trending_potential, tags,
                                social_engagement, content_hash, agent_source, raw_data
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                            RETURNING id
                        """,
                        article_data.get('id', str(uuid.uuid4())),
                        article_data.get('title'),
                        article_data.get('summary'),
                        article_data.get('url'),
                        article_data.get('source'),
                        datetime.fromisoformat(article_data.get('publishedAt').replace('Z', '+00:00')) if article_data.get('publishedAt') else datetime.now(),
                        article_data.get('category'),
                        article_data.get('sentiment', 'neutral'),
                        article_data.get('trending_potential', 50),
                        article_data.get('tags', []),
                        json.dumps(article_data.get('social_engagement', {})),
                        content_hash,
                        article_data.get('agent_source', 'brightdata'),
                        json.dumps(article_data)
                        )
                        return str(article_id)

            except Exception as e:
                logger.error(f"Failed to cache news article: {e}")
                raise e

    async def get_cached_news(self, category: Optional[str] = None, limit: int = 10,
                            hours_back: int = 24) -> List[Dict[str, Any]]:
        """Retrieve cached news articles"""
        async with self.throttler:
            try:
                async with self.pool.acquire() as conn:
                    query = """
                        SELECT * FROM news_cache
                        WHERE fetch_timestamp >= NOW() - INTERVAL '%d hours'
                        AND (expiry_date IS NULL OR expiry_date > NOW())
                    """ % hours_back

                    params = []
                    param_count = 1

                    if category:
                        query += f" AND category = ${param_count}"
                        params.append(category)
                        param_count += 1

                    query += f" ORDER BY fetch_timestamp DESC LIMIT ${param_count}"
                    params.append(limit)

                    rows = await conn.fetch(query, *params)

                    articles = []
                    for row in rows:
                        article = {
                            'id': str(row['article_id']),
                            'title': row['title'],
                            'summary': row['summary'],
                            'url': row['url'],
                            'source': row['source'],
                            'publishedAt': row['published_at'].isoformat() if row['published_at'] else None,
                            'category': row['category'],
                            'sentiment': row['sentiment'],
                            'trending_potential': row['trending_potential'],
                            'tags': row['tags'] or [],
                            'social_engagement': json.loads(row['social_engagement']) if row['social_engagement'] else {},
                            'cached_at': row['fetch_timestamp'].isoformat(),
                            'agent_source': row['agent_source']
                        }
                        articles.append(article)

                    return articles

            except Exception as e:
                logger.error(f"Failed to get cached news: {e}")
                return []

    # Social media scheduling methods
    async def schedule_social_content(self, content_data: Dict[str, Any]) -> str:
        """Schedule social media content"""
        async with self.throttler:
            try:
                async with self.pool.acquire() as conn:
                    content_id = await conn.fetchval("""
                        INSERT INTO social_content_schedule (
                            content_id, platform, content_type, title, content_text,
                            media_urls, hashtags, scheduled_time, campaign_id,
                            target_audience, ai_generated, source_news_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        RETURNING id
                    """,
                    content_data.get('content_id', str(uuid.uuid4())),
                    content_data.get('platform'),
                    content_data.get('content_type', 'post'),
                    content_data.get('title'),
                    content_data.get('content_text'),
                    content_data.get('media_urls', []),
                    content_data.get('hashtags', []),
                    datetime.fromisoformat(content_data['scheduled_time'].replace('Z', '+00:00')) if isinstance(content_data['scheduled_time'], str) else content_data['scheduled_time'],
                    content_data.get('campaign_id'),
                    json.dumps(content_data.get('target_audience', {})),
                    content_data.get('ai_generated', False),
                    content_data.get('source_news_id')
                    )
                    return str(content_id)

            except Exception as e:
                logger.error(f"Failed to schedule social content: {e}")
                raise e

    async def get_scheduled_content(self, platform: Optional[str] = None,
                                  status: str = 'scheduled', limit: int = 20) -> List[Dict[str, Any]]:
        """Get scheduled social media content"""
        async with self.throttler:
            try:
                async with self.pool.acquire() as conn:
                    query = """
                        SELECT sc.*, nc.title as news_title, nc.url as news_url
                        FROM social_content_schedule sc
                        LEFT JOIN news_cache nc ON sc.source_news_id = nc.id
                        WHERE sc.status = $1
                    """
                    params = [status]
                    param_count = 2

                    if platform:
                        query += f" AND sc.platform = ${param_count}"
                        params.append(platform)
                        param_count += 1

                    query += f" ORDER BY sc.scheduled_time ASC LIMIT ${param_count}"
                    params.append(limit)

                    rows = await conn.fetch(query, *params)

                    content_list = []
                    for row in rows:
                        content = {
                            'id': str(row['id']),
                            'content_id': row['content_id'],
                            'platform': row['platform'],
                            'content_type': row['content_type'],
                            'title': row['title'],
                            'content_text': row['content_text'],
                            'media_urls': row['media_urls'] or [],
                            'hashtags': row['hashtags'] or [],
                            'scheduled_time': row['scheduled_time'].isoformat(),
                            'status': row['status'],
                            'campaign_id': row['campaign_id'],
                            'ai_generated': row['ai_generated'],
                            'source_news': {
                                'title': row['news_title'],
                                'url': row['news_url']
                            } if row['news_title'] else None
                        }
                        content_list.append(content)

                    return content_list

            except Exception as e:
                logger.error(f"Failed to get scheduled content: {e}")
                return []

    async def update_content_status(self, content_id: str, status: str,
                                  engagement_data: Optional[Dict] = None) -> bool:
        """Update social content status and engagement data"""
        async with self.throttler:
            try:
                async with self.pool.acquire() as conn:
                    if status == 'posted':
                        await conn.execute("""
                            UPDATE social_content_schedule SET
                                status = $1, posted_at = NOW(), engagement_data = $2
                            WHERE id = $3
                        """, status, json.dumps(engagement_data or {}), content_id)
                    else:
                        await conn.execute("""
                            UPDATE social_content_schedule SET status = $1
                            WHERE id = $2
                        """, status, content_id)

                    return True

            except Exception as e:
                logger.error(f"Failed to update content status: {e}")
                return False

    # Analytics and trending methods
    async def record_content_metric(self, content_id: str, metric_name: str,
                                  metric_value: float, platform: str) -> bool:
        """Record a content performance metric"""
        async with self.throttler:
            try:
                async with self.pool.acquire() as conn:
                    await conn.execute("""
                        INSERT INTO content_analytics (content_id, metric_name, metric_value, platform)
                        VALUES ($1, $2, $3, $4)
                    """, content_id, metric_name, metric_value, platform)
                    return True

            except Exception as e:
                logger.error(f"Failed to record content metric: {e}")
                return False

    async def get_trending_topics(self, category: Optional[str] = None,
                                limit: int = 20, hours_back: int = 24) -> List[Dict[str, Any]]:
        """Get trending topics from the database"""
        async with self.throttler:
            try:
                async with self.pool.acquire() as conn:
                    query = """
                        SELECT * FROM trending_topics
                        WHERE last_updated >= NOW() - INTERVAL '%d hours'
                    """ % hours_back

                    params = []
                    param_count = 1

                    if category:
                        query += f" AND category = ${param_count}"
                        params.append(category)
                        param_count += 1

                    query += f" ORDER BY trending_score DESC LIMIT ${param_count}"
                    params.append(limit)

                    rows = await conn.fetch(query, *params)

                    topics = []
                    for row in rows:
                        topic = {
                            'id': str(row['id']),
                            'topic': row['topic'],
                            'category': row['category'],
                            'trending_score': row['trending_score'],
                            'mention_count': row['mention_count'],
                            'sentiment_score': float(row['sentiment_score']) if row['sentiment_score'] else 0.0,
                            'first_detected': row['first_detected'].isoformat(),
                            'last_updated': row['last_updated'].isoformat(),
                            'related_keywords': row['related_keywords'] or []
                        }
                        topics.append(topic)

                    return topics

            except Exception as e:
                logger.error(f"Failed to get trending topics: {e}")
                return []

    async def cleanup_expired_data(self):
        """Clean up expired cached data"""
        async with self.throttler:
            try:
                async with self.pool.acquire() as conn:
                    # Clean expired news cache
                    deleted_news = await conn.execute("""
                        DELETE FROM news_cache
                        WHERE expiry_date < NOW()
                    """)

                    # Clean old failed/cancelled social content
                    deleted_social = await conn.execute("""
                        DELETE FROM social_content_schedule
                        WHERE status IN ('failed', 'cancelled')
                        AND created_at < NOW() - INTERVAL '30 days'
                    """)

                    logger.info(f"Cleaned up expired data: {deleted_news} news articles, {deleted_social} social content")

            except Exception as e:
                logger.error(f"Failed to cleanup expired data: {e}")

# Global instance
db_service = TimescaleDBService()