"""
News Details Agent - Extracts detailed information from news articles
"""
import asyncio
import aiohttp
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from agents.base_agent import BaseAgent
from models.news_models import NewsItem, ProcessedNewsItem, AgentStatus
from services.websocket_manager import WebSocketManager
from utils.content_extractor import ContentExtractor
from utils.sentiment_analyzer import SentimentAnalyzer

logger = logging.getLogger(__name__)

class NewsDetailsAgent(BaseAgent):
    """
    Specialized agent for extracting detailed information from news articles
    """

    def __init__(self):
        super().__init__("NewsDetailsAgent")
        self.content_extractor = None
        self.sentiment_analyzer = None

    async def _setup(self):
        """Initialize content extraction tools"""
        self.content_extractor = ContentExtractor()
        self.sentiment_analyzer = SentimentAnalyzer()

        await self.content_extractor.initialize()
        await self.sentiment_analyzer.initialize()

    async def execute(self, session_id: str, **kwargs) -> Dict[str, Any]:
        """
        Execute detailed content extraction for articles
        """
        try:
            self.validate_kwargs(['articles'], **kwargs)

            articles = kwargs.get('articles', [])
            websocket_manager = kwargs.get('websocket_manager')

            if not articles:
                return {"processed_articles": []}

            await self.set_status(AgentStatus.PROCESSING)
            await self.send_update(
                session_id,
                f"Processing {len(articles)} articles for detailed extraction...",
                0,
                websocket_manager=websocket_manager
            )

            processed_articles = []
            total_articles = len(articles)

            # Process each article
            for i, article in enumerate(articles):
                try:
                    progress = (i / total_articles) * 100
                    await self.send_update(
                        session_id,
                        f"Processing article {i+1}/{total_articles}: {article.title[:50]}...",
                        progress,
                        websocket_manager=websocket_manager
                    )

                    # Extract detailed content
                    processed_article = await self._process_article(article)
                    processed_articles.append(processed_article)

                    # Small delay to prevent overwhelming external services
                    await asyncio.sleep(0.5)

                except Exception as e:
                    logger.error(f"Error processing article {article.title}: {str(e)}")
                    # Add the original article even if processing failed
                    processed_articles.append(
                        ProcessedNewsItem(
                            **article.dict(),
                            summary=article.description,
                            key_points=[],
                            sentiment="neutral"
                        )
                    )

            await self.set_status(AgentStatus.COMPLETED)
            await self.send_update(
                session_id,
                f"Content extraction completed for {len(processed_articles)} articles",
                100,
                {"processed_count": len(processed_articles)},
                websocket_manager=websocket_manager
            )

            return {
                "articles": processed_articles,
                "processed_count": len(processed_articles),
                "original_count": len(articles)
            }

        except Exception as e:
            await self.handle_error(session_id, e, websocket_manager)
            return {"error": str(e), "articles": []}

    async def _process_article(self, article: NewsItem) -> ProcessedNewsItem:
        """
        Process a single article for detailed information extraction
        """
        try:
            # Extract full content from URL
            full_content = await self.content_extractor.extract_content(article.url)

            # Generate summary
            summary = await self._generate_summary(article.title, article.description, full_content)

            # Extract key points
            key_points = await self._extract_key_points(full_content or article.description)

            # Perform sentiment analysis
            sentiment = await self.sentiment_analyzer.analyze_sentiment(
                summary or article.description
            )

            # Calculate reading time
            reading_time = self._calculate_reading_time(full_content or article.description)

            # Generate hashtags
            hashtags = await self._generate_hashtags(article.title, summary, article.tags)

            # Calculate trending potential
            trending_potential = await self._calculate_trending_potential(article, sentiment)

            return ProcessedNewsItem(
                **article.dict(),
                content=full_content,
                summary=summary,
                key_points=key_points,
                sentiment=sentiment,
                reading_time=reading_time,
                hashtags=hashtags,
                trending_potential=trending_potential
            )

        except Exception as e:
            logger.error(f"Error in _process_article: {str(e)}")
            # Return basic processed article on error
            return ProcessedNewsItem(
                **article.dict(),
                summary=article.description,
                key_points=[],
                sentiment="neutral"
            )

    async def _generate_summary(
        self,
        title: str,
        description: str,
        content: Optional[str]
    ) -> str:
        """
        Generate a concise summary of the article
        """
        try:
            # Use the content extractor to generate summary
            text_to_summarize = content or description or title

            if len(text_to_summarize) < 100:
                return description or title

            summary = await self.content_extractor.generate_summary(text_to_summarize)
            return summary or description

        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return description or title

    async def _extract_key_points(self, content: str) -> List[str]:
        """
        Extract key points from article content
        """
        try:
            if not content or len(content) < 50:
                return []

            # Simple key point extraction (in production, use more sophisticated NLP)
            sentences = content.split('. ')

            # Filter sentences that might be key points
            key_points = []
            for sentence in sentences:
                # Look for sentences with numbers, statistics, or key phrases
                if any(keyword in sentence.lower() for keyword in [
                    'percent', '%', 'million', 'billion', 'increase', 'decrease',
                    'announced', 'launched', 'released', 'according to', 'study shows'
                ]):
                    if len(sentence) > 20 and len(sentence) < 200:
                        key_points.append(sentence.strip() + '.')

            return key_points[:5]  # Return top 5 key points

        except Exception as e:
            logger.error(f"Error extracting key points: {str(e)}")
            return []

    def _calculate_reading_time(self, content: str) -> int:
        """
        Calculate estimated reading time in minutes
        """
        if not content:
            return 1

        # Average reading speed: 200 words per minute
        word_count = len(content.split())
        reading_time = max(1, word_count // 200)

        return reading_time

    async def _generate_hashtags(
        self,
        title: str,
        summary: Optional[str],
        existing_tags: List[str]
    ) -> List[str]:
        """
        Generate relevant hashtags for social media
        """
        try:
            hashtags = set()

            # Add existing tags as hashtags
            for tag in existing_tags:
                clean_tag = tag.replace('#', '').replace(' ', '').title()
                if clean_tag:
                    hashtags.add(f"#{clean_tag}")

            # Extract hashtags from title and summary
            text = f"{title} {summary or ''}".lower()

            # Common tech/news hashtags based on content
            hashtag_keywords = {
                'ai': ['#AI', '#ArtificialIntelligence', '#MachineLearning'],
                'technology': ['#Tech', '#Technology', '#Innovation'],
                'business': ['#Business', '#Startup', '#Entrepreneur'],
                'marketing': ['#Marketing', '#DigitalMarketing', '#SocialMedia'],
                'design': ['#Design', '#UX', '#UI'],
                'photography': ['#Photography', '#Photo', '#Digital'],
                'news': ['#News', '#Breaking', '#Update']
            }

            for keyword, tags in hashtag_keywords.items():
                if keyword in text:
                    hashtags.update(tags[:2])  # Add up to 2 hashtags per category

            return list(hashtags)[:10]  # Limit to 10 hashtags

        except Exception as e:
            logger.error(f"Error generating hashtags: {str(e)}")
            return existing_tags

    async def _calculate_trending_potential(
        self,
        article: NewsItem,
        sentiment: str
    ) -> float:
        """
        Calculate the potential for an article to trend on social media
        """
        try:
            score = 50.0  # Base score

            # Recency boost
            if hasattr(article, 'published_at') and article.published_at:
                hours_old = (datetime.now() - article.published_at).total_seconds() / 3600
                if hours_old < 6:
                    score += 20
                elif hours_old < 24:
                    score += 10

            # Engagement boost
            if hasattr(article, 'engagement_score') and article.engagement_score:
                score += article.engagement_score * 0.2

            # Credibility boost
            if hasattr(article, 'credibility_score') and article.credibility_score:
                score += article.credibility_score * 0.1

            # Sentiment impact
            if sentiment == 'positive':
                score += 5
            elif sentiment == 'negative':
                score += 10  # Negative news often trends more

            # Topic relevance (simple keyword matching)
            trending_keywords = [
                'breaking', 'exclusive', 'announcement', 'launch', 'viral',
                'scandal', 'controversy', 'record', 'first', 'massive'
            ]

            title_lower = article.title.lower()
            keyword_matches = sum(1 for keyword in trending_keywords if keyword in title_lower)
            score += keyword_matches * 5

            return min(score, 100.0)

        except Exception as e:
            logger.error(f"Error calculating trending potential: {str(e)}")
            return 50.0

    async def _cleanup(self):
        """Cleanup resources"""
        if self.content_extractor:
            await self.content_extractor.cleanup()
        if self.sentiment_analyzer:
            await self.sentiment_analyzer.cleanup()