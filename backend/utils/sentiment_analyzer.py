"""
Sentiment Analyzer for news articles
"""
import logging
from typing import Optional, Dict, Any
import re

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    """
    Simple rule-based sentiment analyzer for news articles
    In production, this would use more sophisticated NLP models
    """

    def __init__(self):
        self.positive_words = set()
        self.negative_words = set()
        self.neutral_words = set()

    async def initialize(self):
        """Initialize sentiment word lists"""
        # Positive sentiment words
        self.positive_words = {
            'excellent', 'amazing', 'fantastic', 'great', 'good', 'positive',
            'successful', 'breakthrough', 'innovation', 'launch', 'growth',
            'increase', 'improve', 'better', 'best', 'outstanding', 'remarkable',
            'exceptional', 'wonderful', 'brilliant', 'impressive', 'exciting',
            'promising', 'optimistic', 'beneficial', 'advantage', 'progress',
            'achievement', 'success', 'win', 'victory', 'triumph', 'celebrate',
            'milestone', 'record', 'surge', 'boom', 'rise', 'gains'
        }

        # Negative sentiment words
        self.negative_words = {
            'terrible', 'awful', 'bad', 'negative', 'failed', 'failure',
            'crisis', 'problem', 'issue', 'concern', 'worry', 'decline',
            'decrease', 'drop', 'fall', 'crash', 'collapse', 'disaster',
            'scandal', 'controversy', 'lawsuit', 'investigation', 'breach',
            'hack', 'attack', 'threat', 'risk', 'danger', 'warning',
            'alert', 'emergency', 'critical', 'serious', 'severe',
            'loss', 'losses', 'deficit', 'bankruptcy', 'closure', 'shutdown',
            'layoffs', 'cuts', 'reduction', 'disappointing', 'unfortunate'
        }

        # Neutral/business words
        self.neutral_words = {
            'announced', 'released', 'launched', 'developed', 'created',
            'introduced', 'presented', 'revealed', 'unveiled', 'published',
            'reported', 'stated', 'said', 'mentioned', 'noted', 'discussed',
            'according', 'research', 'study', 'analysis', 'data', 'statistics',
            'company', 'business', 'industry', 'market', 'technology', 'product',
            'service', 'platform', 'system', 'solution', 'feature', 'update'
        }

        logger.info("Sentiment Analyzer initialized")

    async def analyze_sentiment(self, text: str) -> str:
        """
        Analyze sentiment of text and return 'positive', 'negative', or 'neutral'
        """
        if not text:
            return 'neutral'

        try:
            # Clean and tokenize text
            words = self._tokenize_text(text.lower())

            # Count sentiment words
            positive_count = sum(1 for word in words if word in self.positive_words)
            negative_count = sum(1 for word in words if word in self.negative_words)

            # Apply contextual modifiers
            positive_score, negative_score = self._apply_contextual_analysis(text, positive_count, negative_count)

            # Determine overall sentiment
            if positive_score > negative_score:
                return 'positive'
            elif negative_score > positive_score:
                return 'negative'
            else:
                return 'neutral'

        except Exception as e:
            logger.error(f"Error analyzing sentiment: {str(e)}")
            return 'neutral'

    def _tokenize_text(self, text: str) -> list:
        """Simple word tokenization"""
        # Remove punctuation and split into words
        words = re.findall(r'\b[a-zA-Z]+\b', text)
        return [word.lower() for word in words if len(word) > 2]

    def _apply_contextual_analysis(self, text: str, positive_count: int, negative_count: int) -> tuple:
        """
        Apply contextual analysis to improve sentiment accuracy
        """
        text_lower = text.lower()

        # Amplifiers and diminishers
        amplifiers = ['very', 'extremely', 'highly', 'significantly', 'greatly', 'absolutely']
        diminishers = ['slightly', 'somewhat', 'rather', 'quite', 'fairly', 'relatively']

        # Negation handling
        negation_words = ['not', 'no', 'never', 'none', 'neither', 'nobody', 'nothing']

        # Check for amplifiers
        amplifier_multiplier = 1.0
        for amplifier in amplifiers:
            if amplifier in text_lower:
                amplifier_multiplier = 1.5
                break

        # Check for diminishers
        for diminisher in diminishers:
            if diminisher in text_lower:
                amplifier_multiplier = 0.7
                break

        # Handle negation (simple approach)
        negation_present = any(neg in text_lower for neg in negation_words)
        if negation_present:
            # Swap positive and negative scores for negation
            positive_count, negative_count = negative_count, positive_count

        # Apply multipliers
        positive_score = positive_count * amplifier_multiplier
        negative_score = negative_count * amplifier_multiplier

        # News-specific adjustments
        positive_score += self._get_news_specific_sentiment_boost(text_lower, 'positive')
        negative_score += self._get_news_specific_sentiment_boost(text_lower, 'negative')

        return positive_score, negative_score

    def _get_news_specific_sentiment_boost(self, text: str, sentiment_type: str) -> float:
        """
        Apply news-specific sentiment boosts
        """
        boost = 0.0

        if sentiment_type == 'positive':
            # Positive business news indicators
            positive_patterns = [
                r'stock.{0,20}(rose|gained|surged|jumped|climbed)',
                r'revenue.{0,20}(increased|grew|rose|up)',
                r'profit.{0,20}(up|increased|rose|surged)',
                r'sales.{0,20}(increased|grew|up|strong)',
                r'(launched|announced|unveiled).{0,50}(new|innovative|breakthrough)',
                r'partnership.{0,20}(announced|formed|established)',
                r'funding.{0,20}(raised|secured|obtained)',
                r'expansion.{0,20}(announced|planned|launched)'
            ]

            for pattern in positive_patterns:
                if re.search(pattern, text):
                    boost += 1.0

        elif sentiment_type == 'negative':
            # Negative business news indicators
            negative_patterns = [
                r'stock.{0,20}(fell|dropped|plunged|crashed|declined)',
                r'revenue.{0,20}(decreased|fell|dropped|down)',
                r'profit.{0,20}(down|decreased|fell|dropped)',
                r'sales.{0,20}(decreased|fell|down|weak)',
                r'(lawsuit|investigation|probe|scandal)',
                r'(layoffs|cuts|reduction|closure|shutdown)',
                r'(breach|hack|attack|vulnerability)',
                r'(crisis|emergency|critical|serious.{0,20}concern)'
            ]

            for pattern in negative_patterns:
                if re.search(pattern, text):
                    boost += 1.0

        return boost

    async def get_sentiment_confidence(self, text: str) -> Dict[str, Any]:
        """
        Get detailed sentiment analysis with confidence scores
        """
        if not text:
            return {'sentiment': 'neutral', 'confidence': 0.0, 'scores': {}}

        try:
            words = self._tokenize_text(text.lower())
            total_words = len(words)

            if total_words == 0:
                return {'sentiment': 'neutral', 'confidence': 0.0, 'scores': {}}

            # Count sentiment words
            positive_count = sum(1 for word in words if word in self.positive_words)
            negative_count = sum(1 for word in words if word in self.negative_words)
            neutral_count = sum(1 for word in words if word in self.neutral_words)

            # Apply contextual analysis
            positive_score, negative_score = self._apply_contextual_analysis(text, positive_count, negative_count)

            # Calculate percentages
            total_sentiment_words = positive_count + negative_count + neutral_count
            sentiment_coverage = total_sentiment_words / total_words if total_words > 0 else 0

            # Determine sentiment and confidence
            if positive_score > negative_score:
                sentiment = 'positive'
                confidence = min((positive_score - negative_score) / max(total_words * 0.1, 1), 1.0)
            elif negative_score > positive_score:
                sentiment = 'negative'
                confidence = min((negative_score - positive_score) / max(total_words * 0.1, 1), 1.0)
            else:
                sentiment = 'neutral'
                confidence = 1.0 - abs(positive_score - negative_score) / max(total_words * 0.1, 1)

            # Adjust confidence based on sentiment word coverage
            confidence *= min(sentiment_coverage * 2, 1.0)

            return {
                'sentiment': sentiment,
                'confidence': round(confidence, 2),
                'scores': {
                    'positive': round(positive_score, 2),
                    'negative': round(negative_score, 2),
                    'neutral': neutral_count
                },
                'word_counts': {
                    'total': total_words,
                    'positive': positive_count,
                    'negative': negative_count,
                    'neutral': neutral_count
                },
                'coverage': round(sentiment_coverage, 2)
            }

        except Exception as e:
            logger.error(f"Error in detailed sentiment analysis: {str(e)}")
            return {
                'sentiment': 'neutral',
                'confidence': 0.0,
                'scores': {'positive': 0, 'negative': 0, 'neutral': 0}
            }

    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Sentiment Analyzer cleanup completed")