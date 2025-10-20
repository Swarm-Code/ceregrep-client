# Ceregrep Multi-Agent System

## Overview

The ceregrep multi-agent system allows you to create and manage specialized AI agents with custom system prompts, tool access, and MCP server configurations. Each agent can be tailored for specific tasks like debugging, code review, documentation, database operations, and more.

## Architecture

### Key Features

1. **Template-Based Configuration**: Agents are defined as simple JSON files
2. **Dual Storage**: Support for both global (`~/.ceregrep/agents/`) and project-local (`./.ceregrep/agents/`) agents
3. **Tool Filtering**: Agents can selectively enable/disable tools (bash, grep, MCP tools)
4. **MCP Server Control**: Fine-grained control over which MCP servers and tools each agent can use
5. **System Prompt Modes**: Replace or append system prompts to base configuration
6. **Import/Export**: Easy sharing and version control of agent configurations

### Default Agent Templates

Six pre-configured agents are provided:

1. **debug-agent** - Debugging and troubleshooting expert
2. **postgres-agent** - PostgreSQL database specialist
3. **context-agent** - Context discovery and code exploration
4. **review-agent** - Code review and best practices
5. **test-agent** - Test writing and validation
6. **docs-agent** - Documentation generation

## Installation

### Initialize Default Agents

```bash
ceregrep agent init
```

This installs all 6 default agent templates to `~/.ceregrep/agents/`.

Use `--force` to overwrite existing agents:

```bash
ceregrep agent init --force
```

## Usage

### List Available Agents

```bash
# List all agents (global + project)
ceregrep agent list

# List only global agents
ceregrep agent list --scope global

# List only project agents
ceregrep agent list --scope project

# JSON output
ceregrep agent list --json
```

### View Agent Configuration

```bash
# Show human-readable config
ceregrep agent show debug-agent

# Show as JSON
ceregrep agent show debug-agent --json
```

### Invoke an Agent

```bash
# Basic invocation
ceregrep agent invoke debug-agent "Why is my authentication failing?"

# With options
ceregrep agent invoke context-agent "Explain the user service architecture" --verbose --thinking

# Override model
ceregrep agent invoke review-agent "Review the auth middleware" --model claude-sonnet-4-20250514
```

### Delete an Agent

```bash
ceregrep agent delete my-custom-agent --yes
```

### Export/Import Agents

```bash
# Export to JSON file
ceregrep agent export debug-agent --output my-debug-agent.json

# Import from JSON file (global scope)
ceregrep agent import my-debug-agent.json --scope global

# Import to project scope
ceregrep agent import my-debug-agent.json --scope project

# Overwrite existing agent
ceregrep agent import my-debug-agent.json --force
```

## Agent Configuration

### JSON Structure

```json
{
  "id": "my-agent",
  "name": "My Custom Agent",
  "description": "Description of what this agent does",
  "systemPrompt": "You are a specialized agent...",
  "systemPromptMode": "replace",
  "tools": {
    "bash": true,
    "grep": true,
    "mcp__filesystem__read_file": false
  },
  "mcpServers": {
    "filesystem": {
      "enabled": true,
      "disabledTools": ["dangerous_command"]
    },
    "database": {
      "enabled": false,
      "disabledTools": []
    }
  },
  "createdAt": "2025-10-20T12:00:00Z",
  "updatedAt": "2025-10-20T12:00:00Z"
}
```

### Configuration Fields

- **id**: Unique identifier (kebab-case, lowercase alphanumeric with hyphens)
- **name**: Display name
- **description**: Brief description of agent's purpose
- **systemPrompt**: Custom system prompt defining agent's behavior
- **systemPromptMode**:
  - `"replace"`: Replace default system prompt entirely
  - `"append"`: Append to default system prompt
- **tools**: Map of tool names to boolean (enabled/disabled)
  - Built-in tools: `bash`, `grep`
  - MCP tools: `mcp__<server>__<tool>`
- **mcpServers**: Map of MCP server names to configuration
  - `enabled`: Whether to use this server
  - `disabledTools`: Array of tool names to disable from this server

### Creating Custom Agents

#### Method 1: Manual JSON Creation

Create a JSON file with the structure above:

