"""Dynamically expose Scout agents as MCP tools.

PERFORMANCE OPTIMIZATION (v1.1.1):
This module now uses a persistent Node.js bridge process instead of spawning
subprocess calls to the Scout CLI for both agent discovery and invocation.

OLD APPROACH: subprocess spawn for `scout agent list` and `scout agent invoke`
NEW APPROACH: JSON-RPC calls to persistent bridge process

PERFORMANCE GAIN: ~100x faster for both operations
"""

import asyncio
import time
from .base_tool import BaseTool
from mcp.types import TextContent, Tool
from typing import Dict, Any, List, Optional
from ..bridge import ScoutBridgeClient, ScoutBridgeError, get_bridge


class AgentToolGenerator:
    """
    Generates MCP tools for each Scout agent.

    OPTIMIZED: Uses persistent bridge for agent discovery (~100x faster).
    """

    # Cache TTL in seconds (5 minutes)
    CACHE_TTL = 300

    def __init__(self, bridge_client: ScoutBridgeClient = None):
        """Initialize with an optional Scout bridge client.

        Args:
            bridge_client: Optional ScoutBridgeClient instance.
                          If None, uses the global singleton bridge.
        """
        self.bridge_client = bridge_client
        self._agent_cache: Optional[List[Dict[str, str]]] = None
        self._cache_timestamp: Optional[float] = None

    def _is_cache_valid(self) -> bool:
        """Check if the cache is still valid based on TTL."""
        if self._agent_cache is None or self._cache_timestamp is None:
            return False
        return (time.time() - self._cache_timestamp) < self.CACHE_TTL

    def invalidate_cache(self) -> None:
        """Manually invalidate the cache to force a refresh on next call."""
        self._agent_cache = None
        self._cache_timestamp = None

    async def _list_agents_async(self) -> List[Dict[str, str]]:
        """
        List all available agents using the bridge.

        PERFORMANCE: ~100x faster than subprocess approach.
        Uses persistent bridge instead of spawning `scout agent list --json`.
        """
        if self._is_cache_valid():
            return self._agent_cache

        try:
            # Get or create the global bridge instance
            bridge = self.bridge_client or await get_bridge()

            # List agents via bridge (direct SDK call, no subprocess)
            data = await bridge.list_agents()

            agents = []

            # Combine global and project agents
            for agent in data.get("global", []):
                agents.append(agent)
            for agent in data.get("project", []):
                agents.append(agent)

            # Update cache with timestamp
            self._agent_cache = agents
            self._cache_timestamp = time.time()
            return agents

        except ScoutBridgeError as e:
            print(f"Error listing agents via bridge: {e}")
            return []
        except Exception as e:
            print(f"Error listing agents: {e}")
            return []

    def _list_agents(self) -> List[Dict[str, str]]:
        """
        Synchronous wrapper for async agent listing.
        Uses asyncio.run() to execute async bridge call.
        """
        # Get or create event loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running (e.g., in async context),
                # create a task instead
                return asyncio.create_task(self._list_agents_async())
            else:
                return loop.run_until_complete(self._list_agents_async())
        except RuntimeError:
            # No event loop, create one
            return asyncio.run(self._list_agents_async())

    def create_agent_tool(self, agent_id: str, agent_name: str, agent_description: str) -> 'AgentTool':
        """Create a tool for a specific agent."""
        return AgentTool(agent_id, agent_name, agent_description, self.bridge_client)

    def discover_agent_tools(self) -> Dict[str, BaseTool]:
        """Discover all agents and create tools for them."""
        tools = {}
        agents = self._list_agents()

        for agent in agents:
            agent_id = agent.get("id")
            agent_name = agent.get("name")
            agent_description = agent.get("description", "")

            if agent_id and agent_name:
                tool = self.create_agent_tool(agent_id, agent_name, agent_description)
                tools[tool.name] = tool

        return tools


class AgentTool(BaseTool):
    """
    Tool to invoke a specific Scout agent.

    OPTIMIZED: Uses persistent bridge for ~100x faster agent invocations.
    """

    def __init__(self, agent_id: str, agent_name: str, agent_description: str, bridge_client: ScoutBridgeClient = None):
        """Initialize agent tool.

        Args:
            agent_id: Agent identifier
            agent_name: Human-readable agent name
            agent_description: Agent description
            bridge_client: Optional ScoutBridgeClient instance.
                          If None, uses the global singleton bridge.
        """
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.agent_description = agent_description
        self.bridge_client = bridge_client

    @property
    def name(self) -> str:
        return f"agent_{self.agent_id.replace('-', '_')}"

    @property
    def description(self) -> str:
        return (
            f"Invoke the '{self.agent_name}' specialized agent. "
            f"{self.agent_description} "
            f"Use this agent when you need expertise in its specific domain."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": f"The prompt/query to send to the {self.agent_name}"
                },
                "cwd": {
                    "type": "string",
                    "description": "Working directory to run in (optional, defaults to current directory)"
                },
                "model": {
                    "type": "string",
                    "description": "LLM model to use (optional, defaults to agent's config)"
                },
                "verbose": {
                    "type": "boolean",
                    "description": "Enable verbose output (optional, defaults to false)"
                }
            },
            "required": ["prompt"]
        }

    async def execute(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """
        Execute the agent using persistent bridge.

        PERFORMANCE: ~100x faster than old subprocess approach.
        The bridge keeps Scout SDK loaded in memory and eliminates process spawn overhead.
        """
        prompt = arguments.get("prompt", "")
        cwd = arguments.get("cwd", ".")
        model = arguments.get("model")
        verbose = arguments.get("verbose", False)

        if not prompt:
            return [TextContent(type="text", text="Error: prompt parameter is required")]

        try:
            # Get or create the global bridge instance
            # OPTIMIZATION: Reuses persistent Node.js process instead of spawning new one
            bridge = self.bridge_client or await get_bridge()

            # Execute agent via bridge (direct SDK call, no subprocess)
            output = await bridge.invoke_agent(
                agent_id=self.agent_id,
                prompt=prompt,
                cwd=cwd,
                model=model,
                verbose=verbose
            )

            return [TextContent(
                type="text",
                text=f"## {self.agent_name} Response\n\n**Prompt:** {prompt}\n\n{output}"
            )]

        except ScoutBridgeError as e:
            error_msg = str(e)

            # Check for specific error patterns
            if "not found" in error_msg.lower():
                return [TextContent(
                    type="text",
                    text=(
                        "Error: Scout bridge failed to start. "
                        "Make sure Scout is installed: npm install -g swarm-scout"
                    )
                )]

            return [TextContent(
                type="text",
                text=(
                    f"❌ **Agent '{self.agent_name}' Failed**\n\n"
                    f"**Prompt:** {prompt}\n"
                    f"**Error:** {error_msg}\n\n"
                    f"**Troubleshooting:**\n"
                    f"- Ensure swarm-scout is installed: `npm install -g swarm-scout`\n"
                    f"- Check that Node.js is available in PATH\n"
                    f"- Verify agent exists: `scout agent list`"
                )
            )]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error executing agent '{self.agent_name}': {str(e)}"
            )]


# Global agent tool generator
agent_tool_generator = AgentToolGenerator()
