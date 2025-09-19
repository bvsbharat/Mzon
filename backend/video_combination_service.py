import asyncio
import os
import tempfile
import uuid
from typing import List, Optional
import httpx
import ffmpeg
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class VideoCombinationService:
    """
    Service for combining multiple video segments using FFmpeg
    """

    def __init__(self):
        self.temp_dir = tempfile.gettempdir()
        self.max_segments = 10  # Safety limit
        self.max_duration = 60  # Maximum 60 seconds

    async def combine_video_segments(
        self,
        segment_urls: List[str],
        output_filename: Optional[str] = None,
        transition_type: str = "concatenate",
        fade_duration: float = 0.5
    ) -> str:
        """
        Combine multiple video segments into a single video

        Args:
            segment_urls: List of video URLs to combine
            output_filename: Custom output filename (optional)
            transition_type: Type of transition ("concatenate", "crossfade", "fade")
            fade_duration: Duration of fade transitions in seconds

        Returns:
            Path to the combined video file
        """

        if len(segment_urls) == 0:
            raise HTTPException(status_code=400, detail="No video segments provided")

        if len(segment_urls) > self.max_segments:
            raise HTTPException(
                status_code=400,
                detail=f"Too many segments. Maximum {self.max_segments} allowed"
            )

        if len(segment_urls) == 1:
            # Single segment, just download and return
            return await self._download_video(segment_urls[0])

        try:
            logger.info(f"🎬 Combining {len(segment_urls)} video segments with {transition_type} transition")

            # Download all video segments
            downloaded_segments = []
            for i, url in enumerate(segment_urls):
                logger.info(f"📥 Downloading segment {i+1}/{len(segment_urls)}")
                segment_path = await self._download_video(url, f"segment_{i}.mp4")
                downloaded_segments.append(segment_path)

            # Generate output filename
            if not output_filename:
                output_filename = f"combined_video_{uuid.uuid4().hex[:8]}.mp4"

            output_path = os.path.join(self.temp_dir, output_filename)

            # Combine videos based on transition type
            if transition_type == "concatenate":
                await self._concatenate_videos(downloaded_segments, output_path)
            elif transition_type == "crossfade":
                await self._crossfade_videos(downloaded_segments, output_path, fade_duration)
            elif transition_type == "fade":
                await self._fade_videos(downloaded_segments, output_path, fade_duration)
            else:
                raise HTTPException(status_code=400, detail=f"Unknown transition type: {transition_type}")

            # Clean up temporary segments
            for segment_path in downloaded_segments:
                try:
                    os.unlink(segment_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up {segment_path}: {e}")

            logger.info(f"✅ Video combination completed: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"❌ Video combination failed: {e}")
            raise HTTPException(status_code=500, detail=f"Video combination failed: {str(e)}")

    async def _download_video(self, url: str, filename: Optional[str] = None) -> str:
        """Download a video from URL to temporary file"""

        if not filename:
            filename = f"video_{uuid.uuid4().hex[:8]}.mp4"

        file_path = os.path.join(self.temp_dir, filename)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(url)
                response.raise_for_status()

                with open(file_path, 'wb') as f:
                    f.write(response.content)

            logger.info(f"✅ Downloaded video: {filename}")
            return file_path

        except Exception as e:
            logger.error(f"❌ Failed to download video from {url}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to download video: {str(e)}")

    async def _concatenate_videos(self, video_paths: List[str], output_path: str):
        """Simple concatenation of videos without transitions"""

        try:
            # Create input stream for each video
            inputs = [ffmpeg.input(path) for path in video_paths]

            # Concatenate all videos
            concatenated = ffmpeg.concat(*inputs, v=1, a=1)

            # Output to file
            out = ffmpeg.output(concatenated, output_path,
                              vcodec='libx264',
                              acodec='aac',
                              **{'b:v': '2M', 'b:a': '192k'})

            # Run FFmpeg
            await asyncio.to_thread(ffmpeg.run, out, overwrite_output=True, quiet=True)

            logger.info(f"✅ Concatenated {len(video_paths)} videos")

        except Exception as e:
            logger.error(f"❌ Concatenation failed: {e}")
            raise

    async def _crossfade_videos(self, video_paths: List[str], output_path: str, fade_duration: float):
        """Combine videos with crossfade transitions"""

        try:
            if len(video_paths) == 2:
                # Simple crossfade between two videos
                input1 = ffmpeg.input(video_paths[0])
                input2 = ffmpeg.input(video_paths[1])

                # Get duration of first video
                probe = ffmpeg.probe(video_paths[0])
                duration1 = float(probe['streams'][0]['duration'])

                # Apply crossfade
                video = ffmpeg.filter([input1['v'], input2['v']], 'xfade',
                                    transition='fade',
                                    duration=fade_duration,
                                    offset=duration1 - fade_duration)

                audio = ffmpeg.filter([input1['a'], input2['a']], 'acrossfade',
                                    d=fade_duration,
                                    o=duration1 - fade_duration)

                out = ffmpeg.output(video, audio, output_path,
                                  vcodec='libx264',
                                  acodec='aac',
                                  **{'b:v': '2M', 'b:a': '192k'})

                await asyncio.to_thread(ffmpeg.run, out, overwrite_output=True, quiet=True)
            else:
                # For more than 2 videos, fall back to concatenation for now
                await self._concatenate_videos(video_paths, output_path)

            logger.info(f"✅ Crossfaded {len(video_paths)} videos")

        except Exception as e:
            logger.error(f"❌ Crossfade failed: {e}")
            raise

    async def _fade_videos(self, video_paths: List[str], output_path: str, fade_duration: float):
        """Combine videos with fade in/out transitions"""

        try:
            # For fade transitions, we'll add fade effects between segments
            # This is a more complex operation, so we'll start with basic implementation

            # Create temporary files for each faded segment
            faded_segments = []

            for i, video_path in enumerate(video_paths):
                faded_path = os.path.join(self.temp_dir, f"faded_{i}_{uuid.uuid4().hex[:8]}.mp4")

                input_video = ffmpeg.input(video_path)

                # Add fade in/out effects
                if i == 0:
                    # First video: fade in only
                    video = ffmpeg.filter(input_video['v'], 'fade', type='in', duration=fade_duration)
                elif i == len(video_paths) - 1:
                    # Last video: fade out only
                    probe = ffmpeg.probe(video_path)
                    duration = float(probe['streams'][0]['duration'])
                    video = ffmpeg.filter(input_video['v'], 'fade', type='out',
                                        start_time=duration - fade_duration, duration=fade_duration)
                else:
                    # Middle videos: fade in and out
                    probe = ffmpeg.probe(video_path)
                    duration = float(probe['streams'][0]['duration'])
                    video = ffmpeg.filter(input_video['v'], 'fade', type='in', duration=fade_duration)
                    video = ffmpeg.filter(video, 'fade', type='out',
                                        start_time=duration - fade_duration, duration=fade_duration)

                # Apply audio fade as well
                audio = ffmpeg.filter(input_video['a'], 'afade', type='in', duration=fade_duration)
                if i == len(video_paths) - 1:
                    probe = ffmpeg.probe(video_path)
                    duration = float(probe['streams'][0]['duration'])
                    audio = ffmpeg.filter(audio, 'afade', type='out',
                                        start_time=duration - fade_duration, duration=fade_duration)

                out = ffmpeg.output(video, audio, faded_path,
                                  vcodec='libx264',
                                  acodec='aac',
                                  **{'b:v': '2M', 'b:a': '192k'})

                await asyncio.to_thread(ffmpeg.run, out, overwrite_output=True, quiet=True)
                faded_segments.append(faded_path)

            # Now concatenate the faded segments
            await self._concatenate_videos(faded_segments, output_path)

            # Clean up faded segments
            for segment in faded_segments:
                try:
                    os.unlink(segment)
                except:
                    pass

            logger.info(f"✅ Applied fade transitions to {len(video_paths)} videos")

        except Exception as e:
            logger.error(f"❌ Fade transition failed: {e}")
            raise

    def cleanup_file(self, file_path: str):
        """Clean up a temporary file"""
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                logger.info(f"🧹 Cleaned up: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup {file_path}: {e}")

# Global service instance
video_combination_service = VideoCombinationService()