#!/usr/bin/env python3
"""Test what tools the MCP server exposes."""

import asyncio
import sys
from pathlib import Path

# Add mcp-server directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import the handle_list_tools from mcp_server
from mcp_server import handle_list_tools

async def test():
    """Test tool listing."""
    print("Testing handle_list_tools()...\n")

    tools = await handle_list_tools()

    print(f"Total tools exposed: {len(tools)}\n")

    for tool in tools:
        print(f"✓ {tool.name}")
        print(f"  Description: {tool.description[:80]}...")
        print()

if __name__ == "__main__":
    asyncio.run(test())
