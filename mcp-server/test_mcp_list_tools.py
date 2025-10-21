#!/usr/bin/env python3
"""Test MCP server's list_tools functionality."""

import asyncio
import sys
from pathlib import Path

# Add mcp-server directory to path
sys.path.insert(0, str(Path(__file__).parent))

from ceregrep_mcp.server import handle_list_tools

async def test_list_tools():
    """Test the list_tools handler."""
    print("Testing MCP server's list_tools handler...\n")

    tools = await handle_list_tools()

    print(f"Total tools exposed: {len(tools)}\n")

    for tool in tools:
        print(f"Tool: {tool.name}")
        print(f"  Description: {tool.description[:100]}...")
        print(f"  Input Schema: {list(tool.inputSchema.get('properties', {}).keys())}")
        print()

if __name__ == "__main__":
    asyncio.run(test_list_tools())
