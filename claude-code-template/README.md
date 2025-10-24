# Swarm - Claude Code Client

Swarm is an advanced terminal-based client for interacting with Claude AI, providing a rich REPL (Read-Eval-Print Loop) interface with support for MCP (Model Context Protocol) servers, tool integrations, and AI-powered development workflows.

## Features

- **Interactive Terminal Interface**: Built with React and Ink for a modern terminal experience
- **Claude AI Integration**: Direct integration with Anthropic's Claude API via multiple SDKs
- **MCP Server Support**: Configure and manage Model Context Protocol servers
- **Tool Integration**: Extensible tool system for various development tasks
- **Context Management**: Static context management for improved AI interactions
- **Configuration System**: Global and project-specific configuration options
- **Conversation Management**: Resume previous conversations and view conversation logs
- **Auto-updater**: Built-in update mechanism for staying current

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js
- **Operating System**: Linux, macOS, or Windows

## Installation

### Global Installation (Recommended)

Install Swarm globally using npm:

```bash
npm install -g swarm
```

This will make the `swarm` command available system-wide from any directory.

### Alternative: Install from Source

1. **Clone the repository**:
```bash
git clone <repository-url>
cd swarm-client
```

2. **Install dependencies**:
```bash
npm install
```

3. **Build the project**:
```bash
npm run build
```

4. **Link globally**:
```bash
npm link
```

This will make the `swarm` command available globally, similar to the npm installation method.

## Usage

### Basic Usage

Start an interactive session:
```bash
swarm
```

Start with a specific prompt:
```bash
swarm "Help me debug this Python script"
```

Use in non-interactive mode (pipe mode):
```bash
echo "Explain this code" | swarm --print
```

### Command Line Options

- `-c, --cwd <path>`: Set the current working directory
- `-d, --debug`: Enable debug mode
- `--verbose`: Override verbose mode setting from config
- `--enable-architect`: Enable the Architect tool
- `-p, --print`: Print response and exit (useful for pipes)
- `--dangerously-skip-permissions`: Skip permission checks (Docker only)

## Configuration

### Global Configuration

```bash
# Set theme
swarm config set -g theme dark

# Get current config
swarm config get -g theme

# List all global settings
swarm config list -g
```

### Project Configuration

```bash
# Set project-specific setting
swarm config set enableArchitectTool true

# List project settings
swarm config list
```

## MCP Server Management

### Adding MCP Servers

Add a stdio server:
```bash
swarm mcp add myserver /path/to/server --args arg1 arg2
```

Add an SSE server (ants only):
```bash
swarm mcp add-sse myserver https://example.com/mcp
```

### Managing MCP Servers

```bash
# List configured servers
swarm mcp list

# Get server details
swarm mcp get myserver

# Remove a server
swarm mcp remove myserver

# Start MCP server mode
swarm mcp serve
```

## Advanced Features

### Conversation Management

```bash
# Resume last conversation
swarm resume

# Resume specific conversation by number
swarm resume 0

# Resume from specific file
swarm resume /path/to/conversation.log

# View conversation logs
swarm log

# View specific log
swarm log 0
```

### Context Management

```bash
# Set context value
swarm context set projectType "web application"

# Get context value
swarm context get projectType

# List all context
swarm context list

# Remove context
swarm context remove projectType
```

### Tool Management

```bash
# List approved tools
swarm approved-tools list

# Remove approved tool
swarm approved-tools remove <tool-name>
```

## Development

### Building from Source

1. **Development build**:
```bash
npm run build-dev
```

2. **Production build**:
```bash
npm run build
```

3. **Verbose build with metadata**:
```bash
npm run build-verbose
```

### Build Scripts

- `build`: Production build with minification
- `build-dev`: Development build with source maps
- `build-verbose`: Production build with metadata

### Dependencies

**Core Dependencies:**
- `@modelcontextprotocol/sdk`: MCP protocol support
- `commander`: CLI argument parsing
- `ink`: Terminal UI framework
- `react`: UI library
- `sharp`: Image processing

**Development Dependencies:**
- `@anthropic-ai/sdk`: Claude AI integration
- `esbuild`: Fast bundling
- `typescript`: Type checking
- Various other development tools

## Troubleshooting

### Common Issues

1. **Global Installation Permission Errors**:
   - On macOS/Linux, you may need `sudo`: `sudo npm install -g swarm`
   - Or configure npm to install global packages in your home directory
   - Ensure Node.js is properly installed with correct permissions

2. **Build Failures**:
   - Verify Node.js version (18+ required)
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript compilation: `npx tsc --noEmit`

3. **Runtime Errors**:
   - Enable debug mode: `swarm --debug`
   - Check error logs: `swarm error`
   - Verify configuration: `swarm config list -g`

4. **MCP Server Issues**:
   - Verify server configuration: `swarm mcp get <server-name>`
   - Check server logs and permissions
   - Ensure server executable is accessible

### Getting Help

```bash
# Check installation health
swarm doctor

# View help
swarm --help

# View command-specific help
swarm <command> --help
```

## System Requirements

- **Node.js**: 18.x or higher
- **Memory**: Minimum 512MB RAM
- **Storage**: ~100MB for installation
- **Network**: Internet access for Claude AI API

## License

This project is part of the Claude Code ecosystem. Please refer to the license file for specific terms and conditions.

## Support

For issues, questions, or contributions, please refer to the project's issue tracker or documentation at the official Claude Code website.
