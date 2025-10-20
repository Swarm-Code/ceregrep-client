#!/usr/bin/env python3
"""Test script to verify agent invocation works end-to-end via MCP."""

import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    """Test the MCP server with actual agent invocation."""
    server_params = StdioServerParameters(
        command="ceregrep-mcp",
        args=[],
        env=None
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()
            print("✓ MCP server initialized\n")

            # List tools
            tools_result = await session.list_tools()
            tools = tools_result.tools
            print(f"✓ Found {len(tools)} tools\n")

            # Find context agent
            context_agent = None
            for tool in tools:
                if tool.name == "agent_context_agent":
                    context_agent = tool
                    break

            if not context_agent:
                print("✗ agent_context_agent not found")
                return

            print(f"✓ Found agent_context_agent")
            print(f"  Description: {context_agent.description[:100]}...\n")

            # Test invoking the agent
            print("Testing agent invocation...")
            print("  Prompt: 'List the main TypeScript files in the project'")
            print("  Working directory: /home/rincon/Swarm/ceregrep-client\n")

            try:
                result = await session.call_tool(
                    "agent_context_agent",
                    {
                        "prompt": "List the main TypeScript files in the project",
                        "cwd": "/home/rincon/Swarm/ceregrep-client"
                    }
                )

                print("✓ Agent invocation successful!\n")
                print("Response:")
                print("=" * 80)
                for content in result.content:
                    if hasattr(content, 'text'):
                        print(content.text[:500])  # Print first 500 chars
                        if len(content.text) > 500:
                            print(f"\n... ({len(content.text) - 500} more characters)")
                print("=" * 80)

            except Exception as e:
                print(f"✗ Agent invocation failed: {e}")
                import traceback
                traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
