#!/usr/bin/env python3
"""Simple test client to verify MCP server is working."""

import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    """Test the MCP server."""
    server_params = StdioServerParameters(
        command="uv",
        args=[
            "run",
            "--project",
            "/home/alejandro/Swarm/ceregrep/ceregrep-client/mcp-server",
            "python",
            "/home/alejandro/Swarm/ceregrep/ceregrep-client/mcp-server/mcp_server.py"
        ],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()
            print("✓ Connected to MCP server\n")

            # List tools
            tools = await session.list_tools()
            print(f"Available tools ({len(tools.tools)}):")
            for tool in tools.tools:
                print(f"\n  Tool: {tool.name}")
                print(f"  Description: {tool.description}")
                print(f"  Input Schema: {json.dumps(tool.inputSchema, indent=4)}")

            if tools.tools:
                print("\n✓ MCP server is working correctly!")
            else:
                print("\n✗ No tools found!")


if __name__ == "__main__":
    asyncio.run(main())
