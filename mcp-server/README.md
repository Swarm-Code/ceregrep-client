# Ceregrep MCP Server

MCP (Model Context Protocol) server that exposes ceregrep query capabilities to other agents.

## What is This?

This MCP server allows any MCP-compatible agent (like Claude Desktop) to use ceregrep as a tool for querying and analyzing codebases. Instead of the agent manually using bash and grep, it can ask ceregrep (which has its own LLM-powered analysis) to find context.

## Features

- **ceregrep_query**: Query ceregrep to find context in codebases
  - Natural language queries (e.g., "Find all async functions", "Explain the auth flow")
  - Automatic code exploration using ceregrep's bash + grep tools
  - LLM-powered analysis and context gathering

## Prerequisites

1. **Ceregrep CLI installed globally**:
   ```bash
   cd /path/to/ceregrep-client
   npm install
   npm run build
   npm link  # Install ceregrep command globally
   ```

2. **Python ≥ 3.10** and **uv** package manager:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

## Installation

1. **Install dependencies**:
   ```bash
   cd mcp-server
   uv sync
   ```

2. **Test the server**:
   ```bash
   uv run python mcp_server.py
   ```

## Usage

### Add to Claude Desktop

Add this to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ceregrep": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "/path/to/ceregrep-client/mcp-server",
        "python",
        "mcp_server.py"
      ]
    }
  }
}
```

### Add to Ceregrep Itself

You can even use ceregrep's own MCP client to connect to this server! Add to `.ceregrep.json`:

```json
{
  "mcpServers": {
    "ceregrep-context": {
      "type": "stdio",
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "/path/to/ceregrep-client/mcp-server",
        "python",
        "mcp_server.py"
      ]
    }
  }
}
```

Now ceregrep can delegate context-finding to another instance of itself!

## Available Tools

### ceregrep_query

Query ceregrep to find context in a codebase.

**Parameters:**
- `query` (required): Natural language query
- `cwd` (optional): Working directory to run ceregrep in
- `model` (optional): LLM model to use
- `verbose` (optional): Enable verbose output

**Example queries:**
- "Find all async functions in this codebase"
- "Explain how the authentication system works"
- "Show me all API endpoints"
- "Find files that handle database connections"
- "Analyze the project architecture"

## How It Works

1. Agent sends a natural language query to ceregrep_query tool
2. MCP server invokes the ceregrep CLI with the query
3. Ceregrep uses its own LLM + bash + grep tools to explore the codebase
4. Results are returned to the requesting agent

This creates a **recursive agent** pattern where agents can delegate complex context-finding to specialized sub-agents.

## Configuration

The MCP server uses the ceregrep CLI, which reads configuration from:
- `.ceregrep.json` in the working directory
- `~/.config/ceregrep/config.json` (global config)
- Environment variables (`ANTHROPIC_API_KEY`, `CEREBRAS_API_KEY`)

## Development

### Project Structure

```
mcp-server/
├── mcp_server.py           # Main MCP server
├── tool_discovery.py       # Auto-discovery system
├── tools/
│   ├── base_tool.py        # Base tool class
│   └── ceregrep_query_tool.py  # Ceregrep query tool
├── pyproject.toml          # Dependencies
└── README.md               # This file
```

### Adding New Tools

1. Create a new file in `tools/`
2. Inherit from `BaseTool`
3. Implement `name`, `description`, `input_schema`, and `execute()`
4. Restart server - tool is auto-discovered!

## Troubleshooting

### "ceregrep command not found"

Run `npm link` in the ceregrep-client directory to install the CLI globally.

### MCP connection errors

Ensure Python ≥ 3.10 and uv are installed:
```bash
python --version  # Should be ≥ 3.10
uv --version      # Should be installed
```

### Query failures

Check ceregrep configuration:
```bash
ceregrep config  # View current config
```

Ensure API keys are set:
- `ANTHROPIC_API_KEY` for Claude
- `CEREBRAS_API_KEY` for Cerebras

## License

MIT
