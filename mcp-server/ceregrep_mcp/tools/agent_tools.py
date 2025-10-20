"""Dynamically expose ceregrep agents as MCP tools."""

import asyncio
import subprocess
import json
import time
from pathlib import Path
from .base_tool import BaseTool
from mcp.types import TextContent, Tool
from typing import Dict, Any, List, Optional


class AgentToolGenerator:
    """Generates MCP tools for each ceregrep agent."""

    # Cache TTL in seconds (5 minutes)
    CACHE_TTL = 300

    def __init__(self, ceregrep_bin_path: str = None):
        """Initialize with path to ceregrep binary."""
        self.ceregrep_bin = ceregrep_bin_path or "ceregrep"
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

    def _list_agents(self) -> List[Dict[str, str]]:
        """List all available agents with cache invalidation."""
        if self._is_cache_valid():
            return self._agent_cache

        try:
            # Run ceregrep agent list --json
            result = subprocess.run(
                [self.ceregrep_bin, "agent", "list", "--json"],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode != 0:
                return []

            # Parse JSON output
            data = json.loads(result.stdout)
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

        except Exception as e:
            print(f"Error listing agents: {e}")
            return []

    def create_agent_tool(self, agent_id: str, agent_name: str, agent_description: str) -> 'AgentTool':
        """Create a tool for a specific agent."""
        return AgentTool(agent_id, agent_name, agent_description, self.ceregrep_bin)

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
    """Tool to invoke a specific ceregrep agent."""

    def __init__(self, agent_id: str, agent_name: str, agent_description: str, ceregrep_bin: str):
        """Initialize agent tool."""
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.agent_description = agent_description
        self.ceregrep_bin = ceregrep_bin

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
        """Execute the agent."""
        prompt = arguments.get("prompt", "")
        cwd = arguments.get("cwd", ".")
        model = arguments.get("model")
        verbose = arguments.get("verbose", False)

        if not prompt:
            return [TextContent(type="text", text="Error: prompt parameter is required")]

        # Build command
        cmd = [self.ceregrep_bin, "agent", "invoke", self.agent_id, prompt]

        if model:
            cmd.extend(["--model", model])

        if verbose:
            cmd.append("--verbose")

        try:
            # Run ceregrep agent invoke
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                return [TextContent(
                    type="text",
                    text=f"Agent '{self.agent_name}' failed: {error_msg}"
                )]

            # Parse output
            output = stdout.decode()

            return [TextContent(
                type="text",
                text=f"## {self.agent_name} Response\n\n**Prompt:** {prompt}\n\n{output}"
            )]

        except FileNotFoundError:
            return [TextContent(
                type="text",
                text=(
                    "Error: ceregrep command not found. "
                    "Make sure ceregrep is installed and in PATH."
                )
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error executing agent '{self.agent_name}': {str(e)}"
            )]


# Global agent tool generator
agent_tool_generator = AgentToolGenerator()
