"""
Social Content Agent - Optimizes content for different social media platforms
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from agents.base_agent import BaseAgent
from models.news_models import ProcessedNewsItem, SocialMediaPost, AgentStatus
from services.websocket_manager import WebSocketManager

logger = logging.getLogger(__name__)

class SocialContentAgent(BaseAgent):
    """
    Specialized agent for optimizing news content for social media platforms
    """

    def __init__(self):
        super().__init__("SocialContentAgent")
        self.platform_configs = {}

    async def _setup(self):
        """Initialize social media platform configurations"""
        self.platform_configs = {
            'twitter': {
                'max_chars': 280,
                'hashtag_limit': 2,
                'style': 'concise_engaging',
                'call_to_action': True
            },
            'linkedin': {
                'max_chars': 3000,
                'hashtag_limit': 5,
                'style': 'professional',
                'call_to_action': True
            },
            'instagram': {
                'max_chars': 2200,
                'hashtag_limit': 10,
                'style': 'visual_engaging',
                'call_to_action': True
            },
            'facebook': {
                'max_chars': 63206,
                'hashtag_limit': 3,
                'style': 'conversational',
                'call_to_action': True
            }
        }

    async def execute(self, session_id: str, **kwargs) -> Dict[str, Any]:
        """
        Execute social media content optimization
        """
        try:
            self.validate_kwargs(['articles'], **kwargs)

            articles = kwargs.get('articles', [])
            platforms = kwargs.get('platforms', ['twitter', 'linkedin', 'instagram'])
            websocket_manager = kwargs.get('websocket_manager')

            if not articles:
                return {"optimized_articles": []}

            await self.set_status(AgentStatus.PROCESSING)
            await self.send_update(
                session_id,
                f"Optimizing {len(articles)} articles for {len(platforms)} social platforms...",
                0,
                websocket_manager=websocket_manager
            )

            optimized_articles = []
            total_work = len(articles) * len(platforms)
            completed_work = 0

            for i, article in enumerate(articles):
                try:
                    # Create social media posts for each platform
                    social_posts = []

                    for platform in platforms:
                        if platform in self.platform_configs:
                            progress = (completed_work / total_work) * 100

                            if completed_work % 5 == 0:  # Update every 5 operations
                                await self.send_update(
                                    session_id,
                                    f"Creating {platform} post for: {article.title[:40]}...",
                                    progress,
                                    websocket_manager=websocket_manager
                                )

                            post = await self._create_social_post(article, platform)
                            if post:
                                social_posts.append(post)

                            completed_work += 1

                    # Update article with social media posts
                    article.social_posts = social_posts

                    # Calculate social media optimization score
                    article.social_optimized = True

                    optimized_articles.append(article)

                except Exception as e:
                    logger.error(f"Error optimizing article {article.title}: {str(e)}")
                    # Keep original article
                    optimized_articles.append(article)

            await self.set_status(AgentStatus.COMPLETED)
            await self.send_update(
                session_id,
                f"Social media optimization completed for {len(optimized_articles)} articles",
                100,
                {
                    "optimized_count": len(optimized_articles),
                    "platforms": platforms,
                    "total_posts_created": sum(len(a.social_posts) for a in optimized_articles)
                },
                websocket_manager=websocket_manager
            )

            return {
                "articles": optimized_articles,
                "optimized_count": len(optimized_articles),
                "total_posts": sum(len(a.social_posts) for a in optimized_articles)
            }

        except Exception as e:
            await self.handle_error(session_id, e, websocket_manager)
            return {"error": str(e), "articles": []}

    async def _create_social_post(
        self,
        article: ProcessedNewsItem,
        platform: str
    ) -> Optional[SocialMediaPost]:
        """
        Create an optimized social media post for a specific platform
        """
        try:
            config = self.platform_configs[platform]

            # Generate platform-specific content
            content = await self._generate_platform_content(article, platform, config)

            # Select hashtags for the platform
            hashtags = await self._select_hashtags(article, config['hashtag_limit'])

            # Calculate character count
            full_content = f"{content} {' '.join(hashtags)}"
            char_count = len(full_content)

            # Ensure content fits within platform limits
            if char_count > config['max_chars']:
                content = await self._trim_content(content, config['max_chars'], hashtags)
                char_count = len(f"{content} {' '.join(hashtags)}")

            # Calculate engagement prediction
            engagement_prediction = await self._predict_engagement(article, platform, content)

            return SocialMediaPost(
                platform=platform,
                content=content,
                hashtags=hashtags,
                image_url=article.image_url,
                character_count=char_count,
                engagement_prediction=engagement_prediction
            )

        except Exception as e:
            logger.error(f"Error creating {platform} post: {str(e)}")
            return None

    async def _generate_platform_content(
        self,
        article: ProcessedNewsItem,
        platform: str,
        config: Dict[str, Any]
    ) -> str:
        """
        Generate platform-specific content
        """
        style = config['style']

        if style == 'concise_engaging':  # Twitter
            return await self._generate_twitter_content(article, config)
        elif style == 'professional':  # LinkedIn
            return await self._generate_linkedin_content(article, config)
        elif style == 'visual_engaging':  # Instagram
            return await self._generate_instagram_content(article, config)
        elif style == 'conversational':  # Facebook
            return await self._generate_facebook_content(article, config)
        else:
            return await self._generate_generic_content(article, config)

    async def _generate_twitter_content(
        self,
        article: ProcessedNewsItem,
        config: Dict[str, Any]
    ) -> str:
        """
        Generate Twitter-optimized content
        """
        # Twitter: Short, punchy, direct
        if article.summary and len(article.summary) > 0:
            base_content = article.summary[:150]
        else:
            base_content = article.description[:150] if article.description else article.title

        # Add engaging elements
        if article.trending_potential and article.trending_potential > 70:
            base_content = f"🚀 {base_content}"

        # Add call to action
        if config.get('call_to_action'):
            base_content += "\n\nRead more:"

        return base_content

    async def _generate_linkedin_content(
        self,
        article: ProcessedNewsItem,
        config: Dict[str, Any]
    ) -> str:
        """
        Generate LinkedIn-optimized content
        """
        # LinkedIn: Professional, informative, thought-provoking
        content_parts = []

        # Start with a hook
        if article.key_points:
            content_parts.append(f"💡 Key insight: {article.key_points[0]}")
        else:
            content_parts.append(f"💡 {article.title}")

        # Add summary or description
        if article.summary:
            content_parts.append(f"\n{article.summary}")
        elif article.description:
            content_parts.append(f"\n{article.description}")

        # Add key points if available
        if len(article.key_points) > 1:
            content_parts.append("\n\nKey takeaways:")
            for i, point in enumerate(article.key_points[:3], 1):
                content_parts.append(f"{i}. {point}")

        # Add professional CTA
        if config.get('call_to_action'):
            content_parts.append("\n\nWhat are your thoughts on this development?")
            content_parts.append("\nRead the full article:")

        return "".join(content_parts)

    async def _generate_instagram_content(
        self,
        article: ProcessedNewsItem,
        config: Dict[str, Any]
    ) -> str:
        """
        Generate Instagram-optimized content
        """
        # Instagram: Visual, engaging, story-driven
        content_parts = []

        # Start with an engaging hook
        content_parts.append(f"📸 {article.title}")

        # Add engaging description
        if article.summary:
            content_parts.append(f"\n\n{article.summary}")

        # Add story elements
        if article.key_points:
            content_parts.append("\n\n✨ What makes this interesting:")
            content_parts.append(f"• {article.key_points[0]}")

        # Visual call to action
        if config.get('call_to_action'):
            content_parts.append("\n\n👆 Swipe up to read more!")
            content_parts.append("\nWhat do you think? Comment below! 👇")

        return "".join(content_parts)

    async def _generate_facebook_content(
        self,
        article: ProcessedNewsItem,
        config: Dict[str, Any]
    ) -> str:
        """
        Generate Facebook-optimized content
        """
        # Facebook: Conversational, community-focused
        content_parts = []

        # Start conversationally
        content_parts.append(f"Interesting read: {article.title}")

        # Add content
        if article.summary:
            content_parts.append(f"\n\n{article.summary}")

        # Add discussion starter
        if article.key_points:
            content_parts.append(f"\n\nOne key point that caught my attention: {article.key_points[0]}")

        # Community engagement
        if config.get('call_to_action'):
            content_parts.append("\n\nWhat's your take on this? Would love to hear your thoughts in the comments!")

        return "".join(content_parts)

    async def _generate_generic_content(
        self,
        article: ProcessedNewsItem,
        config: Dict[str, Any]
    ) -> str:
        """
        Generate generic social media content
        """
        content = article.title

        if article.summary:
            content += f"\n\n{article.summary}"
        elif article.description:
            content += f"\n\n{article.description}"

        if config.get('call_to_action'):
            content += "\n\nRead more:"

        return content

    async def _select_hashtags(
        self,
        article: ProcessedNewsItem,
        limit: int
    ) -> List[str]:
        """
        Select the most relevant hashtags for the post
        """
        hashtags = []

        # Use article's existing hashtags
        if article.hashtags:
            hashtags.extend(article.hashtags[:limit])

        # Generate additional hashtags if needed
        if len(hashtags) < limit:
            additional_tags = await self._generate_additional_hashtags(article, limit - len(hashtags))
            hashtags.extend(additional_tags)

        # Ensure hashtags are properly formatted
        formatted_hashtags = []
        for tag in hashtags[:limit]:
            if not tag.startswith('#'):
                tag = f"#{tag}"
            # Remove spaces and special characters
            tag = ''.join(c for c in tag if c.isalnum() or c == '#')
            if len(tag) > 1:  # Must have content after #
                formatted_hashtags.append(tag)

        return formatted_hashtags

    async def _generate_additional_hashtags(
        self,
        article: ProcessedNewsItem,
        needed_count: int
    ) -> List[str]:
        """
        Generate additional relevant hashtags
        """
        hashtags = []

        # Category-based hashtags
        if article.category:
            category_hashtags = {
                'ai': ['#AI', '#ArtificialIntelligence', '#MachineLearning'],
                'technology': ['#Tech', '#Innovation', '#Digital'],
                'business': ['#Business', '#Startup', '#Innovation'],
                'marketing': ['#Marketing', '#SocialMedia', '#DigitalMarketing'],
                'design': ['#Design', '#UX', '#Creative'],
                'photography': ['#Photography', '#Visual', '#Creative']
            }

            category = article.category.value if hasattr(article.category, 'value') else str(article.category)
            if category in category_hashtags:
                hashtags.extend(category_hashtags[category][:needed_count])

        # General trending hashtags
        if len(hashtags) < needed_count:
            general_hashtags = ['#News', '#Update', '#TechNews', '#Innovation']
            hashtags.extend(general_hashtags[:needed_count - len(hashtags)])

        return hashtags[:needed_count]

    async def _trim_content(
        self,
        content: str,
        max_chars: int,
        hashtags: List[str]
    ) -> str:
        """
        Trim content to fit within character limits
        """
        hashtag_chars = len(' '.join(hashtags))
        available_chars = max_chars - hashtag_chars - 10  # Leave some buffer

        if len(content) <= available_chars:
            return content

        # Try to trim at sentence boundary
        sentences = content.split('. ')
        trimmed_content = ""

        for sentence in sentences:
            test_content = trimmed_content + sentence + ". "
            if len(test_content) <= available_chars:
                trimmed_content = test_content
            else:
                break

        if not trimmed_content:
            # If no complete sentences fit, cut at word boundary
            words = content.split()
            for i, word in enumerate(words):
                test_content = ' '.join(words[:i+1])
                if len(test_content) > available_chars - 3:  # Leave space for "..."
                    return ' '.join(words[:i]) + "..."

        return trimmed_content.strip()

    async def _predict_engagement(
        self,
        article: ProcessedNewsItem,
        platform: str,
        content: str
    ) -> float:
        """
        Predict engagement potential for the social media post
        """
        base_score = 50.0

        # Article quality factors
        if article.trending_potential:
            base_score += article.trending_potential * 0.3

        if article.engagement_score:
            base_score += article.engagement_score * 0.2

        # Platform-specific factors
        platform_multipliers = {
            'twitter': 1.0,
            'linkedin': 0.8,
            'instagram': 1.2,
            'facebook': 0.9
        }

        multiplier = platform_multipliers.get(platform, 1.0)
        base_score *= multiplier

        # Content factors
        if '?' in content:  # Questions tend to get more engagement
            base_score += 5

        if any(emoji in content for emoji in ['🚀', '💡', '📸', '✨', '🔥']):
            base_score += 5

        # Time sensitivity
        if article.published_at:
            hours_old = (datetime.now() - article.published_at).total_seconds() / 3600
            if hours_old < 24:
                base_score += 10

        return min(base_score, 100.0)

    async def _cleanup(self):
        """Cleanup resources"""
        pass