```bash
# Create agent in global scope
cat > ~/.ceregrep/agents/my-agent.json << 'EOF'
{
  "id": "my-agent",
  "name": "My Custom Agent",
  ...
}
EOF

# Create agent in project scope
mkdir -p .ceregrep/agents
cat > .ceregrep/agents/my-agent.json << 'EOF'
{
  "id": "my-agent",
  ...
}
EOF
```

#### Method 2: Export, Modify, Import

```bash
# Export an existing agent
ceregrep agent export debug-agent --output base.json

# Edit base.json with your changes
nano base.json

# Import with new name
# (Edit the "id" field first!)
ceregrep agent import base.json --scope global
```

## How It Works

### Agent Invocation Flow

1. **Load Agent Config**: Read agent JSON from storage (project first, then global)
2. **Merge Configuration**: Merge agent config with base ceregrep config
   - Apply system prompt (replace or append)
   - Filter tools based on agent's enabled tools
   - Configure MCP servers and disabled tools
3. **Create Client**: Initialize CeregrepClient with merged configuration
4. **Execute Query**: Run the agent query with customized behavior
5. **Stream Results**: Display results to user in real-time

### Tool Filtering

When an agent is invoked, only the tools specified in its config are available:

```json
{
  "tools": {
    "bash": true,      // ✓ Agent can use bash
    "grep": true,      // ✓ Agent can use grep
    "mcp__db__query": false  // ✗ Agent cannot use database queries
  }
}
```

### MCP Server Control

Agents can enable/disable entire MCP servers or specific tools:

```json
{
  "mcpServers": {
    "filesystem": {
      "enabled": true,
      "disabledTools": ["write_file", "delete_file"]
    },
    "database": {
      "enabled": false,  // Entire server disabled
      "disabledTools": []
    }
  }
}
```

## Storage Locations

### Global Agents

- **Path**: `~/.ceregrep/agents/`
- **Scope**: Available across all projects
- **Use Case**: Reusable agents for common tasks

### Project Agents

- **Path**: `./.ceregrep/agents/` (relative to project root)
- **Scope**: Available only in specific project
- **Use Case**: Project-specific agents with specialized knowledge

### Lookup Order

When invoking an agent by ID, ceregrep searches:

1. Project-local agents (`./.ceregrep/agents/`)
2. Global agents (`~/.ceregrep/agents/`)

This allows project agents to override global agents with the same ID.

## Example Use Cases

### Debugging Expert

```bash
ceregrep agent invoke debug-agent "The user authentication is failing with a 401 error"
```

The debug-agent will:
- Analyze error messages and stack traces
- Use bash to inspect logs
- Use grep to find similar error handling patterns
- Suggest specific fixes with explanations

### Context Discovery

```bash
ceregrep agent invoke context-agent "How does the payment processing system work?"
```

The context-agent will:
- Explore the codebase systematically
- Map out the payment flow architecture
- Identify all relevant files and functions
- Provide comprehensive context summary

### Code Review

```bash
ceregrep agent invoke review-agent "Review the authentication middleware for security issues"
```

The review-agent will:
- Check for security vulnerabilities
- Verify best practices
- Suggest improvements
- Provide actionable feedback

### Documentation Generation

```bash
ceregrep agent invoke docs-agent "Generate API documentation for the user service"
```

The docs-agent will:
- Analyze code structure
- Extract API endpoints and parameters
- Create comprehensive documentation
- Include examples and usage patterns

## Advanced Features

### System Prompt Modes

#### Replace Mode (Recommended)

```json
{
  "systemPromptMode": "replace",
  "systemPrompt": "You are a PostgreSQL expert..."
}
```

Replaces the entire default system prompt with your custom prompt. Gives you full control over agent behavior.

#### Append Mode

```json
{
  "systemPromptMode": "append",
  "systemPrompt": "Additionally, you specialize in React hooks..."
}
```

Appends your prompt to the default ceregrep system prompt. Useful for adding specialization while keeping base behavior.

### Tool Naming Conventions

- **Built-in tools**: Simple names like `bash`, `grep`
- **MCP tools**: Format `mcp__<server-name>__<tool-name>`
  - Example: `mcp__filesystem__read_file`
  - Example: `mcp__database__execute_query`

### Sharing Agents

