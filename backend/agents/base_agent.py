"""
Base Agent class for all specialized agents
"""
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from services.websocket_manager import WebSocketManager
from models.news_models import AgentStatus, AgentUpdate

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """
    Base class for all agents in the multi-agent system
    """

    def __init__(self, name: str):
        self.name = name
        self.status = AgentStatus.IDLE
        self.tools = []
        self.is_initialized = False

    async def initialize(self):
        """Initialize the agent"""
        logger.info(f"Initializing {self.name}...")
        await self._setup()
        self.is_initialized = True
        logger.info(f"{self.name} initialized successfully")

    @abstractmethod
    async def _setup(self):
        """Agent-specific setup logic"""
        pass

    @abstractmethod
    async def execute(self, session_id: str, **kwargs) -> Dict[str, Any]:
        """Execute the agent's main functionality"""
        pass

    async def send_update(
        self,
        session_id: str,
        message: str,
        progress: float = 0,
        data: Optional[Dict[str, Any]] = None,
        websocket_manager: Optional[WebSocketManager] = None
    ):
        """Send status update via WebSocket"""
        if websocket_manager:
            update = AgentUpdate(
                agent_name=self.name,
                status=self.status,
                message=message,
                progress=progress,
                data=data
            )
            await websocket_manager.send_update(session_id, update)

    async def set_status(self, status: AgentStatus):
        """Update agent status"""
        self.status = status
        logger.debug(f"{self.name} status changed to: {status}")

    async def handle_error(
        self,
        session_id: str,
        error: Exception,
        websocket_manager: Optional[WebSocketManager] = None
    ):
        """Handle and report errors"""
        self.status = AgentStatus.ERROR
        error_msg = f"Error in {self.name}: {str(error)}"
        logger.error(error_msg)

        if websocket_manager:
            await websocket_manager.send_error(session_id, self.name, str(error))

    def add_tool(self, tool):
        """Add a tool for the agent to use"""
        self.tools.append(tool)
        logger.debug(f"Added tool to {self.name}: {tool.__class__.__name__}")

    async def sleep_with_updates(
        self,
        duration: float,
        session_id: str,
        base_message: str,
        websocket_manager: Optional[WebSocketManager] = None
    ):
        """Sleep while sending periodic updates"""
        steps = int(duration)
        for i in range(steps):
            if websocket_manager:
                progress = (i / steps) * 100
                await self.send_update(
                    session_id,
                    f"{base_message} ({i+1}/{steps})",
                    progress,
                    websocket_manager=websocket_manager
                )
            await asyncio.sleep(1)

    def validate_kwargs(self, required_keys: list, **kwargs):
        """Validate required parameters"""
        missing_keys = [key for key in required_keys if key not in kwargs]
        if missing_keys:
            raise ValueError(f"Missing required parameters: {missing_keys}")

    async def cleanup(self):
        """Cleanup agent resources"""
        logger.info(f"Cleaning up {self.name}...")
        self.status = AgentStatus.IDLE
        await self._cleanup()

    async def _cleanup(self):
        """Agent-specific cleanup logic"""
        pass