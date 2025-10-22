#!/bin/bash

# Example PreToolUse hook that logs tool usage
# Exit 0 to allow execution, non-zero to block

# Read tool context from stdin
context=$(cat)

# Extract tool information
tool_name=$(echo "$context" | jq -r '.tool_name' 2>/dev/null || echo "unknown")
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Log to stderr (visible in debug mode)
echo "[PreToolUse] $timestamp - Tool: $tool_name" >&2

# Example: Block dangerous bash commands
if [ "$tool_name" = "Bash" ]; then
  command=$(echo "$context" | jq -r '.tool_input.command' 2>/dev/null || echo "")

  # Check for dangerous patterns
  if echo "$command" | grep -qE "rm -rf /|dd if=|mkfs|:()"; then
    echo "[PreToolUse] BLOCKED: Dangerous command detected!" >&2
    exit 1
  fi
fi

# Allow tool execution
exit 0
