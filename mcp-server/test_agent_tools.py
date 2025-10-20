#!/usr/bin/env python3
"""Test script to verify agent tools are exposed via MCP."""

import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    """Test the MCP server."""
    server_params = StdioServerParameters(
        command="ceregrep-mcp",
        args=[],
        env=None
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()

            # List tools
            tools_result = await session.list_tools()
            tools = tools_result.tools

            print(f"✓ Found {len(tools)} tools:\n")

            # Show all tools
            for tool in tools:
                print(f"Tool: {tool.name}")
                print(f"  Description: {tool.description[:100]}...")
                if tool.name.startswith("agent_"):
                    print(f"  ⭐ AGENT TOOL")
                print()

            # Count agent tools
            agent_tools = [t for t in tools if t.name.startswith("agent_")]
            print(f"\n✓ Agent tools: {len(agent_tools)}")
            for tool in agent_tools:
                print(f"  - {tool.name}")


if __name__ == "__main__":
    asyncio.run(main())
