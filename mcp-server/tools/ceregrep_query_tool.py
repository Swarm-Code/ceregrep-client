"""Ceregrep query tool for finding context in codebases."""

import asyncio
import subprocess
import json
from pathlib import Path
from .base_tool import BaseTool
from mcp.types import TextContent
from typing import Dict, Any, List


class CeregrepQueryTool(BaseTool):
    """Tool to query ceregrep agent for codebase context and analysis."""

    def __init__(self, ceregrep_bin_path: str = None):
        """Initialize the tool with path to ceregrep binary."""
        self.ceregrep_bin = ceregrep_bin_path or "scout"

    @property
    def name(self) -> str:
        return "scout_query"

    @property
    def description(self) -> str:
        return (
            "Query the Scout agent to find context in a codebase. "
            "Scout uses LLM-powered analysis with bash and grep tools to explore code, "
            "find patterns, analyze architecture, and provide detailed context. "
            "Use this when you need to understand code structure, find implementations, "
            "or gather context from files."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language query to ask scout (e.g., 'Find all async functions', 'Explain the auth flow')"
                },
                "cwd": {
                    "type": "string",
                    "description": "Working directory to run scout in (optional, defaults to current directory)"
                },
                "model": {
                    "type": "string",
                    "description": "LLM model to use (optional, defaults to config)"
                },
                "verbose": {
                    "type": "boolean",
                    "description": "Enable verbose output (optional, defaults to false)"
                }
            },
            "required": ["query"]
        }

    async def execute(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Execute ceregrep query."""
        query = arguments.get("query", "")
        cwd = arguments.get("cwd", ".")
        model = arguments.get("model")
        verbose = arguments.get("verbose", False)

        if not query:
            return [TextContent(type="text", text="Error: query parameter is required")]

        # Build command
        cmd = [self.ceregrep_bin, "query", query]

        if model:
            cmd.extend(["--model", model])

        if verbose:
            cmd.append("--verbose")

        try:
            # Run ceregrep CLI
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                return [TextContent(
                    type="text",
                    text=f"Scout query failed: {error_msg}"
                )]

            # Parse output
            output = stdout.decode()

            return [TextContent(
                type="text",
                text=f"## Scout Query Result\n\n**Query:** {query}\n\n{output}"
            )]

        except FileNotFoundError:
            return [TextContent(
                type="text",
                text=(
                    "Error: scout command not found. "
                    "Make sure scout is installed and in PATH. "
                    "Run: npm link in the scout-client directory to install globally."
                )
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error executing scout: {str(e)}"
            )]
