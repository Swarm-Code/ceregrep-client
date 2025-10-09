# Ceregrep MCP Server

[![pypi version](https://img.shields.io/pypi/v/ceregrep-mcp.svg)](https://pypi.org/project/ceregrep-mcp/)
[![license](https://img.shields.io/pypi/l/ceregrep-mcp.svg)](https://github.com/Swarm-Code/ceregrep-client/blob/master/LICENSE)

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
   npm install -g ceregrep
   ```

2. **Python ≥ 3.10** (for pip installation) or **uvx** (for no-install usage)

## Installation

### Option 1: Using uvx (Recommended - No Installation Required)

```bash
# No installation needed! Just use uvx to run it
uvx ceregrep-mcp
```

### Option 2: Install via pip

```bash
pip install ceregrep-mcp
```

### Option 3: Install from source (Development)

```bash
cd mcp-server
pip install -e .
```

## Usage

### Using with uvx (Recommended)

The easiest way to use ceregrep-mcp is with `uvx`, which runs the package without installation:

```bash
uvx ceregrep-mcp
```

### Add to Claude Desktop

**Method 1: Using Claude MCP CLI (Easiest)**

```bash
claude mcp add ceregrep-mcp
```

This automatically adds ceregrep-mcp to your Claude Desktop configuration.

**Method 2: Manual Configuration**

Edit your Claude Desktop MCP configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "ceregrep": {
      "command": "uvx",
      "args": ["ceregrep-mcp"]
    }
  }
}
```

**If you installed via pip:**

```json
{
  "mcpServers": {
    "ceregrep": {
      "command": "ceregrep-mcp"
    }
  }
}
```

### Add to Other MCP Clients

For any MCP-compatible client, add to your `mcp.json` or equivalent config file:

```json
{
  "mcpServers": {
    "ceregrep": {
      "command": "uvx",
      "args": ["ceregrep-mcp"],
      "env": {}
    }
  }
}
```

### Add to Ceregrep Itself (Recursive Pattern)

You can even use ceregrep's own MCP client to connect to this server! Add to `.ceregrep.json` or `~/.ceregrep.json`:

```json
{
  "mcpServers": {
    "ceregrep-context": {
      "type": "stdio",
      "command": "uvx",
      "args": ["ceregrep-mcp"]
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

AGPL-3.0-or-later
