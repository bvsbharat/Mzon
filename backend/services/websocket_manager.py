"""
WebSocket Manager for real-time agent updates (simplified version)
"""
import json
import logging
from typing import Dict, Optional
from fastapi import WebSocket
from models.news_models import AgentUpdate

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    Manages WebSocket connections for real-time agent updates
    """

    def __init__(self):
        # Dictionary to store active WebSocket connections
        # Key: session_id, Value: WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """
        Accept a WebSocket connection and store it
        """
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connection established for session: {session_id}")

        # Send initial connection confirmation
        await self._send_message(
            websocket,
            {
                "type": "connection_established",
                "session_id": session_id,
                "message": "Connected to agent updates stream"
            }
        )

    def disconnect(self, session_id: str):
        """
        Remove a WebSocket connection
        """
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket connection closed for session: {session_id}")

    async def send_update(self, session_id: str, update: AgentUpdate):
        """
        Send an agent update to a specific session
        """
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await self._send_message(
                    websocket,
                    {
                        "type": "agent_update",
                        "session_id": session_id,
                        "update": update.dict()
                    }
                )
            except Exception as e:
                logger.error(f"Error sending update to session {session_id}: {str(e)}")
                # Remove the connection if it's broken
                self.disconnect(session_id)

    async def _send_message(self, websocket: WebSocket, message: dict):
        """
        Send a JSON message via WebSocket
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {str(e)}")
            raise