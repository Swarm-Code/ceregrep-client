#!/bin/bash
# Wrapper script to run ceregrep MCP server
cd "$(dirname "$0")"
exec uv run python mcp_server.py
