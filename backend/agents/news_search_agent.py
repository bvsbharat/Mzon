"""
News Search Agent - Discovers news articles from multiple sources
"""
import asyncio
import aiohttp
import feedparser
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from bs4 import BeautifulSoup

from agents.base_agent import BaseAgent
from models.news_models import NewsItem, NewsCategory, AgentStatus
from services.websocket_manager import WebSocketManager
from utils.news_api_client import NewsAPIClient
from utils.rss_parser import RSSParser
from utils.web_scraper import WebScraper

logger = logging.getLogger(__name__)

class NewsSearchAgent(BaseAgent):
    """
    Specialized agent for discovering news articles from various sources
    """

    def __init__(self):
        super().__init__("NewsSearchAgent")
        self.news_api_client = None
        self.rss_parser = None
        self.web_scraper = None
        self.sources = []

    async def _setup(self):
        """Initialize news sources and clients"""
        # Initialize API clients
        self.news_api_client = NewsAPIClient()
        self.rss_parser = RSSParser()
        self.web_scraper = WebScraper()

        # Configure news sources
        self.sources = [
            {
                "name": "NewsAPI",
                "type": "api",
                "enabled": True,
                "priority": 1
            },
            {
                "name": "RSS_Feeds",
                "type": "rss",
                "enabled": True,
                "priority": 2
            },
            {
                "name": "Web_Scraping",
                "type": "scraping",
                "enabled": True,
                "priority": 3
            }
        ]

        await self.news_api_client.initialize()
        await self.rss_parser.initialize()
        await self.web_scraper.initialize()

    async def execute(self, session_id: str, **kwargs) -> Dict[str, Any]:
        """
        Execute news search across multiple sources
        """
        try:
            self.validate_kwargs(['tags'], **kwargs)

            tags = kwargs.get('tags', [])
            categories = kwargs.get('categories', [])
            max_articles = kwargs.get('max_articles', 20)
            websocket_manager = kwargs.get('websocket_manager')

            await self.set_status(AgentStatus.SEARCHING)
            await self.send_update(
                session_id,
                f"Starting news search for tags: {', '.join(tags)}",
                0,
                websocket_manager=websocket_manager
            )

            all_articles = []
            total_sources = len([s for s in self.sources if s['enabled']])
            completed_sources = 0

            # Search each source
            for source in self.sources:
                if not source['enabled']:
                    continue

                try:
                    await self.send_update(
                        session_id,
                        f"Searching {source['name']}...",
                        (completed_sources / total_sources) * 80,  # Reserve 20% for final processing
                        websocket_manager=websocket_manager
                    )

                    if source['type'] == 'api':
                        articles = await self._search_news_api(tags, categories, max_articles // total_sources)
                    elif source['type'] == 'rss':
                        articles = await self._search_rss_feeds(tags, categories, max_articles // total_sources)
                    elif source['type'] == 'scraping':
                        articles = await self._search_web_scraping(tags, categories, max_articles // total_sources)
                    else:
                        articles = []

                    all_articles.extend(articles)
                    completed_sources += 1

                    await self.send_update(
                        session_id,
                        f"Found {len(articles)} articles from {source['name']}",
                        (completed_sources / total_sources) * 80,
                        {"articles_found": len(articles), "source": source['name']},
                        websocket_manager=websocket_manager
                    )

                except Exception as e:
                    logger.error(f"Error searching {source['name']}: {str(e)}")
                    completed_sources += 1

            # Remove duplicates and limit results
            await self.send_update(
                session_id,
                "Removing duplicates and ranking articles...",
                90,
                websocket_manager=websocket_manager
            )

            unique_articles = await self._remove_duplicates(all_articles)
            ranked_articles = await self._rank_articles(unique_articles, tags)
            final_articles = ranked_articles[:max_articles]

            await self.set_status(AgentStatus.COMPLETED)
            await self.send_update(
                session_id,
                f"News search completed. Found {len(final_articles)} unique articles",
                100,
                {"total_articles": len(final_articles)},
                websocket_manager=websocket_manager
            )

            return {
                "articles": final_articles,
                "total_found": len(all_articles),
                "unique_found": len(unique_articles),
                "final_count": len(final_articles)
            }

        except Exception as e:
            await self.handle_error(session_id, e, websocket_manager)
            return {"error": str(e), "articles": []}

    async def _search_news_api(
        self,
        tags: List[str],
        categories: List[NewsCategory],
        limit: int
    ) -> List[NewsItem]:
        """Search using NewsAPI"""
        try:
            articles = await self.news_api_client.search_articles(
                query=" OR ".join(tags),
                categories=[cat.value for cat in categories] if categories else None,
                limit=limit
            )
            return articles
        except Exception as e:
            logger.error(f"NewsAPI search error: {str(e)}")
            return []

    async def _search_rss_feeds(
        self,
        tags: List[str],
        categories: List[NewsCategory],
        limit: int
    ) -> List[NewsItem]:
        """Search RSS feeds"""
        try:
            articles = await self.rss_parser.parse_feeds(
                tags=tags,
                categories=[cat.value for cat in categories] if categories else None,
                limit=limit
            )
            return articles
        except Exception as e:
            logger.error(f"RSS search error: {str(e)}")
            return []

    async def _search_web_scraping(
        self,
        tags: List[str],
        categories: List[NewsCategory],
        limit: int
    ) -> List[NewsItem]:
        """Search via web scraping"""
        try:
            articles = await self.web_scraper.scrape_articles(
                tags=tags,
                categories=[cat.value for cat in categories] if categories else None,
                limit=limit
            )
            return articles
        except Exception as e:
            logger.error(f"Web scraping error: {str(e)}")
            return []

    async def _remove_duplicates(self, articles: List[NewsItem]) -> List[NewsItem]:
        """Remove duplicate articles based on title similarity"""
        unique_articles = []
        seen_titles = set()

        for article in articles:
            # Simple deduplication based on title
            title_words = set(article.title.lower().split())
            is_duplicate = False

            for seen_title in seen_titles:
                seen_words = set(seen_title.split())
                # If 70% of words are the same, consider it a duplicate
                overlap = len(title_words & seen_words)
                similarity = overlap / max(len(title_words), len(seen_words))
                if similarity > 0.7:
                    is_duplicate = True
                    break

            if not is_duplicate:
                unique_articles.append(article)
                seen_titles.add(article.title.lower())

        return unique_articles

    async def _rank_articles(self, articles: List[NewsItem], tags: List[str]) -> List[NewsItem]:
        """Rank articles by relevance to tags"""
        tag_words = set(word.lower() for tag in tags for word in tag.split())

        for article in articles:
            # Calculate relevance score
            title_words = set(article.title.lower().split())
            desc_words = set(article.description.lower().split()) if article.description else set()
            content_words = title_words | desc_words

            # Calculate relevance based on tag overlap
            overlap = len(content_words & tag_words)
            relevance = overlap / len(tag_words) if tag_words else 0
            article.relevance_score = min(relevance * 100, 100)

            # Boost recent articles
            if hasattr(article, 'published_at') and article.published_at:
                hours_old = (datetime.now() - article.published_at).total_seconds() / 3600
                freshness_boost = max(0, (24 - hours_old) / 24 * 10)  # Up to 10 point boost for articles < 24h
                article.relevance_score = min(article.relevance_score + freshness_boost, 100)

        # Sort by relevance score (descending)
        return sorted(articles, key=lambda x: x.relevance_score or 0, reverse=True)

    async def _cleanup(self):
        """Cleanup resources"""
        if self.news_api_client:
            await self.news_api_client.cleanup()
        if self.rss_parser:
            await self.rss_parser.cleanup()
        if self.web_scraper:
            await self.web_scraper.cleanup()