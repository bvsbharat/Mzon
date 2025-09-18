"""
Web Scraper for extracting news articles from websites
"""
import os
import asyncio
import aiohttp
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import re

from models.news_models import NewsItem, NewsCategory

logger = logging.getLogger(__name__)

class WebScraper:
    """
    Web scraper for news websites
    """

    def __init__(self):
        self.session = None
        self.scraping_domains = self._get_scraping_domains()
        self.domain_configs = self._get_domain_configs()

    def _get_scraping_domains(self) -> List[str]:
        """Get domains to scrape from environment"""
        domains_env = os.getenv('SCRAPING_DOMAINS', '')
        domains = []

        if domains_env:
            domains = [domain.strip() for domain in domains_env.split(',')]

        # Add default domains if none specified
        if not domains:
            domains = [
                'techcrunch.com',
                'wired.com',
                'theverge.com'
            ]

        return domains

    def _get_domain_configs(self) -> Dict[str, Dict[str, Any]]:
        """Get scraping configurations for different domains"""
        return {
            'techcrunch.com': {
                'search_url': 'https://search.techcrunch.com/search;?p={query}',
                'article_selector': 'article.post-block',
                'title_selector': '.post-block__title__link',
                'description_selector': '.post-block__content',
                'image_selector': '.post-block__media img',
                'date_selector': '.river-byline__time',
                'category': NewsCategory.TECHNOLOGY
            },
            'wired.com': {
                'search_url': 'https://www.wired.com/search/?q={query}',
                'article_selector': '.SummaryItemWrapper',
                'title_selector': '.SummaryItemHedLink',
                'description_selector': '.SummaryItemContent p',
                'image_selector': '.ResponsiveImageContainer img',
                'date_selector': '.SummaryItemPublishDate',
                'category': NewsCategory.TECHNOLOGY
            },
            'theverge.com': {
                'search_url': 'https://www.theverge.com/search?q={query}',
                'article_selector': '.c-entry-box',
                'title_selector': '.c-entry-box--compact__title a',
                'description_selector': '.c-entry-summary p',
                'image_selector': '.c-entry-box__image img',
                'date_selector': '.c-byline__item time',
                'category': NewsCategory.TECHNOLOGY
            }
        }

    async def initialize(self):
        """Initialize the HTTP session with proper headers"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            }
        )
        logger.info(f"Web Scraper initialized for {len(self.scraping_domains)} domains")

    async def scrape_articles(
        self,
        tags: List[str],
        categories: Optional[List[str]] = None,
        limit: int = 20
    ) -> List[NewsItem]:
        """
        Scrape articles from configured websites
        """
        if not self.session:
            logger.warning("Web Scraper not initialized")
            return []

        all_articles = []

        # Filter domains based on categories if specified
        domains_to_scrape = self.scraping_domains
        if categories:
            domains_to_scrape = [
                domain for domain in self.scraping_domains
                if domain in self.domain_configs and
                self.domain_configs[domain].get('category')
                and self.domain_configs[domain]['category'].value in categories
            ]

        # Scrape each domain
        tasks = []
        for domain in domains_to_scrape:
            if domain in self.domain_configs:
                for tag in tags[:3]:  # Limit to first 3 tags to avoid overwhelming
                    task = self._scrape_domain(domain, tag)
                    tasks.append(task)

        # Execute all scraping tasks concurrently
        scraping_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect all articles
        for result in scraping_results:
            if isinstance(result, list):
                all_articles.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Scraping error: {str(result)}")

        # Remove duplicates and sort by date
        unique_articles = self._remove_duplicates(all_articles)
        unique_articles.sort(key=lambda x: x.published_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

        logger.info(f"Web Scraper found {len(unique_articles)} articles from {len(domains_to_scrape)} domains")
        return unique_articles[:limit]

    async def _scrape_domain(self, domain: str, query: str) -> List[NewsItem]:
        """
        Scrape a specific domain for articles matching the query
        """
        config = self.domain_configs.get(domain)
        if not config:
            return []

        try:
            # Build search URL
            search_url = config['search_url'].format(query=query.replace(' ', '+'))

            # Fetch search results page
            async with self.session.get(search_url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch {domain} search results: {response.status}")
                    return []

                html_content = await response.text()

            # Parse HTML
            soup = BeautifulSoup(html_content, 'html.parser')

            # Find article elements
            article_elements = soup.select(config['article_selector'])

            articles = []
            for element in article_elements[:10]:  # Limit to first 10 results per domain
                try:
                    article = await self._parse_article_element(element, config, domain)
                    if article and self._article_relevant_to_query(article, query):
                        articles.append(article)
                except Exception as e:
                    logger.error(f"Error parsing article element from {domain}: {str(e)}")
                    continue

            logger.debug(f"Scraped {len(articles)} articles from {domain} for query '{query}'")
            return articles

        except Exception as e:
            logger.error(f"Error scraping domain {domain}: {str(e)}")
            return []

    async def _parse_article_element(
        self,
        element: BeautifulSoup,
        config: Dict[str, Any],
        domain: str
    ) -> Optional[NewsItem]:
        """
        Parse an article element into a NewsItem
        """
        try:
            # Extract title
            title_elem = element.select_one(config['title_selector'])
            if not title_elem:
                return None

            title = title_elem.get_text(strip=True)
            if not title:
                return None

            # Extract URL
            url = None
            if title_elem.name == 'a':
                url = title_elem.get('href')
            else:
                link_elem = title_elem.find('a')
                if link_elem:
                    url = link_elem.get('href')

            if not url:
                return None

            # Make URL absolute
            if url.startswith('/'):
                url = f"https://{domain}{url}"
            elif not url.startswith('http'):
                url = f"https://{domain}/{url}"

            # Extract description
            description = ''
            desc_elem = element.select_one(config['description_selector'])
            if desc_elem:
                description = desc_elem.get_text(strip=True)

            # Extract image URL
            image_url = None
            img_elem = element.select_one(config['image_selector'])
            if img_elem:
                image_url = img_elem.get('src') or img_elem.get('data-src')
                if image_url and not image_url.startswith('http'):
                    image_url = urljoin(f"https://{domain}", image_url)

            # Extract publication date
            published_at = None
            date_elem = element.select_one(config['date_selector'])
            if date_elem:
                date_text = date_elem.get('datetime') or date_elem.get_text(strip=True)
                published_at = self._parse_date(date_text)

            if not published_at:
                published_at = datetime.now(timezone.utc)

            # Determine category
            category = config.get('category', NewsCategory.TECHNOLOGY)

            # Calculate credibility score
            credibility_score = self._calculate_domain_credibility(domain)

            return NewsItem(
                id=f"scrape_{hash(url)}",
                title=title,
                description=description,
                url=url,
                image_url=image_url,
                source=domain.replace('.com', '').title(),
                published_at=published_at,
                category=category,
                tags=[],
                credibility_score=credibility_score,
                engagement_score=None,
                reading_time=None,
                hashtags=[]
            )

        except Exception as e:
            logger.error(f"Error parsing article element: {str(e)}")
            return None

    def _parse_date(self, date_text: str) -> Optional[datetime]:
        """
        Parse various date formats
        """
        if not date_text:
            return None

        try:
            # Common ISO format
            if 'T' in date_text:
                return datetime.fromisoformat(date_text.replace('Z', '+00:00'))

            # Try various formats
            date_formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d',
                '%B %d, %Y',
                '%b %d, %Y',
                '%m/%d/%Y',
                '%d %B %Y',
                '%d %b %Y'
            ]

            for fmt in date_formats:
                try:
                    return datetime.strptime(date_text, fmt).replace(tzinfo=timezone.utc)
                except:
                    continue

        except Exception as e:
            logger.debug(f"Could not parse date '{date_text}': {str(e)}")

        return None

    def _article_relevant_to_query(self, article: NewsItem, query: str) -> bool:
        """
        Check if article is relevant to the search query
        """
        query_lower = query.lower()
        content = f"{article.title} {article.description}".lower()

        # Simple relevance check
        query_words = query_lower.split()
        content_words = content.split()

        matches = sum(1 for word in query_words if word in content_words)
        relevance = matches / len(query_words) if query_words else 0

        return relevance >= 0.3  # At least 30% of query words should match

    def _remove_duplicates(self, articles: List[NewsItem]) -> List[NewsItem]:
        """
        Remove duplicate articles based on URL and title similarity
        """
        seen_urls = set()
        seen_titles = set()
        unique_articles = []

        for article in articles:
            # Skip if URL already seen
            if article.url in seen_urls:
                continue

            # Check for title similarity
            title_words = set(article.title.lower().split())
            is_duplicate = False

            for seen_title in seen_titles:
                seen_words = set(seen_title.split())
                overlap = len(title_words & seen_words)
                similarity = overlap / max(len(title_words), len(seen_words))

                if similarity > 0.8:  # 80% similarity threshold
                    is_duplicate = True
                    break

            if not is_duplicate:
                unique_articles.append(article)
                seen_urls.add(article.url)
                seen_titles.add(article.title.lower())

        return unique_articles

    def _calculate_domain_credibility(self, domain: str) -> float:
        """
        Calculate credibility score based on domain
        """
        domain_scores = {
            'techcrunch.com': 85.0,
            'wired.com': 90.0,
            'theverge.com': 80.0,
            'arstechnica.com': 90.0,
            'engadget.com': 75.0,
            'gizmodo.com': 70.0,
            'cnet.com': 75.0,
            'zdnet.com': 80.0
        }

        return domain_scores.get(domain, 60.0)

    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            logger.info("Web Scraper cleanup completed")