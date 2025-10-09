#!/usr/bin/env python3
"""MCP server for ceregrep - exposes ceregrep query capabilities to other agents."""

import asyncio
import sys
from pathlib import Path

# Add the mcp-server directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.types import Tool, TextContent
from tool_discovery import tool_discovery


app = Server("ceregrep-mcp-server")

# Discover tools on startup
discovered_tools = tool_discovery.discover_tools()


@app.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available tools."""
    # Refresh tool discovery in case new tools were added
    current_tools = tool_discovery.discover_tools()
    return [tool.to_tool() for tool in current_tools.values()]


@app.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    tool = tool_discovery.get_tool(name)
    if tool:
        return await tool.execute(arguments)
    else:
        raise ValueError(f"Unknown tool: {name}")


async def main():
    """Main entry point for the MCP server."""
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="ceregrep-mcp-server",
                server_version="0.1.0",
                capabilities=app.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