Agents can be version-controlled and shared:

```bash
# Export agent to share
ceregrep agent export my-custom-agent --output agents/my-custom-agent.json

# Commit to git
git add agents/my-custom-agent.json
git commit -m "Add custom agent for API testing"

# Team members can import
ceregrep agent import agents/my-custom-agent.json --scope global
```

## Best Practices

1. **Use Descriptive IDs**: `api-test-agent` instead of `agent1`
2. **Write Detailed System Prompts**: Clear instructions lead to better results
3. **Be Specific with Tools**: Only enable tools the agent needs
4. **Document Your Agents**: Add clear descriptions
5. **Version Control Project Agents**: Track project-specific agent configs in git
6. **Test Agents Thoroughly**: Invoke with various prompts to verify behavior
7. **Use Replace Mode**: Start with replace mode for full control
8. **Organize by Purpose**: Group agents by task (debug, review, docs, etc.)

## Troubleshooting

### Agent Not Found

```bash
Error: Agent "my-agent" not found
```

**Solution**: Check if the agent exists:

```bash
ceregrep agent list
ls ~/.ceregrep/agents/
ls .ceregrep/agents/
```

### Invalid Agent Config

```bash
Error: Invalid agent config: at id: Agent ID must be lowercase alphanumeric with hyphens
```

**Solution**: Ensure agent ID follows kebab-case format: `my-agent-name`

### Tool Not Available

If an agent tries to use a tool that doesn't exist, check:

1. Tool is correctly named in `tools` config
2. MCP server is properly configured
3. MCP tool name follows `mcp__<server>__<tool>` format

## Agent-to-Agent Communication

### Agents as Tools

**All agents are automatically exposed as invocable tools!** This enables powerful agent-to-agent communication where one agent can invoke another agent for specialized tasks.

### Tool Naming Convention

Agents are exposed as tools with the naming format: `agent__<agent-id>`

Examples:
- `agent__debug-agent` - Invoke the debug agent
- `agent__postgres-agent` - Invoke the PostgreSQL agent
- `agent__context-agent` - Invoke the context discovery agent

### How It Works

When you list available tools, you'll see all agents:

```bash
$ ceregrep list-tools
Available tools:
  Bash: Execute bash commands
  Grep: Search with ripgrep
  agent__debug-agent: Invoke the "Debug Agent"
  agent__postgres-agent: Invoke the "PostgreSQL Agent"
  agent__context-agent: Invoke the "Context Discovery Agent"
  agent__review-agent: Invoke the "Code Review Agent"
  agent__test-agent: Invoke the "Test Writing Agent"
  agent__docs-agent: Invoke the "Documentation Agent"
```

### Example: Agent Invoking Another Agent

When you query ceregrep normally, it can automatically invoke agents as tools:

```bash
$ ceregrep query "First use the context-agent to understand the auth system, then use the debug-agent to find why login is failing"
```

The agent will:
1. See `agent__context-agent` as an available tool
2. Invoke it with the prompt "understand the auth system"
3. Get the context response
4. Invoke `agent__debug-agent` with the context and debug request
5. Synthesize both responses into a complete answer

### Agent Configuration for Tool Access

You can control which agents an agent can invoke by configuring the `tools` section:

```json
{
  "id": "orchestrator-agent",
  "name": "Orchestrator Agent",
  "tools": {
    "bash": true,
    "grep": true,
    "agent__debug-agent": true,
    "agent__context-agent": true,
    "agent__review-agent": false
  }
}
```

This orchestrator agent can invoke the debug and context agents, but NOT the review agent.

### Preventing Recursion

When an agent is invoked as a tool, it does NOT have access to agent tools (to prevent infinite recursion). This means:
- Agent A can invoke Agent B
- But Agent B cannot invoke Agent A or Agent C when running as a tool

This is a safety mechanism built into the system.

### Use Cases

#### 1. Orchestration Agents

Create an orchestrator agent that delegates to specialists:

```json
{
  "id": "orchestrator",
  "systemPrompt": "You coordinate multiple specialized agents to solve complex problems. Use context-agent for exploration, debug-agent for troubleshooting, and review-agent for code quality checks.",
  "tools": {
    "agent__context-agent": true,
    "agent__debug-agent": true,
    "agent__review-agent": true
  }
}
```

