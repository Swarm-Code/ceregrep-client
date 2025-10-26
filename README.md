# Swarm Scout

[![npm version](https://img.shields.io/npm/v/swarm-scout.svg)](https://www.npmjs.com/package/swarm-scout)
[![npm downloads](https://img.shields.io/npm/dm/swarm-scout.svg)](https://www.npmjs.com/package/swarm-scout)
[![license](https://img.shields.io/npm/l/swarm-scout.svg)](https://github.com/Swarm-Code/swarm-scout/blob/master/LICENSE)

A modular, headless agent framework with support for Bash, Ripgrep, and MCP (Model Context Protocol). Can be invoked via TypeScript SDK, Python SDK, or CLI. **Now available on npm!**

## Features

- **Headless Architecture**: No UI dependencies, pure SDK/CLI
- **Modular Tools**: Bash execution, Ripgrep search, extensible via MCP
- **Multiple Interfaces**: TypeScript SDK, Python SDK (planned), CLI
- **Multi-Provider LLM**: Support for Anthropic Claude and Cerebras (Qwen 3 Coder 480B)
- **MCP Support**: Connect to Model Context Protocol servers for additional tools
- **Automatic Provider Routing**: Seamlessly switch between LLM providers via config

## Installation

### From npm

```bash
npm install swarm-scout
```

Or install globally for CLI usage:

```bash
npm install -g swarm-scout
```

### From source (development)

```bash
# Clone the repository
git clone https://github.com/Swarm-Code/swarm-scout.git
cd swarm-scout

# Install dependencies
npm install

# Build
npm run build

# Install globally from source
npm link

```

> **Note:** `npm run build` automatically terminates lingering Scout MCP server processes so new code loads on the next run. Set `SCOUT_SKIP_MCP_CLEANUP=1` to skip this behaviour (for example, in CI).

After running `npm link`, you can use the `swarm-scout` command anywhere in your system.

## Quick Start

### TypeScript SDK

```typescript
import { SwarmScoutClient } from 'swarm-scout';

const client = new SwarmScoutClient({
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Query the agent
const result = await client.query('List all TypeScript files in the current directory');

console.log('Agent response:', result.messages);
```

### CLI

```bash
# Query the agent
scout query "List all TypeScript files"

# List available tools
scout list-tools

# Show configuration
scout config
```

## Configuration

Swarm Scout supports both global and project-specific configuration:

- **Global config**: `~/.swarmrc` (applies to all projects)
- **Project config**: `.swarmrc` in project directory (overrides global)

**Note:** `.ceregrep.json` is still supported for backward compatibility but deprecated. The tool will show a warning and you should migrate to `.swarmrc`.

Create a global config for system-wide defaults, or project configs to override settings per-project.

### Anthropic Claude (Default)

```json
{
  "model": "claude-sonnet-4-20250514",
  "apiKey": "your-anthropic-api-key",
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"]
    }
  },
  "verbose": false,
  "debug": false
}
```

### Cerebras (Qwen 3 Coder 480B)

**Global config** (recommended for Cerebras):

```bash
cat > ~/.swarmrc << 'EOF'
{
  "model": "qwen-3-coder-480b",
  "provider": {
    "type": "cerebras",
    "apiKey": "csk-your-cerebras-api-key",
    "baseURL": "https://api.cerebras.ai/v1",
    "temperature": 0.7,
    "top_p": 0.8
  },
  "verbose": true,
  "debug": false
}
EOF
```

**Project config** (alternative):

```json
{
  "model": "qwen-3-coder-480b",
  "provider": {
    "type": "cerebras",
    "apiKey": "csk-your-cerebras-api-key",
    "baseURL": "https://api.cerebras.ai/v1",
    "temperature": 0.7,
    "top_p": 0.8
  },
  "verbose": false,
  "debug": false
}
```

### Environment Variables

You can also set API keys via environment variables:

```bash
# For Anthropic
export ANTHROPIC_API_KEY=your-key-here

# For Cerebras
export CEREBRAS_API_KEY=your-key-here
```

## Available Tools

### Built-in Tools

- **Bash**: Execute shell commands in a persistent shell session
- **Grep**: Search for patterns in files using ripgrep

### MCP Tools

Connect to any MCP server to extend functionality. Configure servers in `.swarmrc`:

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/server.js"]
    }
  }
}
```

> **Directory tree results:** The `mcp__filesystem__directory_tree` tool now returns an auto-condensed summary to stay within LLM token limits. When you need the full JSON, pass `{ "mode": "raw" }` (or `raw: true`) in the tool arguments to disable summarisation.

## API Reference

### SwarmScoutClient

```typescript
class SwarmScoutClient {
  constructor(options?: QueryOptions);

  // Query the agent
  async query(prompt: string, options?: QueryOptions): Promise<QueryResult>;

  // Get conversation history
  getHistory(): Message[];

  // Clear history
  clearHistory(): void;

  // Compact history (summarize with LLM)
  async compact(): Promise<void>;

  // Set custom tools
  setTools(tools: Tool[]): void;

  // Set model
  setModel(model: string): void;
}
```

### QueryOptions

```typescript
interface QueryOptions {
  model?: string;
  apiKey?: string;
  tools?: Tool[];
  maxThinkingTokens?: number;
  verbose?: boolean;
  debug?: boolean;
  dangerouslySkipPermissions?: boolean;
}
```

## Architecture

The framework consists of several modular components:

- **Core**: Agent execution loop, message handling, tool interface
- **Tools**: Bash, Grep, and tool registry
- **LLM**: Anthropic client with tool formatting
- **MCP**: Model Context Protocol integration
- **Config**: Configuration loading and validation
- **SDK**: TypeScript (and Python) client libraries
- **CLI**: Command-line interface

## MCP Server

Swarm Scout can also be exposed as an **MCP server**, allowing other agents to use it as a tool for querying and analyzing codebases. **Now available on PyPI!**

### What is the MCP Server?

The MCP server (`mcp-server/`) turns Swarm Scout into a context-finding tool that other agents can call. Instead of manually using bash and grep, agents can ask Scout (which has its own LLM-powered analysis) to find context.

This creates a **recursive agent** pattern where agents can delegate complex context-finding to specialized sub-agents.

### Quick Setup

**Prerequisites:**
```bash
# Install Scout CLI first
npm install -g swarm-scout
```

**Option 1: Using Claude MCP CLI (Easiest)**

```bash
claude mcp add scout uvx scout-mcp
```

**Option 2: Using uvx (No Installation Required)**

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "scout": {
      "command": "uvx",
      "args": ["scout-mcp"]
    }
  }
}
```

**Option 3: Install via pip**

```bash
pip install scout-mcp

# Then add to Claude Desktop:
{
  "mcpServers": {
    "scout": {
      "command": "scout-mcp"
    }
  }
}
```

### Available MCP Tools

- **ceregrep_query**: Query Scout to find context in codebases
  - Parameters: `query` (required), `cwd`, `model`, `verbose`
  - Example queries:
    - "Find all async functions in this codebase"
    - "Explain how the authentication system works"
    - "Show me all API endpoints"

See `mcp-server/README.md` for full documentation.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev
```

## Requirements

- Node.js >= 18.0.0
- Anthropic API key
- ripgrep (rg) installed for Grep tool

## License

MIT
