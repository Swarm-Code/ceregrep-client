# Pre/Post Tool Use Hooks

Ceregrep supports pre and post tool use hooks, similar to Claude Code's hook system. Hooks allow you to intercept tool calls before and after execution.

## Configuration

Add hooks to your `.ceregrep.json` or `.swarmrc` configuration file:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'About to run bash command' >&2"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "./hooks/check-file-safety.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Tool executed' >&2"
          }
        ]
      }
    ]
  }
}
```

## Hook Types

### PreToolUse Hooks

Execute **before** a tool is called. PreToolUse hooks can:
- **Block execution**: Exit with non-zero code to prevent tool execution
- **Modify input**: Output JSON with `tool_input` field to modify tool arguments
- **Log/audit**: Track tool usage before execution

### PostToolUse Hooks

Execute **after** a tool completes. PostToolUse hooks are "fire and forget" - they run asynchronously and don't block the agent.

## Matcher Patterns

The `matcher` field supports:
- **Exact match**: `"Bash"` - matches only Bash tool
- **Multiple tools**: `"Edit|Write"` - matches Edit OR Write
- **Wildcard**: `"*"` - matches all tools
- **Simple glob**: `"mcp__*"` - matches all MCP tools

## Hook Context

Hooks receive tool context via:

### 1. Environment Variables
- `TOOL_NAME`: Name of the tool being called
- `TOOL_DESCRIPTION`: Tool description
- `TOOL_INPUT_<KEY>`: Each tool input parameter (uppercase)

### 2. stdin (JSON)
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "ls -la"
  },
  "tool_description": "Execute bash command",
  "result": null,
  "error": null
}
```

## Example Hooks

### Block Dangerous Commands

Create `hooks/check-bash-safety.sh`:

```bash
#!/bin/bash

# Read tool context from stdin
context=$(cat)

# Extract command from context
command=$(echo "$context" | jq -r '.tool_input.command')

# Block dangerous commands
if echo "$command" | grep -qE "rm -rf|dd if|mkfs|:(){"; then
  echo "Dangerous command blocked!" >&2
  exit 1
fi

# Allow the command
exit 0
```

Configuration:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./hooks/check-bash-safety.sh"
          }
        ]
      }
    ]
  }
}
```

### Log All Tool Usage

Create `hooks/audit-log.sh`:

```bash
#!/bin/bash

# Read tool context
context=$(cat)
tool_name=$(echo "$context" | jq -r '.tool_name')
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Append to audit log
echo "[$timestamp] Tool: $tool_name" >> ~/.ceregrep/audit.log
echo "$context" | jq '.' >> ~/.ceregrep/audit.log
echo "---" >> ~/.ceregrep/audit.log

# Always allow
exit 0
```

Configuration:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "./hooks/audit-log.sh"
          }
        ]
      }
    ]
  }
}
```

### Modify Tool Input

Create `hooks/sanitize-path.sh`:

```bash
#!/bin/bash

# Read tool context
context=$(cat)

# Extract file path
file_path=$(echo "$context" | jq -r '.tool_input.file_path // .tool_input.path')

# Sanitize path (remove ../ traversals)
safe_path=$(echo "$file_path" | sed 's|\.\./||g')

# Output modified input
echo "$context" | jq --arg path "$safe_path" '.tool_input.file_path = $path'

exit 0
```

### Notify on File Changes

Create `hooks/notify-file-change.sh`:

```bash
#!/bin/bash

# Read tool context from stdin
context=$(cat)
tool_name=$(echo "$context" | jq -r '.tool_name')
file_path=$(echo "$context" | jq -r '.tool_input.file_path // .tool_input.path // ""')

# Send notification
if [ -n "$file_path" ]; then
  notify-send "Ceregrep" "File modified: $file_path"
fi

exit 0
```

Configuration:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "./hooks/notify-file-change.sh"
          }
        ]
      }
    ]
  }
}
```

## Exit Codes

### PreToolUse Hooks
- **Exit 0**: Allow tool execution (optionally with modified input)
- **Exit non-zero**: Block tool execution

### PostToolUse Hooks
- Exit codes are ignored (fire and forget)

## Debugging Hooks

Enable debug mode to see hook execution logs:

```json
{
  "debug": true,
  "hooks": { ... }
}
```

Or run with debug flag:
```bash
ceregrep --debug
```

You'll see logs like:
```
[AGENT] Executing tool: Bash
[AGENT] Tool Bash blocked by PreToolUse hook: Dangerous command blocked!
[AGENT] PostToolUse hook error for Edit: timeout
```

## Security Considerations

1. **Hook scripts should be executable**: `chmod +x hooks/*.sh`
2. **Hooks run with your user permissions**: Be cautious with hook commands
3. **Timeouts**: Hooks have a 30-second timeout
4. **PreToolUse hooks can block the agent**: Ensure they exit quickly
5. **Use absolute paths** or paths relative to config directory

## Multiple Hooks

You can configure multiple hooks for the same matcher - they execute in order:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "./hooks/log.sh"
          },
          {
            "type": "command",
            "command": "./hooks/check-safety.sh"
          }
        ]
      }
    ]
  }
}
```

If **any** PreToolUse hook blocks (non-zero exit), the tool execution is blocked immediately.

## Real-World Use Cases

1. **Safety checks**: Block destructive operations in production
2. **Compliance**: Audit all file modifications
3. **Path sanitization**: Prevent directory traversal
4. **Rate limiting**: Throttle expensive operations
5. **Notifications**: Alert on critical operations
6. **Input validation**: Ensure tool inputs meet requirements
7. **Context injection**: Add environment-specific data
8. **Cost tracking**: Monitor API usage

## Implementation Details

The hook system is implemented in:
- `core/hooks.ts` - Hook execution engine
- `core/agent.ts` - Integration into tool execution flow
- `config/schema.ts` - Configuration schema

Hooks are executed:
1. **Before tool.call()**: PreToolUse hooks run synchronously
2. **After tool.call()**: PostToolUse hooks run asynchronously (fire and forget)

Hook context includes:
- Tool name
- Tool input (arguments)
- Tool description
- Result (PostToolUse only)
- Error (PostToolUse only, if execution failed)
