"""
Tag Filter Agent - Intelligent filtering based on user tags and preferences
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from agents.base_agent import BaseAgent
from models.news_models import ProcessedNewsItem, AgentStatus
from services.websocket_manager import WebSocketManager

logger = logging.getLogger(__name__)

class TagFilterAgent(BaseAgent):
    """
    Specialized agent for intelligent tag-based filtering and relevance scoring
    """

    def __init__(self):
        super().__init__("TagFilterAgent")
        self.tag_weights = {}
        self.category_preferences = {}

    async def _setup(self):
        """Initialize tag filtering algorithms"""
        # Default tag weights (can be customized per user)
        self.tag_weights = {
            'ai': 1.0,
            'artificial intelligence': 1.0,
            'machine learning': 0.9,
            'technology': 0.8,
            'innovation': 0.7,
            'startup': 0.8,
            'business': 0.6,
            'marketing': 0.7,
            'design': 0.7,
            'photography': 0.8,
            'social media': 0.9,
            'trending': 1.0,
            'breaking': 1.0,
            'exclusive': 0.9
        }

        # Category preference multipliers
        self.category_preferences = {
            'ai': 1.2,
            'technology': 1.1,
            'design': 1.0,
            'marketing': 1.1,
            'photography': 1.0,
            'business': 0.9,
            'tools': 1.0,
            'resources': 0.8
        }

    async def execute(self, session_id: str, **kwargs) -> Dict[str, Any]:
        """
        Execute intelligent tag filtering and relevance scoring
        """
        try:
            self.validate_kwargs(['articles', 'tags'], **kwargs)

            articles = kwargs.get('articles', [])
            tags = kwargs.get('tags', [])
            categories = kwargs.get('categories', [])
            websocket_manager = kwargs.get('websocket_manager')

            if not articles:
                return {"filtered_articles": []}

            await self.set_status(AgentStatus.PROCESSING)
            await self.send_update(
                session_id,
                f"Filtering {len(articles)} articles based on {len(tags)} tags...",
                0,
                websocket_manager=websocket_manager
            )

            # Score and filter articles
            scored_articles = []
            total_articles = len(articles)

            for i, article in enumerate(articles):
                try:
                    progress = (i / total_articles) * 80  # Reserve 20% for final sorting

                    if i % 5 == 0:  # Update every 5 articles to avoid spam
                        await self.send_update(
                            session_id,
                            f"Scoring article {i+1}/{total_articles}...",
                            progress,
                            websocket_manager=websocket_manager
                        )

                    # Calculate relevance scores
                    tag_score = await self._calculate_tag_relevance(article, tags)
                    category_score = await self._calculate_category_relevance(article, categories)
                    content_score = await self._calculate_content_quality(article)
                    freshness_score = await self._calculate_freshness_score(article)

                    # Combined relevance score
                    final_score = (
                        tag_score * 0.4 +
                        category_score * 0.2 +
                        content_score * 0.2 +
                        freshness_score * 0.2
                    )

                    article.relevance_score = final_score
                    scored_articles.append(article)

                except Exception as e:
                    logger.error(f"Error scoring article {article.title}: {str(e)}")
                    # Keep article with neutral score
                    article.relevance_score = 50.0
                    scored_articles.append(article)

            # Sort by relevance score
            await self.send_update(
                session_id,
                "Sorting articles by relevance...",
                90,
                websocket_manager=websocket_manager
            )

            filtered_articles = sorted(
                scored_articles,
                key=lambda x: x.relevance_score or 0,
                reverse=True
            )

            # Filter out low-relevance articles (score < 30)
            high_relevance_articles = [
                article for article in filtered_articles
                if (article.relevance_score or 0) >= 30
            ]

            await self.set_status(AgentStatus.COMPLETED)
            await self.send_update(
                session_id,
                f"Tag filtering completed. {len(high_relevance_articles)} relevant articles found",
                100,
                {
                    "total_processed": len(articles),
                    "high_relevance_count": len(high_relevance_articles),
                    "average_relevance": sum(a.relevance_score or 0 for a in high_relevance_articles) / len(high_relevance_articles) if high_relevance_articles else 0
                },
                websocket_manager=websocket_manager
            )

            return {
                "articles": high_relevance_articles,
                "filtered_count": len(high_relevance_articles),
                "original_count": len(articles),
                "average_relevance": sum(a.relevance_score or 0 for a in high_relevance_articles) / len(high_relevance_articles) if high_relevance_articles else 0
            }

        except Exception as e:
            await self.handle_error(session_id, e, websocket_manager)
            return {"error": str(e), "articles": []}

    async def _calculate_tag_relevance(
        self,
        article: ProcessedNewsItem,
        user_tags: List[str]
    ) -> float:
        """
        Calculate how well the article matches user-specified tags
        """
        if not user_tags:
            return 50.0

        # Combine all article text for analysis
        article_text = " ".join([
            article.title,
            article.description or "",
            article.summary or "",
            " ".join(article.tags),
            " ".join(article.hashtags)
        ]).lower()

        tag_matches = 0
        total_weight = 0

        for tag in user_tags:
            tag_lower = tag.lower()
            weight = self.tag_weights.get(tag_lower, 0.5)
            total_weight += weight

            # Direct tag match
            if tag_lower in article_text:
                tag_matches += weight
                continue

            # Partial/semantic matches
            tag_words = tag_lower.split()
            if len(tag_words) > 1:
                # Multi-word tag: check if most words are present
                matches = sum(1 for word in tag_words if word in article_text)
                if matches >= len(tag_words) * 0.6:  # At least 60% of words match
                    tag_matches += weight * 0.8
            else:
                # Single word: check for partial matches or related terms
                if self._is_semantically_related(tag_lower, article_text):
                    tag_matches += weight * 0.6

        # Calculate relevance score (0-100)
        if total_weight == 0:
            return 50.0

        relevance_ratio = tag_matches / total_weight
        return min(relevance_ratio * 100, 100.0)

    async def _calculate_category_relevance(
        self,
        article: ProcessedNewsItem,
        user_categories: List[str]
    ) -> float:
        """
        Calculate relevance based on article category preferences
        """
        if not user_categories or not article.category:
            return 50.0

        category_value = article.category.value if hasattr(article.category, 'value') else str(article.category)

        if category_value in user_categories:
            multiplier = self.category_preferences.get(category_value, 1.0)
            return 80.0 * multiplier

        # Check for related categories
        related_categories = {
            'ai': ['technology', 'innovation'],
            'technology': ['ai', 'innovation', 'tools'],
            'marketing': ['business', 'social media'],
            'design': ['tools', 'photography'],
            'photography': ['design', 'tools'],
        }

        if category_value in related_categories:
            for related_cat in related_categories[category_value]:
                if related_cat in user_categories:
                    return 60.0

        return 40.0

    async def _calculate_content_quality(self, article: ProcessedNewsItem) -> float:
        """
        Calculate content quality score based on various factors
        """
        score = 50.0

        # Credibility score boost
        if hasattr(article, 'credibility_score') and article.credibility_score:
            score += (article.credibility_score - 50) * 0.3

        # Engagement score boost
        if hasattr(article, 'engagement_score') and article.engagement_score:
            score += (article.engagement_score - 50) * 0.2

        # Content completeness
        if article.summary and len(article.summary) > 100:
            score += 10

        if article.key_points and len(article.key_points) > 0:
            score += 5

        if article.content and len(article.content) > 500:
            score += 10

        # Image availability
        if article.image_url:
            score += 5

        # Source credibility (simple heuristic)
        if article.source:
            trusted_sources = [
                'reuters', 'bbc', 'cnn', 'techcrunch', 'wired', 'the verge',
                'harvard business review', 'mit technology review'
            ]
            if any(source in article.source.lower() for source in trusted_sources):
                score += 15

        return min(score, 100.0)

    async def _calculate_freshness_score(self, article: ProcessedNewsItem) -> float:
        """
        Calculate freshness score based on article age
        """
        if not hasattr(article, 'published_at') or not article.published_at:
            return 50.0

        # Calculate hours since publication
        hours_old = (datetime.now() - article.published_at).total_seconds() / 3600

        # Freshness scoring
        if hours_old < 6:
            return 100.0  # Very fresh
        elif hours_old < 24:
            return 80.0   # Fresh
        elif hours_old < 72:
            return 60.0   # Recent
        elif hours_old < 168:  # 1 week
            return 40.0   # Somewhat old
        else:
            return 20.0   # Old

    def _is_semantically_related(self, tag: str, text: str) -> bool:
        """
        Check if a tag is semantically related to the text content
        """
        # Simple semantic relationships (in production, use word embeddings)
        semantic_relations = {
            'ai': ['artificial', 'intelligence', 'machine', 'learning', 'neural', 'deep', 'algorithm'],
            'technology': ['tech', 'digital', 'innovation', 'software', 'hardware', 'computing'],
            'marketing': ['advertising', 'promotion', 'brand', 'campaign', 'social media'],
            'design': ['ui', 'ux', 'visual', 'graphic', 'interface', 'user experience'],
            'photography': ['photo', 'camera', 'image', 'picture', 'visual', 'shoot'],
            'business': ['company', 'startup', 'entrepreneur', 'revenue', 'profit', 'corporate'],
            'innovation': ['breakthrough', 'revolutionary', 'cutting-edge', 'advanced', 'novel']
        }

        related_terms = semantic_relations.get(tag, [])
        return any(term in text for term in related_terms)

    async def _cleanup(self):
        """Cleanup resources"""
        pass