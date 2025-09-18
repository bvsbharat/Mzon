"""
Content Extractor for detailed article content and summarization
"""
import os
import asyncio
import aiohttp
import logging
from typing import Optional, List
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)

class ContentExtractor:
    """
    Extracts and processes full article content from URLs
    """

    def __init__(self):
        self.session = None

    async def initialize(self):
        """Initialize the HTTP session"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        )
        logger.info("Content Extractor initialized")

    async def extract_content(self, url: str) -> Optional[str]:
        """
        Extract the main content from an article URL
        """
        if not self.session:
            logger.warning("Content Extractor not initialized")
            return None

        try:
            # Fetch the article page
            async with self.session.get(url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch article {url}: {response.status}")
                    return None

                html_content = await response.text()

            # Parse HTML and extract content
            soup = BeautifulSoup(html_content, 'html.parser')

            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "aside", "header"]):
                script.decompose()

            # Try multiple content extraction strategies
            content = (
                self._extract_by_article_tag(soup) or
                self._extract_by_content_selectors(soup) or
                self._extract_by_paragraphs(soup) or
                self._extract_by_main_content(soup)
            )

            if content:
                # Clean and format the extracted content
                content = self._clean_content(content)
                logger.debug(f"Extracted {len(content)} characters from {url}")
                return content

            logger.warning(f"Could not extract content from {url}")
            return None

        except Exception as e:
            logger.error(f"Error extracting content from {url}: {str(e)}")
            return None

    def _extract_by_article_tag(self, soup: BeautifulSoup) -> Optional[str]:
        """Try extracting content from <article> tags"""
        article = soup.find('article')
        if article:
            return article.get_text(separator=' ', strip=True)
        return None

    def _extract_by_content_selectors(self, soup: BeautifulSoup) -> Optional[str]:
        """Try extracting using common content selectors"""
        selectors = [
            '.article-content',
            '.entry-content',
            '.post-content',
            '.content-body',
            '.article-body',
            '[role="main"]',
            '.main-content',
            '#content',
            '.content'
        ]

        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                content = element.get_text(separator=' ', strip=True)
                if len(content) > 500:  # Only return if substantial content
                    return content

        return None

    def _extract_by_paragraphs(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract content by collecting paragraphs"""
        paragraphs = soup.find_all('p')
        if not paragraphs:
            return None

        # Filter out short paragraphs and navigation text
        content_paragraphs = []
        for p in paragraphs:
            text = p.get_text(strip=True)
            if len(text) > 50 and not self._is_navigation_text(text):
                content_paragraphs.append(text)

        if content_paragraphs:
            return ' '.join(content_paragraphs)

        return None

    def _extract_by_main_content(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract content from main content area"""
        main_tags = ['main', '[role="main"]', '.main']

        for tag in main_tags:
            element = soup.select_one(tag)
            if element:
                content = element.get_text(separator=' ', strip=True)
                if len(content) > 200:
                    return content

        return None

    def _is_navigation_text(self, text: str) -> bool:
        """Check if text is likely navigation/menu content"""
        nav_indicators = [
            'subscribe', 'newsletter', 'follow us', 'share', 'tweet',
            'facebook', 'linkedin', 'twitter', 'menu', 'home',
            'about', 'contact', 'privacy', 'terms', 'cookie'
        ]

        text_lower = text.lower()
        return any(indicator in text_lower for indicator in nav_indicators)

    def _clean_content(self, content: str) -> str:
        """Clean and format extracted content"""
        # Remove extra whitespace
        content = re.sub(r'\s+', ' ', content)

        # Remove common junk text
        junk_patterns = [
            r'Advertisement\s*',
            r'ADVERTISEMENT\s*',
            r'Subscribe to.*?newsletter',
            r'Follow us on.*?',
            r'Share this article.*?',
            r'Read more:.*?',
            r'Continue reading.*?',
            r'Click here.*?',
            r'Source:.*?$'
        ]

        for pattern in junk_patterns:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE)

        # Clean up punctuation and formatting
        content = re.sub(r'\s*([.!?])\s*', r'\1 ', content)
        content = re.sub(r'\s+', ' ', content)

        return content.strip()

    async def generate_summary(self, content: str, max_sentences: int = 3) -> str:
        """
        Generate a summary of the content
        Simple extractive summarization based on sentence scoring
        """
        try:
            # Split into sentences
            sentences = re.split(r'[.!?]+', content)
            sentences = [s.strip() for s in sentences if len(s.strip()) > 20]

            if not sentences:
                return content[:200] + "..." if len(content) > 200 else content

            # Score sentences based on various factors
            sentence_scores = {}
            for i, sentence in enumerate(sentences):
                score = 0

                # Position-based scoring (earlier sentences get higher scores)
                if i < len(sentences) * 0.3:
                    score += 2

                # Length-based scoring (prefer medium-length sentences)
                if 50 <= len(sentence) <= 150:
                    score += 1

                # Keyword-based scoring
                keywords = [
                    'announced', 'launched', 'released', 'developed', 'created',
                    'new', 'first', 'breakthrough', 'innovation', 'study',
                    'research', 'report', 'according', 'experts', 'industry'
                ]

                sentence_lower = sentence.lower()
                for keyword in keywords:
                    if keyword in sentence_lower:
                        score += 1

                sentence_scores[i] = score

            # Select top sentences
            top_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)
            selected_indices = sorted([idx for idx, _ in top_sentences[:max_sentences]])

            summary_sentences = [sentences[i] for i in selected_indices]
            summary = '. '.join(summary_sentences)

            # Ensure summary ends properly
            if summary and not summary.endswith('.'):
                summary += '.'

            return summary

        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            # Fallback to first few sentences
            return '. '.join(content.split('. ')[:max_sentences]) + '.'

    async def extract_metadata(self, url: str) -> dict:
        """
        Extract metadata from article (Open Graph, meta tags, etc.)
        """
        if not self.session:
            return {}

        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return {}

                html_content = await response.text()

            soup = BeautifulSoup(html_content, 'html.parser')

            metadata = {}

            # Extract Open Graph data
            og_tags = soup.find_all('meta', property=lambda x: x and x.startswith('og:'))
            for tag in og_tags:
                property_name = tag.get('property', '')[3:]  # Remove 'og:' prefix
                content = tag.get('content')
                if property_name and content:
                    metadata[property_name] = content

            # Extract Twitter Card data
            twitter_tags = soup.find_all('meta', attrs={'name': lambda x: x and x.startswith('twitter:')})
            for tag in twitter_tags:
                name = tag.get('name')[8:]  # Remove 'twitter:' prefix
                content = tag.get('content')
                if name and content:
                    metadata[f"twitter_{name}"] = content

            # Extract standard meta tags
            meta_tags = {
                'description': soup.find('meta', attrs={'name': 'description'}),
                'keywords': soup.find('meta', attrs={'name': 'keywords'}),
                'author': soup.find('meta', attrs={'name': 'author'}),
                'publish_date': soup.find('meta', attrs={'name': 'publish_date'})
            }

            for key, tag in meta_tags.items():
                if tag:
                    content = tag.get('content')
                    if content:
                        metadata[key] = content

            # Extract title if not in metadata
            if 'title' not in metadata:
                title_tag = soup.find('title')
                if title_tag:
                    metadata['title'] = title_tag.get_text(strip=True)

            return metadata

        except Exception as e:
            logger.error(f"Error extracting metadata from {url}: {str(e)}")
            return {}

    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            logger.info("Content Extractor cleanup completed")