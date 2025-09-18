"""
Cache Manager for storing and retrieving news data
"""
import json
import logging
import asyncio
from typing import Any, Optional, Dict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class CacheManager:
    """
    Simple in-memory cache manager
    In production, this would use Redis or similar
    """

    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.stats = {
            "hits": 0,
            "misses": 0,
            "total_requests": 0
        }

    async def initialize(self):
        """Initialize the cache manager"""
        logger.info("Initializing Cache Manager...")
        # Start cleanup task
        asyncio.create_task(self._cleanup_expired())

    async def set(self, key: str, value: Any, expire_hours: int = 2):
        """
        Set a value in cache with expiration
        """
        expire_time = datetime.now() + timedelta(hours=expire_hours)

        self.cache[key] = {
            "value": value,
            "expire_time": expire_time,
            "created_at": datetime.now()
        }

        logger.debug(f"Cache SET: {key} (expires in {expire_hours}h)")

    async def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache
        """
        self.stats["total_requests"] += 1

        if key not in self.cache:
            self.stats["misses"] += 1
            logger.debug(f"Cache MISS: {key}")
            return None

        cache_entry = self.cache[key]

        # Check if expired
        if datetime.now() > cache_entry["expire_time"]:
            del self.cache[key]
            self.stats["misses"] += 1
            logger.debug(f"Cache EXPIRED: {key}")
            return None

        self.stats["hits"] += 1
        logger.debug(f"Cache HIT: {key}")
        return cache_entry["value"]

    async def delete(self, key: str):
        """
        Delete a key from cache
        """
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"Cache DELETE: {key}")

    async def clear(self):
        """
        Clear all cache entries
        """
        self.cache.clear()
        logger.info("Cache cleared")

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics
        """
        total_requests = self.stats["total_requests"]
        hit_rate = (self.stats["hits"] / total_requests) if total_requests > 0 else 0.0

        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "total_requests": total_requests,
            "hit_rate": hit_rate,
            "cached_entries": len(self.cache)
        }

    async def _cleanup_expired(self):
        """
        Background task to cleanup expired entries
        """
        while True:
            try:
                now = datetime.now()
                expired_keys = [
                    key for key, entry in self.cache.items()
                    if now > entry["expire_time"]
                ]

                for key in expired_keys:
                    del self.cache[key]

                if expired_keys:
                    logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

                # Run cleanup every 30 minutes
                await asyncio.sleep(1800)

            except Exception as e:
                logger.error(f"Error in cache cleanup: {str(e)}")
                await asyncio.sleep(300)  # Wait 5 minutes before retrying

    async def cleanup(self):
        """
        Cleanup resources
        """
        await self.clear()
        logger.info("Cache Manager cleanup completed")