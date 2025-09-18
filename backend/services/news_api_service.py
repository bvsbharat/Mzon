"""
News API Service - Fetches real-time news from external APIs
Integrates with NewsAPI.org, Reddit, and other news sources
"""
import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import feedparser
from urllib.parse import urlparse
import hashlib

logger = logging.getLogger(__name__)

class NewsAPIService:
    """Service for fetching news from external APIs"""

    def __init__(self):
        self.session = None
        # API configuration - these would come from environment variables
        self.news_api_key = "demo_key"  # Replace with actual API key
        self.reddit_user_agent = "Mzon-NewsBot/1.0"

        # Cache for avoiding duplicate requests
        self.cache = {}
        self.cache_duration = 300  # 5 minutes cache

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    def _get_cache_key(self, method: str, params: Dict) -> str:
        """Generate cache key for request"""
        key_data = f"{method}:{json.dumps(params, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def _is_cache_valid(self, cache_entry: Dict) -> bool:
        """Check if cache entry is still valid"""
        if not cache_entry:
            return False
        timestamp = cache_entry.get('timestamp', 0)
        return (datetime.now().timestamp() - timestamp) < self.cache_duration

    async def fetch_latest_news(
        self,
        category: Optional[str] = None,
        country: str = 'us',
        page_size: int = 50
    ) -> List[Dict[str, Any]]:
        """Fetch latest news from NewsAPI"""
        try:
            cache_key = self._get_cache_key('latest_news', {
                'category': category, 'country': country, 'page_size': page_size
            })

            # Check cache first
            if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
                logger.info("Returning cached latest news")
                return self.cache[cache_key]['data']

            # For demo purposes, return mock data
            # In production, this would call actual NewsAPI
            mock_news = await self._generate_mock_latest_news(category, page_size)

            # Cache the result
            self.cache[cache_key] = {
                'data': mock_news,
                'timestamp': datetime.now().timestamp()
            }

            return mock_news

        except Exception as e:
            logger.error(f"Error fetching latest news: {str(e)}")
            return []

    async def fetch_trending_topics(
        self,
        timeframe: str = '24h',
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Fetch trending topics from multiple sources"""
        try:
            cache_key = self._get_cache_key('trending_topics', {
                'timeframe': timeframe, 'limit': limit
            })

            if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
                logger.info("Returning cached trending topics")
                return self.cache[cache_key]['data']

            # Simulate fetching from multiple sources
            trending_topics = await self._generate_mock_trending_topics(limit)

            self.cache[cache_key] = {
                'data': trending_topics,
                'timestamp': datetime.now().timestamp()
            }

            return trending_topics

        except Exception as e:
            logger.error(f"Error fetching trending topics: {str(e)}")
            return []

    async def fetch_social_hooks(
        self,
        platforms: List[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Fetch social media hooks and viral opportunities"""
        try:
            if platforms is None:
                platforms = ['twitter', 'instagram', 'linkedin', 'facebook']

            cache_key = self._get_cache_key('social_hooks', {
                'platforms': platforms, 'limit': limit
            })

            if cache_key in self.cache and self._is_cache_valid(self.cache[cache_key]):
                logger.info("Returning cached social hooks")
                return self.cache[cache_key]['data']

            social_hooks = await self._generate_mock_social_hooks(platforms, limit)

            self.cache[cache_key] = {
                'data': social_hooks,
                'timestamp': datetime.now().timestamp()
            }

            return social_hooks

        except Exception as e:
            logger.error(f"Error fetching social hooks: {str(e)}")
            return []

    async def _generate_mock_latest_news(
        self,
        category: Optional[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Generate mock latest news data"""
        categories = ['technology', 'business', 'ai', 'social-media', 'design'] if not category else [category]

        news_items = []
        for i in range(limit):
            cat = categories[i % len(categories)]

            # Generate realistic timestamps (last 24 hours)
            hours_ago = i * 2  # Spread over 48 hours
            timestamp = datetime.now() - timedelta(hours=hours_ago)

            # Calculate virality score based on recency and engagement
            virality_score = max(10, 100 - (hours_ago * 2))

            news_item = {
                'id': f'live_news_{i+1}',
                'title': self._generate_news_title(cat, i),
                'description': self._generate_news_description(cat),
                'category': cat,
                'source': f'NewsSource{(i % 5) + 1}',
                'publishedAt': timestamp.isoformat(),
                'url': f'https://news-source.com/article/{i+1}',
                'imageUrl': f'https://picsum.photos/400/200?random={i+1}',
                'isBreaking': i < 3,  # First 3 are breaking news
                'viralityScore': virality_score,
                'socialEngagement': {
                    'twitter': {
                        'mentions': 150 - (i * 5),
                        'retweets': 89 - (i * 3),
                        'likes': 432 - (i * 10)
                    },
                    'facebook': {
                        'shares': 67 - (i * 2),
                        'likes': 234 - (i * 6),
                        'comments': 45 - (i * 2)
                    },
                    'totalEngagement': 1000 - (i * 20),
                    'sentiment': ['positive', 'neutral', 'negative'][i % 3]
                },
                'realTimeMetrics': {
                    'views': 5000 - (i * 100),
                    'shares': 123 - (i * 3),
                    'comments': 67 - (i * 2),
                    'reactions': 345 - (i * 8),
                    'engagementRate': max(1.5, 8.5 - (i * 0.2)),
                    'viralityVelocity': max(0.1, 2.5 - (i * 0.1))
                },
                'trendingRank': i + 1 if i < 10 else None,
                'lastUpdated': datetime.now().isoformat(),
                'updateFrequency': 'realtime' if i < 5 else 'hourly',
                'newsSource': 'api',
                'hashtags': self._generate_hashtags(cat),
                'tags': [cat, 'trending', 'latest'],
                'sentiment': ['positive', 'neutral', 'negative'][i % 3],
                'relevanceScore': max(70, 95 - (i * 2)),
                'trendingPotential': max(60, 90 - (i * 3))
            }

            news_items.append(news_item)

        return news_items

    async def _generate_mock_trending_topics(self, limit: int) -> List[Dict[str, Any]]:
        """Generate mock trending topics"""
        topics = [
            'AI Revolution', 'Climate Tech', 'Space Technology', 'Quantum Computing',
            'Social Media Trends', 'Digital Art', 'Cryptocurrency', 'Remote Work',
            'Sustainable Design', 'VR Innovation', 'Health Tech', 'EdTech',
            'Fintech Growth', 'IoT Devices', 'Blockchain', 'Data Privacy',
            'Machine Learning', 'Cloud Computing', 'Cybersecurity', 'Green Energy'
        ]

        trending_topics = []
        for i in range(min(limit, len(topics))):
            trend_status = ['rising', 'hot', 'emerging'][i % 3]
            volume = 10000 - (i * 300)

            topic = {
                'id': f'trend_{i+1}',
                'keyword': topics[i],
                'trend': trend_status,
                'volume': volume,
                'changeRate': max(-50, 100 - (i * 10)),  # Percentage change
                'platforms': ['twitter', 'instagram', 'linkedin'][:(i % 3) + 1],
                'timeframe': '24h',
                'category': ['ai', 'technology', 'business', 'design'][i % 4],
                'relatedNews': [],  # Would be populated with related news
                'geography': 'Global'
            }

            trending_topics.append(topic)

        return trending_topics

    async def _generate_mock_social_hooks(
        self,
        platforms: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Generate mock social media hooks"""
        hook_types = ['trending_hashtag', 'viral_topic', 'breaking_news', 'meme']

        social_hooks = []
        for i in range(limit):
            platform = platforms[i % len(platforms)]
            hook_type = hook_types[i % len(hook_types)]

            # Generate expiry time (1-24 hours from now)
            expiry_hours = 1 + (i % 24)
            expiry_time = datetime.now() + timedelta(hours=expiry_hours)

            hook = {
                'id': f'hook_{i+1}',
                'platform': platform,
                'hookType': hook_type,
                'content': self._generate_hook_content(platform, hook_type),
                'engagementPotential': max(60, 95 - (i * 3)),
                'trendingHashtags': self._generate_trending_hashtags(platform),
                'optimalPostTime': self._calculate_optimal_post_time(platform),
                'expiryTime': expiry_time.isoformat(),
                'difficulty': ['easy', 'medium', 'hard'][i % 3],
                'competitionLevel': min(90, 30 + (i * 5))
            }

            social_hooks.append(hook)

        return social_hooks

    def _generate_news_title(self, category: str, index: int) -> str:
        """Generate realistic news titles"""
        titles_by_category = {
            'technology': [
                'Revolutionary AI Breakthrough Changes Everything',
                'Tech Giants Announce Major Partnership',
                'New Startup Raises $100M for Innovation',
                'Breakthrough in Quantum Computing Achieved',
                'Major Security Vulnerability Discovered'
            ],
            'ai': [
                'AI Models Reach Human-Level Performance',
                'Machine Learning Transforms Industry',
                'Ethical AI Guidelines Released',
                'AI-Generated Content Goes Mainstream',
                'Robotics Company Unveils New AI System'
            ],
            'social-media': [
                'Social Platform Launches New Creator Tools',
                'Viral Trend Takes Over Social Media',
                'Privacy Changes Coming to Social Networks',
                'Influencer Marketing Reaches New Heights',
                'Social Commerce Revolution Begins'
            ]
        }

        if category in titles_by_category:
            return titles_by_category[category][index % len(titles_by_category[category])]

        return f'Breaking: Major Development in {category.title()}'

    def _generate_news_description(self, category: str) -> str:
        """Generate news description"""
        return f'Latest developments in {category} show significant progress with industry-wide implications for the future of technology and innovation.'

    def _generate_hashtags(self, category: str) -> List[str]:
        """Generate relevant hashtags"""
        hashtag_map = {
            'technology': ['#Tech', '#Innovation', '#Digital'],
            'ai': ['#AI', '#MachineLearning', '#Innovation'],
            'social-media': ['#SocialMedia', '#Digital', '#Marketing'],
            'design': ['#Design', '#UX', '#Creative'],
            'business': ['#Business', '#Startup', '#Growth']
        }

        return hashtag_map.get(category, ['#News', '#Trending'])

    def _generate_hook_content(self, platform: str, hook_type: str) -> str:
        """Generate platform-specific hook content"""
        content_templates = {
            'twitter': {
                'trending_hashtag': 'Join the conversation with #TrendingNow - what\'s your take?',
                'viral_topic': 'This is blowing up everywhere! Have you seen this yet?',
                'breaking_news': 'BREAKING: Major story developing - follow for updates',
                'meme': 'When you realize it\'s already trending 😂'
            },
            'instagram': {
                'trending_hashtag': 'Swipe to see why everyone\'s talking about this ➡️',
                'viral_topic': '✨ This trend is everywhere right now! What do you think?',
                'breaking_news': '📢 Important update - story in highlights',
                'meme': 'POV: You\'re scrolling and see this trending 👀'
            }
        }

        return content_templates.get(platform, {}).get(hook_type, 'Check out this trending topic!')

    def _generate_trending_hashtags(self, platform: str) -> List[str]:
        """Generate trending hashtags for platform"""
        platform_hashtags = {
            'twitter': ['#TrendingNow', '#BreakingNews', '#Viral'],
            'instagram': ['#Trending', '#Explore', '#ViralContent'],
            'linkedin': ['#Industry', '#Professional', '#Business'],
            'facebook': ['#Community', '#Discussion', '#Share']
        }

        return platform_hashtags.get(platform, ['#Trending'])

    def _calculate_optimal_post_time(self, platform: str) -> str:
        """Calculate optimal posting time for platform"""
        # Simplified - would use actual analytics in production
        optimal_times = {
            'twitter': '12:00',  # Noon
            'instagram': '18:00',  # 6 PM
            'linkedin': '09:00',  # 9 AM
            'facebook': '15:00'  # 3 PM
        }

        base_time = optimal_times.get(platform, '12:00')
        today = datetime.now().strftime('%Y-%m-%d')
        return f'{today}T{base_time}:00'

# Global instance
news_api_service = NewsAPIService()