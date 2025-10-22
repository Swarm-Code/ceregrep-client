#!/bin/bash

# Example PostToolUse hook that logs completed tool executions
# PostToolUse hooks are fire-and-forget (exit code ignored)

# Read tool context from stdin
context=$(cat)

# Extract tool information
tool_name=$(echo "$context" | jq -r '.tool_name' 2>/dev/null || echo "unknown")
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
error=$(echo "$context" | jq -r '.error // ""' 2>/dev/null)

# Log to stderr (visible in debug mode)
if [ -n "$error" ]; then
  echo "[PostToolUse] $timestamp - Tool: $tool_name - ERROR: $error" >&2
else
  echo "[PostToolUse] $timestamp - Tool: $tool_name - SUCCESS" >&2
fi

# Example: Write to audit log
audit_log="$HOME/.ceregrep/audit.log"
mkdir -p "$(dirname "$audit_log")"

echo "[$timestamp] Tool: $tool_name" >> "$audit_log"
if [ -n "$error" ]; then
  echo "  Status: ERROR - $error" >> "$audit_log"
else
  echo "  Status: SUCCESS" >> "$audit_log"
fi
echo "---" >> "$audit_log"

exit 0
