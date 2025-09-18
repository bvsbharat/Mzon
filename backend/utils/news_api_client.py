"""
NewsAPI Client for fetching news articles from NewsAPI.org
"""
import os
import asyncio
import aiohttp
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from models.news_models import NewsItem, NewsCategory

logger = logging.getLogger(__name__)

class NewsAPIClient:
    """
    Client for NewsAPI.org service
    """

    def __init__(self):
        self.api_key = os.getenv('NEWS_API_KEY')
        self.base_url = "https://newsapi.org/v2"
        self.session = None

    async def initialize(self):
        """Initialize the HTTP session"""
        if not self.api_key:
            logger.warning("NewsAPI key not found. NewsAPI integration will be disabled.")
            return

        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'X-API-Key': self.api_key,
                'User-Agent': 'Mzon-NewsBot/1.0'
            }
        )
        logger.info("NewsAPI client initialized")

    async def search_articles(
        self,
        query: str,
        categories: Optional[List[str]] = None,
        language: str = "en",
        country: str = "us",
        limit: int = 20
    ) -> List[NewsItem]:
        """
        Search for articles using NewsAPI
        """
        if not self.session or not self.api_key:
            logger.warning("NewsAPI not available, returning empty results")
            return []

        try:
            # Build query parameters
            params = {
                'q': query,
                'language': language,
                'sortBy': 'relevancy',
                'pageSize': min(limit, 100)  # NewsAPI max is 100
            }

            # Add category if specified
            if categories:
                # NewsAPI categories: business, entertainment, general, health, science, sports, technology
                newsapi_categories = []
                for category in categories:
                    if category in ['ai', 'technology', 'tools']:
                        newsapi_categories.append('technology')
                    elif category in ['business', 'marketing']:
                        newsapi_categories.append('business')
                    else:
                        newsapi_categories.append('general')

                if newsapi_categories:
                    params['category'] = newsapi_categories[0]  # NewsAPI allows only one category

            # Make API request
            async with self.session.get(f"{self.base_url}/everything", params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_articles(data.get('articles', []))
                elif response.status == 429:
                    logger.warning("NewsAPI rate limit exceeded")
                    return []
                else:
                    logger.error(f"NewsAPI error: {response.status}")
                    return []

        except Exception as e:
            logger.error(f"Error fetching from NewsAPI: {str(e)}")
            return []

    async def get_top_headlines(
        self,
        country: str = "us",
        category: Optional[str] = None,
        limit: int = 20
    ) -> List[NewsItem]:
        """
        Get top headlines from NewsAPI
        """
        if not self.session or not self.api_key:
            return []

        try:
            params = {
                'country': country,
                'pageSize': min(limit, 100)
            }

            if category:
                params['category'] = category

            async with self.session.get(f"{self.base_url}/top-headlines", params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_articles(data.get('articles', []))
                else:
                    logger.error(f"NewsAPI headlines error: {response.status}")
                    return []

        except Exception as e:
            logger.error(f"Error fetching headlines: {str(e)}")
            return []

    def _parse_articles(self, articles_data: List[Dict[str, Any]]) -> List[NewsItem]:
        """
        Parse NewsAPI response into NewsItem objects
        """
        parsed_articles = []

        for article_data in articles_data:
            try:
                # Skip articles without essential data
                if not article_data.get('title') or not article_data.get('url'):
                    continue

                # Parse publication date
                published_at = None
                if article_data.get('publishedAt'):
                    try:
                        published_at = datetime.fromisoformat(
                            article_data['publishedAt'].replace('Z', '+00:00')
                        )
                    except:
                        published_at = datetime.now(timezone.utc)

                # Determine category
                category = self._determine_category(article_data)

                # Create NewsItem
                news_item = NewsItem(
                    id=f"newsapi_{hash(article_data['url'])}",
                    title=article_data['title'],
                    description=article_data.get('description', ''),
                    url=article_data['url'],
                    image_url=article_data.get('urlToImage'),
                    source=article_data.get('source', {}).get('name', 'Unknown'),
                    published_at=published_at,
                    category=category,
                    tags=[],
                    credibility_score=self._calculate_credibility_score(article_data),
                    engagement_score=None,  # Not available from NewsAPI
                    reading_time=None,  # Will be calculated later
                    hashtags=[]
                )

                parsed_articles.append(news_item)

            except Exception as e:
                logger.error(f"Error parsing article: {str(e)}")
                continue

        logger.info(f"Parsed {len(parsed_articles)} articles from NewsAPI")
        return parsed_articles

    def _determine_category(self, article_data: Dict[str, Any]) -> Optional[NewsCategory]:
        """
        Determine the category based on article content
        """
        title = (article_data.get('title', '') + ' ' + article_data.get('description', '')).lower()

        # Category keywords
        category_keywords = {
            NewsCategory.AI: ['ai', 'artificial intelligence', 'machine learning', 'neural', 'algorithm'],
            NewsCategory.TECHNOLOGY: ['technology', 'tech', 'software', 'hardware', 'digital', 'innovation'],
            NewsCategory.BUSINESS: ['business', 'startup', 'company', 'revenue', 'profit', 'investment'],
            NewsCategory.MARKETING: ['marketing', 'advertising', 'social media', 'brand', 'campaign'],
            NewsCategory.DESIGN: ['design', 'ui', 'ux', 'interface', 'visual', 'graphic'],
            NewsCategory.PHOTOGRAPHY: ['photography', 'photo', 'camera', 'image', 'picture']
        }

        for category, keywords in category_keywords.items():
            if any(keyword in title for keyword in keywords):
                return category

        return None

    def _calculate_credibility_score(self, article_data: Dict[str, Any]) -> float:
        """
        Calculate a credibility score based on source and other factors
        """
        score = 50.0  # Base score

        source_name = article_data.get('source', {}).get('name', '').lower()

        # High credibility sources
        high_credibility = [
            'reuters', 'associated press', 'bbc', 'npr', 'the guardian',
            'wall street journal', 'new york times', 'washington post'
        ]

        # Medium credibility sources
        medium_credibility = [
            'cnn', 'fox news', 'abc news', 'cbs news', 'nbc news',
            'techcrunch', 'wired', 'the verge', 'ars technica'
        ]

        if any(source in source_name for source in high_credibility):
            score += 30
        elif any(source in source_name for source in medium_credibility):
            score += 15

        # Has author
        if article_data.get('author'):
            score += 5

        # Has image
        if article_data.get('urlToImage'):
            score += 5

        # Has substantial description
        description = article_data.get('description', '')
        if description and len(description) > 100:
            score += 5

        return min(score, 100.0)

    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            logger.info("NewsAPI client cleanup completed")