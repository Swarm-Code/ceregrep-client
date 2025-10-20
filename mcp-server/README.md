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
claude mcp add ceregrep uvx ceregrep-mcp
```

This automatically adds ceregrep-mcp to your Claude configuration.

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

### Agent Tools (7 Specialized Agents)

**All ceregrep agents are automatically exposed as MCP tools!** External systems like Claude Code can invoke specialized agents directly.

**Available agents:**

1. **agent_debug_agent** - Debugging expert
   - Analyzes error messages and stack traces
   - Identifies root causes of bugs
   - Suggests fixes with explanations

2. **agent_context_agent** - Context discovery specialist
   - Explores codebases systematically
   - Maps architecture and code flows
   - Provides comprehensive context

3. **agent_postgres_agent** - PostgreSQL specialist
   - Database schema analysis
   - Query optimization
   - SQL best practices

4. **agent_review_agent** - Code review expert
   - Reviews code for quality and best practices
   - Identifies security vulnerabilities
   - Suggests improvements

5. **agent_test_agent** - Test writing specialist
   - Writes comprehensive unit/integration tests
   - Identifies test coverage gaps
   - Follows testing best practices

6. **agent_docs_agent** - Documentation expert
   - Generates API documentation
   - Writes README files and guides
   - Creates clear, comprehensive docs

7. **agent_orchestrator_agent** - Meta-agent coordinator
   - Coordinates multiple specialized agents
   - Breaks down complex problems
   - Synthesizes responses from agents

**Parameters (all agents):**
- `prompt` (required): The prompt/query to send to the agent
- `cwd` (optional): Working directory to run in
- `model` (optional): LLM model to use
- `verbose` (optional): Enable verbose output

**Example usage:**
- `agent_debug_agent`: "Why is my authentication failing with a 401 error?"
- `agent_context_agent`: "Explain the payment processing system architecture"
- `agent_review_agent`: "Review the authentication middleware for security issues"

### Example: Using Agents from Claude Code

Once you've added ceregrep-mcp to Claude Code, you can ask Claude to use specialized agents:

**User:** "Use the debug-agent to investigate why login is returning 401 errors"

**Claude Code:** (Sees `agent_debug_agent` as available tool, invokes it)

The debug agent will:
1. Explore your authentication code
2. Check error handling patterns
3. Analyze JWT validation logic
4. Provide specific debugging guidance

**Response format:**
```
## Debug Agent Response

**Prompt:** Investigate why login is returning 401 errors

I've analyzed your authentication system. Here's what I found:

1. JWT Token Validation (src/auth/middleware.ts:45)
   - The token expiration check is failing
   - Issue: Clock skew between server and client

2. Suggested Fix:
   - Add a 30-second leeway to token validation
   - Update JWT_VERIFY_OPTIONS to include clockTolerance

[... detailed debugging context ...]
```

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

## Agent Discovery and Caching

The MCP server automatically discovers agents by running `ceregrep agent list --json`. To optimize performance:

- **Agent list is cached for 5 minutes** - New agents will be visible within 5 minutes without restarting the MCP server
- **Cache refreshes automatically** - After 5 minutes, the agent list is refreshed on the next tool list request
- **Manual refresh** - Restart the MCP server to immediately refresh the agent list

This means you can:
1. Create a new agent with `ceregrep agent init` or `ceregrep agent import`
2. Use it in Claude Code within 5 minutes (or restart the MCP server for immediate availability)

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
