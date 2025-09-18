"""
Trending Analyzer Service - Analyzes trends and virality across platforms
Calculates engagement scores, trend predictions, and content opportunities
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import json
import statistics
from collections import Counter

logger = logging.getLogger(__name__)

class TrendingAnalyzer:
    """Service for analyzing trending topics and viral content"""

    def __init__(self):
        self.trend_cache = {}
        self.engagement_weights = {
            'twitter': {'mentions': 1.0, 'retweets': 2.0, 'likes': 0.5},
            'facebook': {'shares': 3.0, 'likes': 0.3, 'comments': 1.5},
            'instagram': {'likes': 0.4, 'comments': 2.0, 'shares': 2.5},
            'reddit': {'upvotes': 1.0, 'comments': 1.2, 'awards': 5.0}
        }

    def calculate_virality_score(self, social_engagement: Dict[str, Any]) -> float:
        """Calculate virality score based on social engagement metrics"""
        try:
            total_score = 0.0
            platform_count = 0

            for platform, metrics in social_engagement.items():
                if platform == 'totalEngagement' or platform == 'sentiment':
                    continue

                if platform in self.engagement_weights:
                    platform_score = 0.0
                    weights = self.engagement_weights[platform]

                    for metric, value in metrics.items():
                        if metric in weights:
                            platform_score += value * weights[metric]

                    total_score += platform_score
                    platform_count += 1

            # Normalize score (0-100)
            if platform_count > 0:
                average_score = total_score / platform_count
                # Scale to 0-100 range
                virality_score = min(100, max(0, average_score / 100))
                return round(virality_score, 1)

            return 0.0

        except Exception as e:
            logger.error(f"Error calculating virality score: {str(e)}")
            return 0.0

    def analyze_trend_momentum(
        self,
        historical_data: List[Dict[str, Any]],
        timeframe_hours: int = 24
    ) -> Dict[str, Any]:
        """Analyze trend momentum and predict future trajectory"""
        try:
            if not historical_data:
                return {'momentum': 'stable', 'prediction': 'maintain', 'confidence': 0.0}

            # Sort by timestamp
            sorted_data = sorted(
                historical_data,
                key=lambda x: x.get('timestamp', datetime.now().isoformat())
            )

            # Calculate momentum metrics
            engagement_values = [item.get('totalEngagement', 0) for item in sorted_data]
            virality_values = [item.get('viralityScore', 0) for item in sorted_data]

            if len(engagement_values) < 2:
                return {'momentum': 'stable', 'prediction': 'maintain', 'confidence': 0.5}

            # Calculate trends
            engagement_trend = self._calculate_trend_direction(engagement_values)
            virality_trend = self._calculate_trend_direction(virality_values)

            # Determine overall momentum
            momentum = self._determine_momentum(engagement_trend, virality_trend)

            # Predict future trajectory
            prediction = self._predict_trajectory(momentum, engagement_values, virality_values)

            # Calculate confidence based on data consistency
            confidence = self._calculate_prediction_confidence(
                engagement_values, virality_values
            )

            return {
                'momentum': momentum,
                'prediction': prediction,
                'confidence': confidence,
                'engagement_trend': engagement_trend,
                'virality_trend': virality_trend,
                'peak_time': self._find_peak_time(sorted_data)
            }

        except Exception as e:
            logger.error(f"Error analyzing trend momentum: {str(e)}")
            return {'momentum': 'stable', 'prediction': 'maintain', 'confidence': 0.0}

    def identify_content_opportunities(
        self,
        trending_topics: List[Dict[str, Any]],
        user_preferences: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Identify content creation opportunities based on trends"""
        try:
            opportunities = []

            for topic in trending_topics:
                opportunity_score = self._calculate_opportunity_score(topic, user_preferences)

                if opportunity_score > 60:  # Only high-value opportunities
                    opportunity = {
                        'id': f"opp_{topic['id']}",
                        'topic': topic['keyword'],
                        'opportunity_score': opportunity_score,
                        'difficulty': self._assess_content_difficulty(topic),
                        'time_sensitivity': self._calculate_time_sensitivity(topic),
                        'suggested_content_types': self._suggest_content_types(topic),
                        'competitive_analysis': self._analyze_competition(topic),
                        'optimal_timing': self._calculate_optimal_timing(topic),
                        'expected_reach': self._estimate_reach(topic),
                        'risk_level': self._assess_risk_level(topic)
                    }

                    opportunities.append(opportunity)

            # Sort by opportunity score
            opportunities.sort(key=lambda x: x['opportunity_score'], reverse=True)

            return opportunities[:10]  # Return top 10 opportunities

        except Exception as e:
            logger.error(f"Error identifying content opportunities: {str(e)}")
            return []

    def analyze_social_sentiment(
        self,
        social_engagement: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze sentiment and engagement patterns"""
        try:
            sentiment = social_engagement.get('sentiment', 'neutral')
            total_engagement = social_engagement.get('totalEngagement', 0)

            # Analyze platform-specific patterns
            platform_analysis = {}
            for platform, metrics in social_engagement.items():
                if platform in ['totalEngagement', 'sentiment']:
                    continue

                platform_analysis[platform] = self._analyze_platform_engagement(
                    platform, metrics
                )

            # Calculate sentiment strength
            sentiment_strength = self._calculate_sentiment_strength(
                social_engagement, total_engagement
            )

            return {
                'sentiment': sentiment,
                'sentiment_strength': sentiment_strength,
                'total_engagement': total_engagement,
                'platform_analysis': platform_analysis,
                'engagement_distribution': self._calculate_engagement_distribution(
                    social_engagement
                ),
                'viral_indicators': self._identify_viral_indicators(social_engagement)
            }

        except Exception as e:
            logger.error(f"Error analyzing social sentiment: {str(e)}")
            return {'sentiment': 'neutral', 'sentiment_strength': 0.5}

    def _calculate_trend_direction(self, values: List[float]) -> str:
        """Calculate if trend is rising, falling, or stable"""
        if len(values) < 2:
            return 'stable'

        # Calculate moving average to smooth out noise
        if len(values) >= 5:
            recent_avg = statistics.mean(values[-3:])
            earlier_avg = statistics.mean(values[:3])
        else:
            recent_avg = statistics.mean(values[len(values)//2:])
            earlier_avg = statistics.mean(values[:len(values)//2])

        change_rate = (recent_avg - earlier_avg) / earlier_avg if earlier_avg > 0 else 0

        if change_rate > 0.1:  # 10% increase
            return 'rising'
        elif change_rate < -0.1:  # 10% decrease
            return 'falling'
        else:
            return 'stable'

    def _determine_momentum(self, engagement_trend: str, virality_trend: str) -> str:
        """Determine overall momentum based on engagement and virality trends"""
        if engagement_trend == 'rising' and virality_trend == 'rising':
            return 'accelerating'
        elif engagement_trend == 'falling' and virality_trend == 'falling':
            return 'declining'
        elif engagement_trend == 'rising' or virality_trend == 'rising':
            return 'growing'
        elif engagement_trend == 'falling' or virality_trend == 'falling':
            return 'slowing'
        else:
            return 'stable'

    def _predict_trajectory(
        self,
        momentum: str,
        engagement_values: List[float],
        virality_values: List[float]
    ) -> str:
        """Predict future trajectory based on current momentum"""
        trajectory_map = {
            'accelerating': 'surge',
            'growing': 'rise',
            'stable': 'maintain',
            'slowing': 'decline',
            'declining': 'fade'
        }

        base_prediction = trajectory_map.get(momentum, 'maintain')

        # Adjust based on recent peak activity
        if engagement_values:
            current_engagement = engagement_values[-1]
            peak_engagement = max(engagement_values)

            if current_engagement >= peak_engagement * 0.9:  # Near peak
                if base_prediction in ['surge', 'rise']:
                    return 'peak_soon'

        return base_prediction

    def _calculate_prediction_confidence(
        self,
        engagement_values: List[float],
        virality_values: List[float]
    ) -> float:
        """Calculate confidence in trend prediction"""
        try:
            # More data points = higher confidence
            data_confidence = min(1.0, len(engagement_values) / 10)

            # Less variance = higher confidence
            if len(engagement_values) > 1:
                engagement_variance = statistics.variance(engagement_values)
                virality_variance = statistics.variance(virality_values)

                # Normalize variance to confidence score
                variance_confidence = 1.0 / (1.0 + (engagement_variance + virality_variance) / 1000)
            else:
                variance_confidence = 0.5

            # Combined confidence
            confidence = (data_confidence + variance_confidence) / 2

            return round(confidence, 2)

        except Exception as e:
            logger.error(f"Error calculating prediction confidence: {str(e)}")
            return 0.5

    def _find_peak_time(self, sorted_data: List[Dict[str, Any]]) -> Optional[str]:
        """Find the time of peak engagement"""
        try:
            if not sorted_data:
                return None

            peak_item = max(
                sorted_data,
                key=lambda x: x.get('totalEngagement', 0)
            )

            return peak_item.get('timestamp')

        except Exception as e:
            logger.error(f"Error finding peak time: {str(e)}")
            return None

    def _calculate_opportunity_score(
        self,
        topic: Dict[str, Any],
        user_preferences: Dict[str, Any] = None
    ) -> float:
        """Calculate content opportunity score for a topic"""
        try:
            base_score = 50.0

            # Trend momentum
            trend_status = topic.get('trend', 'stable')
            trend_scores = {'rising': 25, 'hot': 30, 'emerging': 20, 'declining': -10}
            base_score += trend_scores.get(trend_status, 0)

            # Volume
            volume = topic.get('volume', 0)
            volume_score = min(20, volume / 1000)  # Max 20 points for volume
            base_score += volume_score

            # Change rate
            change_rate = topic.get('changeRate', 0)
            change_score = min(15, max(-15, change_rate / 10))  # Scale change rate
            base_score += change_score

            # Platform diversity
            platforms = topic.get('platforms', [])
            platform_score = len(platforms) * 2  # 2 points per platform
            base_score += platform_score

            # User preference alignment
            if user_preferences:
                followed_topics = user_preferences.get('followedTopics', [])
                category = topic.get('category', '')
                if category in followed_topics:
                    base_score += 10

            return round(min(100, max(0, base_score)), 1)

        except Exception as e:
            logger.error(f"Error calculating opportunity score: {str(e)}")
            return 50.0

    def _assess_content_difficulty(self, topic: Dict[str, Any]) -> str:
        """Assess difficulty of creating content for this topic"""
        # Simplified assessment based on topic complexity
        keyword = topic.get('keyword', '').lower()

        technical_terms = ['quantum', 'blockchain', 'ai', 'machine learning', 'cryptocurrency']
        if any(term in keyword for term in technical_terms):
            return 'hard'

        trend_status = topic.get('trend', 'stable')
        if trend_status == 'emerging':
            return 'medium'

        return 'easy'

    def _calculate_time_sensitivity(self, topic: Dict[str, Any]) -> str:
        """Calculate how time-sensitive this topic is"""
        trend_status = topic.get('trend', 'stable')
        change_rate = abs(topic.get('changeRate', 0))

        if trend_status == 'hot' and change_rate > 50:
            return 'very_high'
        elif trend_status in ['rising', 'hot']:
            return 'high'
        elif trend_status == 'emerging':
            return 'medium'
        else:
            return 'low'

    def _suggest_content_types(self, topic: Dict[str, Any]) -> List[str]:
        """Suggest content types that work well for this topic"""
        platforms = topic.get('platforms', [])
        keyword = topic.get('keyword', '').lower()

        content_types = []

        # Platform-based suggestions
        if 'twitter' in platforms:
            content_types.extend(['thread', 'opinion_post', 'news_update'])

        if 'instagram' in platforms:
            content_types.extend(['carousel', 'story', 'reel'])

        if 'linkedin' in platforms:
            content_types.extend(['article', 'professional_post', 'case_study'])

        # Topic-based suggestions
        if any(term in keyword for term in ['tech', 'ai', 'innovation']):
            content_types.extend(['explainer', 'prediction', 'analysis'])

        if any(term in keyword for term in ['trend', 'viral', 'popular']):
            content_types.extend(['reaction', 'commentary', 'meme'])

        return list(set(content_types))  # Remove duplicates

    def _analyze_competition(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze competition level for this topic"""
        volume = topic.get('volume', 0)

        # Simplified competition analysis
        if volume > 50000:
            competition_level = 'high'
            saturation = 'very_high'
        elif volume > 10000:
            competition_level = 'medium'
            saturation = 'high'
        else:
            competition_level = 'low'
            saturation = 'medium'

        return {
            'level': competition_level,
            'saturation': saturation,
            'estimated_creators': volume // 100,  # Rough estimate
            'differentiation_opportunity': 'high' if competition_level == 'low' else 'medium'
        }

    def _calculate_optimal_timing(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate optimal timing for content creation"""
        time_sensitivity = self._calculate_time_sensitivity(topic)

        timing_map = {
            'very_high': {'window': '1-2 hours', 'urgency': 'immediate'},
            'high': {'window': '2-6 hours', 'urgency': 'within_day'},
            'medium': {'window': '1-2 days', 'urgency': 'this_week'},
            'low': {'window': '3-7 days', 'urgency': 'flexible'}
        }

        return timing_map.get(time_sensitivity, timing_map['medium'])

    def _estimate_reach(self, topic: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate potential reach for content on this topic"""
        volume = topic.get('volume', 0)
        platforms = topic.get('platforms', [])

        base_reach = volume * 0.1  # 10% of topic volume

        platform_multipliers = {
            'twitter': 1.2,
            'instagram': 1.5,
            'linkedin': 0.8,
            'facebook': 1.1
        }

        platform_reach = {}
        for platform in platforms:
            multiplier = platform_multipliers.get(platform, 1.0)
            platform_reach[platform] = int(base_reach * multiplier)

        return {
            'estimated_impressions': int(base_reach),
            'platform_breakdown': platform_reach,
            'confidence': 'medium'  # Simplified confidence
        }

    def _assess_risk_level(self, topic: Dict[str, Any]) -> str:
        """Assess risk level of creating content for this topic"""
        keyword = topic.get('keyword', '').lower()

        high_risk_terms = ['controversy', 'political', 'scandal', 'crisis']
        medium_risk_terms = ['debate', 'opinion', 'polarizing']

        if any(term in keyword for term in high_risk_terms):
            return 'high'
        elif any(term in keyword for term in medium_risk_terms):
            return 'medium'
        else:
            return 'low'

    def _analyze_platform_engagement(
        self,
        platform: str,
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze engagement patterns for specific platform"""
        total_engagement = sum(metrics.values())

        return {
            'total_engagement': total_engagement,
            'dominant_metric': max(metrics, key=metrics.get),
            'engagement_distribution': {
                metric: round((value / total_engagement) * 100, 1)
                for metric, value in metrics.items()
                if total_engagement > 0
            },
            'platform_health': 'good' if total_engagement > 100 else 'moderate'
        }

    def _calculate_sentiment_strength(
        self,
        social_engagement: Dict[str, Any],
        total_engagement: int
    ) -> float:
        """Calculate strength of sentiment (how strong the positive/negative feeling is)"""
        # Simplified sentiment strength calculation
        sentiment = social_engagement.get('sentiment', 'neutral')

        if sentiment == 'neutral':
            return 0.5

        # Higher engagement generally indicates stronger sentiment
        strength = min(1.0, total_engagement / 1000)

        return round(strength, 2)

    def _calculate_engagement_distribution(
        self,
        social_engagement: Dict[str, Any]
    ) -> Dict[str, float]:
        """Calculate how engagement is distributed across platforms"""
        total = social_engagement.get('totalEngagement', 0)
        if total == 0:
            return {}

        distribution = {}
        for platform, metrics in social_engagement.items():
            if platform in ['totalEngagement', 'sentiment']:
                continue

            platform_total = sum(metrics.values()) if isinstance(metrics, dict) else 0
            distribution[platform] = round((platform_total / total) * 100, 1)

        return distribution

    def _identify_viral_indicators(
        self,
        social_engagement: Dict[str, Any]
    ) -> List[str]:
        """Identify indicators that suggest viral potential"""
        indicators = []
        total_engagement = social_engagement.get('totalEngagement', 0)

        # High engagement threshold
        if total_engagement > 5000:
            indicators.append('high_engagement_volume')

        # Platform-specific viral indicators
        for platform, metrics in social_engagement.items():
            if platform in ['totalEngagement', 'sentiment']:
                continue

            if isinstance(metrics, dict):
                if platform == 'twitter' and metrics.get('retweets', 0) > 500:
                    indicators.append('twitter_viral_retweets')

                if platform == 'facebook' and metrics.get('shares', 0) > 200:
                    indicators.append('facebook_viral_shares')

                if platform == 'instagram' and metrics.get('shares', 0) > 300:
                    indicators.append('instagram_viral_shares')

        return indicators

# Global instance
trending_analyzer = TrendingAnalyzer()