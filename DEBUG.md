# Debug Mode

The `--debug` flag enables verbose debugging output throughout the Ceregrep system to help diagnose issues.

## Usage

### CLI Query Command

```bash
ceregrep query "your query here" --debug
```

### TUI Interface

```bash
ceregrep tui --debug
```

## What Debug Mode Does

When you use `--debug`, the following debug features are enabled:

1. **Cerebras API Debugging** (`DEBUG_CEREBRAS=1`)
   - Full request payload logging
   - Request parameter validation
   - Detailed error responses
   - Tool call formatting details

2. **MCP Server Debugging** (`DEBUG_MCP=1`)
   - MCP server connection details
   - Tool listing timeouts
   - MCP tool call retries
   - Resource access logging

3. **General Debug Mode** (`DEBUG=1`)
   - Additional system-wide debug information

## Example Output

With `--debug` enabled, you'll see detailed output like:

```
🔍 Debug mode enabled - verbose output will be shown

🔍 === CEREBRAS REQUEST DEBUG ===
Full request params: {
  "model": "qwen-3-coder-480b",
  "messages": [...],
  "tools": [...],
  "temperature": 0.7,
  "top_p": 0.8,
  "max_tokens": 100000
}
=== END CEREBRAS REQUEST DEBUG ===

[MCP ceregrep] Connecting to server...
[MCP ceregrep] Found 2 tools
```

## Debugging Cerebras 400 Errors

If you're experiencing 400 errors from Cerebras (like "400 status code (no body)"), use debug mode to see:

1. The full request being sent to the API
2. Any validation errors in tool calls
3. Request parameter issues
4. Response headers and error details

```bash
ceregrep query "test query" --debug --verbose
```

The debug output will show the exact request payload that's causing the 400 error, helping identify:
- Null values in tool calls
- Malformed tool schemas
- Invalid message content
- Parameter validation issues

### Common Issue: Tool Result Formatting

**Fixed in v0.2.2+**: The Cerebras API (which uses OpenAI's format) requires tool results to be sent with the `tool` role, not as regular user messages. The fix ensures tool results are properly formatted:

**Before (caused 400 error):**
```json
{
  "role": "user",
  "content": "Tool result: <result data>"
}
```

**After (correct format):**
```json
{
  "role": "tool",
  "tool_call_id": "930883f77",
  "content": "<result data>"
}
```

If you see tool results being sent as plain user messages in the debug output, you may be running an older version. Update with:
```bash
ceregrep update
```

## Environment Variables

You can also manually set debug environment variables:

```bash
# Enable all debug modes
export DEBUG_CEREBRAS=1
export DEBUG_MCP=1
export DEBUG=1

# Run your command
ceregrep query "your query"
```

Or just for a single command:

```bash
DEBUG_CEREBRAS=1 DEBUG_MCP=1 ceregrep query "your query"
```
