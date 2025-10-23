#!/usr/bin/env python3
"""MCP server for ceregrep - exposes ceregrep query capabilities and agents to other systems."""

import asyncio
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.types import Tool, TextContent
from .tool_discovery import tool_discovery
from .tools.agent_tools import agent_tool_generator


app = Server("ceregrep-mcp-server")

# Discover tools on startup
discovered_tools = tool_discovery.discover_tools()


@app.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available tools including agents."""
    # Refresh tool discovery in case new tools were added
    current_tools = tool_discovery.discover_tools()

    # Add agent tools
    agent_tools = agent_tool_generator.discover_agent_tools()

    # Combine all tools
    all_tools = {**current_tools, **agent_tools}

    return [tool.to_tool() for tool in all_tools.values()]


@app.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls including agent invocations."""
    # Check regular tools first
    tool = tool_discovery.get_tool(name)
    if tool:
        return await tool.execute(arguments)

    # Check agent tools
    agent_tools = agent_tool_generator.discover_agent_tools()
    agent_tool = agent_tools.get(name)
    if agent_tool:
        return await agent_tool.execute(arguments)

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


def cli():
    """CLI entry point for the MCP server."""
    asyncio.run(main())


if __name__ == "__main__":
    cli()
