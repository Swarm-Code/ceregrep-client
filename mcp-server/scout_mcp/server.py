#!/usr/bin/env python3
"""MCP server for Scout - exposes Scout query capabilities and agents to other systems.

PERFORMANCE OPTIMIZATION (v1.1.1):
This server now uses a persistent Node.js bridge process to communicate with Scout's SDK,
eliminating the overhead of spawning subprocesses for each query/agent invocation.

ARCHITECTURE:
┌──────────────┐    MCP Protocol    ┌─────────────┐
│  MCP Client  │ ────────────────> │  MCP Server │
│  (e.g. Cline)│ <──────────────── │   (Python)  │
└──────────────┘                    └─────────────┘
                                           ↓
                                    JSON-RPC (IPC)
                                           ↓
                                    ┌─────────────┐
                                    │   Bridge    │
                                    │  (Node.js)  │
                                    └─────────────┘
                                           ↓
                                    Direct Import
                                           ↓
                                    ┌─────────────┐
                                    │  Scout SDK  │
                                    │ (TypeScript)│
                                    └─────────────┘

PERFORMANCE GAIN: ~100x faster query/agent invocations (10-50ms vs 1-3s overhead)
"""

import asyncio
import sys
import signal
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.types import Tool, TextContent
from .tool_discovery import tool_discovery
from .tools.agent_tools import agent_tool_generator
from .bridge import get_bridge, shutdown_bridge


app = Server("scout-mcp-server")

DEPRECATION_NOTICE = """
╔════════════════════════════════════════════════════════════╗
║       ⚠️  PACKAGE RENAMED - PLEASE UPDATE ⚠️                ║
╠════════════════════════════════════════════════════════════╣
║  The "ceregrep-mcp" package is now "scout-mcp"            ║
║                                                            ║
║  If you installed the old package:                        ║
║                                                            ║
║  1. Uninstall: pip uninstall ceregrep-mcp                 ║
║  2. Install:   pip install scout-mcp                      ║
║  3. Update your MCP config to use: scout-mcp              ║
║                                                            ║
║  💡 All functionality remains the same!                    ║
╚════════════════════════════════════════════════════════════╝
"""

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
    """
    Main entry point for the MCP server.

    OPTIMIZATION: Starts persistent bridge on startup, shuts down on exit.
    The bridge process lives for the entire server lifetime, eliminating
    per-query process spawning overhead.
    """
    from mcp.server.stdio import stdio_server

    # Print deprecation notice to stderr so it doesn't interfere with MCP protocol on stdout
    print(DEPRECATION_NOTICE, file=sys.stderr)

    # Initialize the persistent Scout bridge
    print("[Scout MCP] Starting persistent Scout bridge...", file=sys.stderr)
    try:
        bridge = await get_bridge()
        print("[Scout MCP] Bridge started successfully - ready for high-performance queries", file=sys.stderr)
    except Exception as e:
        print(f"[Scout MCP] Warning: Failed to start bridge: {e}", file=sys.stderr)
        print("[Scout MCP] Server will attempt to start bridge on first request", file=sys.stderr)

    # Set up graceful shutdown handler
    async def shutdown_handler():
        """Gracefully shut down the bridge on server exit."""
        print("[Scout MCP] Shutting down Scout bridge...", file=sys.stderr)
        await shutdown_bridge()
        print("[Scout MCP] Bridge shutdown complete", file=sys.stderr)

    # Register shutdown on signals
    def signal_handler(sig):
        print(f"[Scout MCP] Received signal {sig}, initiating shutdown...", file=sys.stderr)
        asyncio.create_task(shutdown_handler())

    try:
        # Use signal handlers if available (not available in all contexts)
        signal.signal(signal.SIGTERM, lambda s, f: signal_handler(s))
        signal.signal(signal.SIGINT, lambda s, f: signal_handler(s))
    except (ValueError, AttributeError):
        # Signals not available in this context (e.g., Windows or threaded context)
        pass

    try:
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="scout-mcp-server",
                    server_version="1.1.1",  # Minor bump: performance optimization, backward compatible
                    capabilities=app.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )
    finally:
        # Ensure bridge is shut down on exit
        await shutdown_handler()


def cli():
    """CLI entry point for the MCP server."""
    asyncio.run(main())


if __name__ == "__main__":
    cli()
