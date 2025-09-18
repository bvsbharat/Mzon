"""
RSS Feed Parser for fetching news from RSS sources
"""
import os
import asyncio
import aiohttp
import feedparser
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from urllib.parse import urlparse

from models.news_models import NewsItem, NewsCategory

logger = logging.getLogger(__name__)

class RSSParser:
    """
    RSS Feed parser for news discovery
    """

    def __init__(self):
        self.session = None
        self.rss_feeds = self._get_default_feeds()

    def _get_default_feeds(self) -> List[Dict[str, str]]:
        """Get default RSS feeds from environment or hardcoded list"""
        feeds_env = os.getenv('RSS_FEEDS', '')
        feeds = []

        if feeds_env:
            # Parse feeds from environment variable
            feed_urls = feeds_env.split(',')
            for url in feed_urls:
                feeds.append({
                    'url': url.strip(),
                    'name': self._extract_domain_name(url.strip()),
                    'category': None
                })

        # Add default tech/news RSS feeds
        default_feeds = [
            {
                'url': 'https://feeds.feedburner.com/oreilly/radar',
                'name': "O'Reilly Radar",
                'category': 'technology'
            },
            {
                'url': 'https://techcrunch.com/feed/',
                'name': 'TechCrunch',
                'category': 'technology'
            },
            {
                'url': 'https://www.wired.com/feed/rss',
                'name': 'Wired',
                'category': 'technology'
            },
            {
                'url': 'https://feeds.arstechnica.com/arstechnica/index',
                'name': 'Ars Technica',
                'category': 'technology'
            },
            {
                'url': 'https://www.theverge.com/rss/index.xml',
                'name': 'The Verge',
                'category': 'technology'
            },
            {
                'url': 'https://feeds.feedburner.com/venturebeat/SZYF',
                'name': 'VentureBeat',
                'category': 'business'
            },
            {
                'url': 'https://feeds.feedburner.com/Mashable',
                'name': 'Mashable',
                'category': 'technology'
            },
            {
                'url': 'https://www.engadget.com/rss.xml',
                'name': 'Engadget',
                'category': 'technology'
            }
        ]

        feeds.extend(default_feeds)
        return feeds

    def _extract_domain_name(self, url: str) -> str:
        """Extract domain name from URL"""
        try:
            parsed = urlparse(url)
            return parsed.netloc.replace('www.', '')
        except:
            return "RSS Feed"

    async def initialize(self):
        """Initialize the HTTP session"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mzon-NewsBot/1.0 (RSS Feed Parser)'
            }
        )
        logger.info(f"RSS Parser initialized with {len(self.rss_feeds)} feeds")

    async def parse_feeds(
        self,
        tags: List[str],
        categories: Optional[List[str]] = None,
        limit: int = 20
    ) -> List[NewsItem]:
        """
        Parse RSS feeds and filter articles
        """
        if not self.session:
            logger.warning("RSS Parser not initialized")
            return []

        all_articles = []

        # Filter feeds based on categories if specified
        feeds_to_parse = self.rss_feeds
        if categories:
            feeds_to_parse = [
                feed for feed in self.rss_feeds
                if not feed.get('category') or feed['category'] in categories
            ]

        # Parse each feed
        tasks = []
        for feed in feeds_to_parse:
            task = self._parse_single_feed(feed, tags)
            tasks.append(task)

        # Execute all feed parsing concurrently
        feed_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect all articles
        for result in feed_results:
            if isinstance(result, list):
                all_articles.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Feed parsing error: {str(result)}")

        # Sort by publication date and limit results
        all_articles.sort(key=lambda x: x.published_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

        logger.info(f"RSS Parser found {len(all_articles)} articles from {len(feeds_to_parse)} feeds")
        return all_articles[:limit]

    async def _parse_single_feed(
        self,
        feed_config: Dict[str, str],
        tags: List[str]
    ) -> List[NewsItem]:
        """
        Parse a single RSS feed
        """
        try:
            # Fetch RSS feed content
            async with self.session.get(feed_config['url']) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch RSS feed {feed_config['url']}: {response.status}")
                    return []

                content = await response.text()

            # Parse RSS content
            feed = feedparser.parse(content)

            if feed.bozo:
                logger.warning(f"RSS feed has parsing issues: {feed_config['url']}")

            articles = []
            for entry in feed.entries:
                try:
                    # Check if article matches tags
                    if tags and not self._article_matches_tags(entry, tags):
                        continue

                    article = self._parse_rss_entry(entry, feed_config)
                    if article:
                        articles.append(article)

                except Exception as e:
                    logger.error(f"Error parsing RSS entry: {str(e)}")
                    continue

            logger.debug(f"Parsed {len(articles)} articles from {feed_config['name']}")
            return articles

        except Exception as e:
            logger.error(f"Error parsing RSS feed {feed_config['url']}: {str(e)}")
            return []

    def _article_matches_tags(self, entry: Any, tags: List[str]) -> bool:
        """
        Check if RSS entry matches the specified tags
        """
        # Combine title, summary, and tags for matching
        content_text = " ".join([
            getattr(entry, 'title', ''),
            getattr(entry, 'summary', ''),
            " ".join(tag.get('term', '') for tag in getattr(entry, 'tags', []))
        ]).lower()

        # Check if any tag matches
        for tag in tags:
            if tag.lower() in content_text:
                return True

        return False

    def _parse_rss_entry(self, entry: Any, feed_config: Dict[str, str]) -> Optional[NewsItem]:
        """
        Parse a single RSS entry into a NewsItem
        """
        try:
            # Required fields
            title = getattr(entry, 'title', '')
            link = getattr(entry, 'link', '')

            if not title or not link:
                return None

            # Optional fields
            description = getattr(entry, 'summary', '') or getattr(entry, 'description', '')

            # Parse publication date
            published_at = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                try:
                    published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                except:
                    pass

            if not published_at and hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                try:
                    published_at = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
                except:
                    pass

            if not published_at:
                published_at = datetime.now(timezone.utc)

            # Extract tags
            tags = []
            if hasattr(entry, 'tags'):
                tags = [tag.get('term', '') for tag in entry.tags if tag.get('term')]

            # Find image
            image_url = None
            if hasattr(entry, 'enclosures'):
                for enclosure in entry.enclosures:
                    if enclosure.get('type', '').startswith('image/'):
                        image_url = enclosure.get('href')
                        break

            # Try to get image from media content
            if not image_url and hasattr(entry, 'media_content'):
                for media in entry.media_content:
                    if media.get('medium') == 'image' or media.get('type', '').startswith('image/'):
                        image_url = media.get('url')
                        break

            # Determine category
            category = self._determine_category_from_feed(feed_config, title + ' ' + description)

            # Calculate credibility score
            credibility_score = self._calculate_feed_credibility(feed_config)

            return NewsItem(
                id=f"rss_{hash(link)}",
                title=title,
                description=description,
                url=link,
                image_url=image_url,
                source=feed_config['name'],
                published_at=published_at,
                category=category,
                tags=tags,
                credibility_score=credibility_score,
                engagement_score=None,
                reading_time=None,
                hashtags=[]
            )

        except Exception as e:
            logger.error(f"Error parsing RSS entry: {str(e)}")
            return None

    def _determine_category_from_feed(
        self,
        feed_config: Dict[str, str],
        content: str
    ) -> Optional[NewsCategory]:
        """
        Determine category from feed configuration or content
        """
        # Use feed's predefined category
        if feed_config.get('category'):
            category_mapping = {
                'technology': NewsCategory.TECHNOLOGY,
                'business': NewsCategory.BUSINESS,
                'ai': NewsCategory.AI,
                'design': NewsCategory.DESIGN,
                'marketing': NewsCategory.MARKETING,
                'photography': NewsCategory.PHOTOGRAPHY
            }
            return category_mapping.get(feed_config['category'])

        # Infer from content
        content_lower = content.lower()

        if any(keyword in content_lower for keyword in ['ai', 'artificial intelligence', 'machine learning']):
            return NewsCategory.AI
        elif any(keyword in content_lower for keyword in ['technology', 'tech', 'software', 'digital']):
            return NewsCategory.TECHNOLOGY
        elif any(keyword in content_lower for keyword in ['business', 'startup', 'company', 'investment']):
            return NewsCategory.BUSINESS
        elif any(keyword in content_lower for keyword in ['marketing', 'advertising', 'social media']):
            return NewsCategory.MARKETING
        elif any(keyword in content_lower for keyword in ['design', 'ui', 'ux', 'interface']):
            return NewsCategory.DESIGN
        elif any(keyword in content_lower for keyword in ['photography', 'photo', 'camera', 'image']):
            return NewsCategory.PHOTOGRAPHY

        return None

    def _calculate_feed_credibility(self, feed_config: Dict[str, str]) -> float:
        """
        Calculate credibility score based on the RSS feed source
        """
        feed_name = feed_config['name'].lower()

        # High credibility tech sources
        high_credibility = [
            'oreilly', 'techcrunch', 'wired', 'ars technica', 'the verge',
            'ieee', 'acm', 'mit technology review'
        ]

        # Medium credibility sources
        medium_credibility = [
            'venturebeat', 'mashable', 'engadget', 'cnet', 'zdnet',
            'gizmodo', 'lifehacker'
        ]

        base_score = 60.0

        if any(source in feed_name for source in high_credibility):
            return min(base_score + 25, 95.0)
        elif any(source in feed_name for source in medium_credibility):
            return min(base_score + 15, 85.0)

        return base_score

    async def add_custom_feed(self, url: str, name: Optional[str] = None, category: Optional[str] = None):
        """
        Add a custom RSS feed
        """
        feed_config = {
            'url': url,
            'name': name or self._extract_domain_name(url),
            'category': category
        }

        self.rss_feeds.append(feed_config)
        logger.info(f"Added custom RSS feed: {feed_config['name']}")

    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            logger.info("RSS Parser cleanup completed")