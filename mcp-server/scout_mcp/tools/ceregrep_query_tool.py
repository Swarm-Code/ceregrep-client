"""Scout query tool for finding context in codebases."""

import asyncio
import subprocess
import json
from pathlib import Path
from .base_tool import BaseTool
from mcp.types import TextContent
from typing import Dict, Any, List


class CeregrepQueryTool(BaseTool):
    """Tool to query Scout agent for codebase context and analysis."""

    def __init__(self, ceregrep_bin_path: str = None):
        """Initialize the tool with path to scout binary."""
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
                    "description": "Natural language query to ask Scout (e.g., 'Find all async functions', 'Explain the auth flow')"
                },
                "cwd": {
                    "type": "string",
                    "description": "Working directory to run Scout in (optional, defaults to current directory)"
                },
                "model": {
                    "type": "string",
                    "description": "LLM model to use (optional, defaults to config)"
                },
                "verbose": {
                    "type": "boolean",
                    "description": "Enable verbose output (optional, defaults to false)"
                },
                "timeout": {
                    "type": "number",
                    "description": "Timeout in seconds for the query (optional, defaults to 300s/5min). Increase for complex codebase analysis."
                }
            },
            "required": ["query"]
        }

    async def execute(self, arguments: Dict[str, Any]) -> List[TextContent]:
        """Execute Scout query."""
        query = arguments.get("query", "")
        cwd = arguments.get("cwd", ".")
        model = arguments.get("model")
        verbose = arguments.get("verbose", False)
        timeout = arguments.get("timeout", 300)  # Default 5 minutes for complex queries

        if not query:
            return [TextContent(type="text", text="Error: query parameter is required")]

        # Build command
        cmd = [self.ceregrep_bin, "query", query]

        if model:
            cmd.extend(["--model", model])

        if verbose:
            cmd.append("--verbose")

        try:
            # Run ceregrep CLI with timeout
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                # Kill the process if it times out
                try:
                    process.kill()
                    await process.wait()
                except:
                    pass

                return [TextContent(
                    type="text",
                    text=(
                        f"Scout query timed out after {timeout}s. "
                        f"The query may be too complex or the codebase too large. "
                        f"Try:\n"
                        f"- Breaking it into smaller queries\n"
                        f"- Increasing the timeout parameter\n"
                        f"- Using more specific search terms"
                    )
                )]

            if process.returncode != 0:
                error_output = stderr.decode() if stderr else "Unknown error"
                # Extract last meaningful error line from verbose output
                error_lines = [line.strip() for line in error_output.strip().split('\n') if line.strip()]
                last_error = error_lines[-1] if error_lines else "Unknown error"

                return [TextContent(
                    type="text",
                    text=(
                        f"❌ **Scout Query Failed**\n\n"
                        f"**Query:** {query}\n"
                        f"**Error:** {last_error}\n\n"
                        f"**Full Verbose Output:**\n"
                        f"```\n{error_output}\n```\n\n"
                        f"**Debug Logs:** Check `debug/mitm/logs/` for API request/response traces"
                    )
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
                    "Make sure Scout is installed: npm install -g swarm-scout"
                )
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error executing Scout: {str(e)}"
            )]
