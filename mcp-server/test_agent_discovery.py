#!/usr/bin/env python3
"""Test agent discovery mechanism."""

import sys
from pathlib import Path

# Add mcp-server directory to path
sys.path.insert(0, str(Path(__file__).parent))

from scout_mcp.tools.agent_tools import agent_tool_generator

# Test agent discovery
print("Testing agent discovery...")
agents = agent_tool_generator._list_agents()
print(f"\nFound {len(agents)} agents:")
for agent in agents:
    print(f"  - {agent.get('id')}: {agent.get('name')}")

# Test tool generation
print("\nGenerating agent tools...")
tools = agent_tool_generator.discover_agent_tools()
print(f"\nGenerated {len(tools)} tools:")
for name, tool in tools.items():
    print(f"  - {name}: {tool.description[:80]}...")
