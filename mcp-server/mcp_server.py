#!/usr/bin/env python3
"""MCP server for ceregrep - exposes ceregrep query capabilities to other agents."""

import asyncio
import argparse
import sys
import signal
import os
from pathlib import Path

# Add the mcp-server directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.types import Tool, TextContent
from tool_discovery import tool_discovery

# Debug flag
DEBUG_MCP = os.getenv("DEBUG_MCP", "").lower() in ("1", "true", "yes")

# Parse CLI arguments early so tools can leverage configuration
parser = argparse.ArgumentParser(add_help=False)
parser.add_argument(
    "--project-dir",
    dest="project_dir",
    help="Default project directory for scout tools (overrides per-call cwd)",
)
parsed_args, remaining_argv = parser.parse_known_args()
DEFAULT_PROJECT_DIR: str | None = None

if parsed_args.project_dir:
    project_dir_path = Path(parsed_args.project_dir).expanduser()
    if not project_dir_path.is_absolute():
        project_dir_path = (Path.cwd() / project_dir_path).resolve()
    else:
        project_dir_path = project_dir_path.resolve()

    if project_dir_path.exists():
        DEFAULT_PROJECT_DIR = str(project_dir_path)
        os.environ["SCOUT_DEFAULT_PROJECT_DIR"] = DEFAULT_PROJECT_DIR
        if DEBUG_MCP:
            print(f"[Scout MCP] Using default project dir: {DEFAULT_PROJECT_DIR}", file=sys.stderr, flush=True)
    else:
        if DEBUG_MCP:
            print(f"[Scout MCP] Provided project dir does not exist: {project_dir_path}", file=sys.stderr, flush=True)

# Restore remaining argv in case other systems inspect it later
sys.argv = [sys.argv[0], *remaining_argv]

# Import agent tools from scout_mcp package
try:
    from scout_mcp.tools.agent_tools import agent_tool_generator
    HAS_AGENT_TOOLS = True
    if DEBUG_MCP:
        print("[Scout MCP] Agent tools available", file=sys.stderr, flush=True)
except ImportError:
    HAS_AGENT_TOOLS = False
    if DEBUG_MCP:
        print("[Scout MCP] Agent tools not available", file=sys.stderr, flush=True)

if DEBUG_MCP:
    print("[Scout MCP] Initializing server", file=sys.stderr, flush=True)

app = Server("scout-mcp-server")

# Discover tools on startup
discovered_tools = tool_discovery.discover_tools()

if DEBUG_MCP:
    print(f"[Scout MCP] Discovered {len(discovered_tools)} tools", file=sys.stderr, flush=True)


@app.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available tools including agents."""
    try:
        # Refresh tool discovery in case new tools were added
        current_tools = tool_discovery.discover_tools()

        # Add agent tools if available
        if HAS_AGENT_TOOLS:
            agent_tools = agent_tool_generator.discover_agent_tools()
            all_tools = {**current_tools, **agent_tools}
            if DEBUG_MCP:
                print(f"[Scout MCP] Exposing {len(current_tools)} regular tools + {len(agent_tools)} agent tools", file=sys.stderr, flush=True)
        else:
            all_tools = current_tools
            if DEBUG_MCP:
                print(f"[Scout MCP] Exposing {len(current_tools)} regular tools only", file=sys.stderr, flush=True)

        return [tool.to_tool() for tool in all_tools.values()]
    except Exception as e:
        if DEBUG_MCP:
            print(f"[Scout MCP] Error listing tools: {e}", file=sys.stderr, flush=True)
        return []


@app.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls including agent invocations."""
    try:
        # Check regular tools first
        tool = tool_discovery.get_tool(name)
        if tool:
            if DEBUG_MCP:
                print(f"[Scout MCP] Calling regular tool: {name}", file=sys.stderr, flush=True)
            return await tool.execute(arguments)

        # Check agent tools if available
        if HAS_AGENT_TOOLS:
            agent_tools = agent_tool_generator.discover_agent_tools()
            agent_tool = agent_tools.get(name)
            if agent_tool:
                if DEBUG_MCP:
                    print(f"[Scout MCP] Calling agent tool: {name}", file=sys.stderr, flush=True)
                return await agent_tool.execute(arguments)

        raise ValueError(f"Unknown tool: {name}")
    except Exception as e:
        if DEBUG_MCP:
            print(f"[Scout MCP] Error calling tool {name}: {e}", file=sys.stderr, flush=True)
        raise


async def main():
    """Main entry point for the MCP server."""
    from mcp.server.stdio import stdio_server

    try:
        if DEBUG_MCP:
            print("[Scout MCP] Starting stdio server", file=sys.stderr, flush=True)

        async with stdio_server() as (read_stream, write_stream):
            if DEBUG_MCP:
                print("[Scout MCP] Stdio server connected", file=sys.stderr, flush=True)

            await app.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="scout-mcp-server",
                    server_version="0.2.2",
                    capabilities=app.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )
    except asyncio.CancelledError:
        if DEBUG_MCP:
            print("[Scout MCP] Server cancelled", file=sys.stderr, flush=True)
        raise
    except Exception as e:
        if DEBUG_MCP:
            print(f"[Scout MCP] Fatal error: {e}", file=sys.stderr, flush=True)
        raise
    finally:
        if DEBUG_MCP:
            print("[Scout MCP] Server shutdown", file=sys.stderr, flush=True)


def handle_signal(signum, frame):
    """Handle termination signals gracefully."""
    if DEBUG_MCP:
        print(f"[Scout MCP] Received signal {signum}, shutting down", file=sys.stderr, flush=True)
    sys.exit(0)


if __name__ == "__main__":
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        if DEBUG_MCP:
            print("[Scout MCP] Interrupted by user", file=sys.stderr, flush=True)
        sys.exit(0)
    except Exception as e:
        if DEBUG_MCP:
            print(f"[Scout MCP] Unexpected error: {e}", file=sys.stderr, flush=True)
        sys.exit(1)