#### 2. Sequential Workflows

Chain agents for complex workflows:
1. Context agent discovers relevant code
2. Review agent analyzes code quality
3. Test agent writes tests
4. Debug agent validates behavior

#### 3. Specialized Pipelines

Create domain-specific pipelines:
- **Database Pipeline**: context-agent → postgres-agent → test-agent
- **Documentation Pipeline**: context-agent → docs-agent → review-agent
- **Debug Pipeline**: context-agent → debug-agent → test-agent

## Future Enhancements

The following features are planned but not yet implemented:

1. **TUI for Agent Creation**: Interactive terminal UI for creating agents
2. **Agent Templates**: More pre-built templates for common use cases
3. **Agent Metrics**: Track usage and performance of agents
4. **Agent Validation**: Verify tools and MCP servers exist before running
5. **Circular Dependency Detection**: Better handling of agent-to-agent call chains

## Exposing Agents via MCP Server

### MCP Server Integration

All ceregrep agents are **automatically exposed as MCP tools** through the ceregrep-mcp server! This allows external systems like Claude Code, cursor, or any MCP-compatible client to invoke agents directly.

### Setup

1. **Install globally** (if not already):
   ```bash
   npm install -g ceregrep
   ```

2. **Run MCP server**:
   ```bash
   uvx ceregrep-mcp
   ```

3. **Add to Claude Code**:
   ```bash
   claude mcp add ceregrep uvx ceregrep-mcp
   ```

### Available via MCP

When connected, external systems will see 7 agent tools:

- `agent_debug_agent` - Debugging expert
- `agent_context_agent` - Context discovery specialist
- `agent_postgres_agent` - PostgreSQL specialist
- `agent_review_agent` - Code review expert
- `agent_test_agent` - Test writing specialist
- `agent_docs_agent` - Documentation expert
- `agent_orchestrator_agent` - Meta-agent coordinator

### Example: Claude Code Using Agents

Once configured, you can ask Claude Code:

> "Use the debug-agent to find why authentication is failing"

Claude Code will:
1. See `agent_debug_agent` as an available MCP tool
2. Invoke it with your prompt
3. Get the specialized debugging response
4. Present it to you

This creates a **recursive agent pattern** where Claude Code (the outer agent) delegates specialized tasks to ceregrep agents (inner agents).

### Testing MCP Server

```bash
cd mcp-server
source .venv/bin/activate
python test_agent_tools.py
```

Output:
```
✓ Found 8 tools:
  - ceregrep_query
  - agent_debug_agent ⭐
  - agent_context_agent ⭐
  - agent_postgres_agent ⭐
  - agent_review_agent ⭐
  - agent_test_agent ⭐
  - agent_docs_agent ⭐
  - agent_orchestrator_agent ⭐
```

## File Structure

```
ceregrep-client/
├── agents/
│   ├── schema.ts              # Zod validation schemas
│   ├── manager.ts             # CRUD operations
│   ├── config-merger.ts       # Config merging logic
│   ├── init.ts                # Default template initialization
│   ├── tool-wrapper.ts        # Agent-as-tool wrapper (internal)
│   ├── templates/             # Default agent templates
│   │   ├── debug-agent.json
│   │   ├── postgres-agent.json
│   │   ├── context-agent.json
│   │   ├── review-agent.json
│   │   ├── test-agent.json
│   │   ├── docs-agent.json
│   │   └── orchestrator-agent.json
│   └── index.ts               # Exports
├── mcp-server/                # MCP server exposing agents
│   ├── ceregrep_mcp/
│   │   ├── server.py          # Main MCP server
│   │   └── tools/
│   │       ├── agent_tools.py # Dynamically expose agents
│   │       └── ceregrep_query_tool.py
│   └── README.md              # MCP server docs
└── cli/
    └── commands/
        └── agent.ts           # Agent CLI commands
```

## Contributing

To add new default templates:

1. Create template JSON in `agents/templates/`
2. Add filename to `DEFAULT_TEMPLATES` in `agents/init.ts`
3. Test with `ceregrep agent init --force`
4. Update this documentation

## Support

For issues, questions, or feature requests, please visit:
https://github.com/Swarm-Code/ceregrep-client/issues
