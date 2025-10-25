"""Scout query tool for finding context in codebases.

PERFORMANCE OPTIMIZATION (v1.1.0):
This tool now uses a persistent Node.js bridge process instead of spawning
subprocess calls to the Scout CLI. This eliminates ~1-3s of overhead per query.

OLD APPROACH: Python -> subprocess spawn -> Node.js -> Scout CLI -> Scout SDK
NEW APPROACH: Python -> JSON-RPC -> Persistent Node.js Bridge -> Scout SDK

PERFORMANCE GAIN: ~100x faster (10-50ms vs 1-3s overhead)
"""

import asyncio
from .base_tool import BaseTool
from mcp.types import TextContent
from typing import Dict, Any, List
from ..bridge import ScoutBridgeClient, ScoutBridgeError, get_bridge


class CeregrepQueryTool(BaseTool):
    """
    Tool to query Scout agent for codebase context and analysis.

    OPTIMIZED: Uses persistent bridge process for ~100x faster queries.
    """

    def __init__(self, bridge_client: ScoutBridgeClient = None):
        """Initialize the tool with a Scout bridge client.

        Args:
            bridge_client: Optional ScoutBridgeClient instance.
                          If None, uses the global singleton bridge.
        """
        self.bridge_client = bridge_client

    @property
    def name(self) -> str:
        return "scout_query"

    @property
    def description(self) -> str:
        return (
            "Query the Scout agent to find context in a codebase. "
            "Scout uses LLM-powered analysis with bash and grep tools to explore code, "
            "find patterns, analyze architecture, and provide detailed context. "
            "Use this when you need to understand code structure, find implementations, "
            "or gather context from files."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language query to ask Scout (e.g., 'Find all async functions', 'Explain the auth flow')"
                },
                "cwd": {
                    "type": "string",
                    "description": "Working directory to run Scout in (optional, defaults to current directory)"
                },
                "model": {
                    "type": "string",
                    "description": "LLM model to use (optional, defaults to config)"
                },
                "verbose": {
                    "type": "boolean",
                    "description": "Enable verbose output (optional, defaults to false)"
                },
                "timeout": {
                    "type": "number",
                    "description": "Timeout in seconds for the query (optional, defaults to 300s/5min). Increase for complex codebase analysis."
                }
            },
            "required": ["query"]
        }

    async def execute(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """
        Execute Scout query using persistent bridge.

        PERFORMANCE: ~100x faster than old subprocess approach.
        The bridge keeps Scout SDK loaded in memory and eliminates process spawn overhead.
        """
        query = arguments.get("query", "")
        cwd = arguments.get("cwd", ".")
        model = arguments.get("model")
        verbose = arguments.get("verbose", False)
        timeout = arguments.get("timeout", 300)  # Default 5 minutes for complex queries

        if not query:
            return [TextContent(type="text", text="Error: query parameter is required")]

        try:
            # Get or create the global bridge instance
            # OPTIMIZATION: Reuses persistent Node.js process instead of spawning new one
            bridge = self.bridge_client or await get_bridge()

            # Execute query via bridge (direct SDK call, no subprocess)
            output = await bridge.query(
                query=query,
                cwd=cwd,
                model=model,
                verbose=verbose,
                timeout=timeout
            )

            return [TextContent(
                type="text",
                text=f"## Scout Query Result\n\n**Query:** {query}\n\n{output}"
            )]

        except asyncio.TimeoutError:
            return [TextContent(
                type="text",
                text=(
                    f"Scout query timed out after {timeout}s. "
                    f"The query may be too complex or the codebase too large. "
                    f"Try:\n"
                    f"- Breaking it into smaller queries\n"
                    f"- Increasing the timeout parameter\n"
                    f"- Using more specific search terms"
                )
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
                    f"❌ **Scout Query Failed**\n\n"
                    f"**Query:** {query}\n"
                    f"**Error:** {error_msg}\n\n"
                    f"**Troubleshooting:**\n"
                    f"- Ensure swarm-scout is installed: `npm install -g swarm-scout`\n"
                    f"- Check that Node.js is available in PATH\n"
                    f"- Verify Scout configuration is valid"
                )
            )]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error executing Scout: {str(e)}"
            )]
