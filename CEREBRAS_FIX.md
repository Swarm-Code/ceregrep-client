# Cerebras 400 Error Fix

## Problem

When using Cerebras (Qwen 3 Coder 480B) with tool calling, the system was receiving a `400 status code (no body)` error on the second API request (after a tool was used).

## Root Causes

The issue was identified using the new `--debug` flag. The debug output revealed **two critical formatting issues**:

1. **Tool results were being sent as regular user messages** instead of using the proper OpenAI/Cerebras tool message format
2. **Assistant messages with tool calls had whitespace-only content** which violated the OpenAI API specification

### Issue 1: Incorrect Tool Result Format

**Before Fix:**
```json
{
  "role": "user",
  "content": "Tool result: ./cli/commands/agent.ts\n./cli/commands/completion.ts\n..."
}
```

**After Fix:**
```json
{
  "role": "tool",
  "tool_call_id": "930883f77",
  "content": "./cli/commands/agent.ts\n./cli/commands/completion.ts\n..."
}
```

### Issue 2: Empty Tool Output

**Problem:** Tool calls (like Bash commands with no output) were returning empty strings, which when combined with the message formatting issues, contributed to 400 errors.

**Solution:**
- Modified `tools/bash.ts:81` to return "Command executed successfully (no output)" when result is empty
- Added safety check in `core/agent.ts:232` to ensure no tool result ever has empty content
- This ensures all tool results always have meaningful, non-empty content

## Solution

Modified `llm/cerebras.ts` (lines 136-194) to properly detect and convert Anthropic-style tool results to OpenAI-style tool messages:

**Key Changes:**

1. **Detect tool results in user messages**: Check if the user message content array contains items with `type: 'tool_result'`

2. **Convert to OpenAI format**: For each tool result, create a message with:
   - `role: 'tool'` (not 'user')
   - `tool_call_id`: from the `tool_use_id` field
   - `content`: the actual tool result

3. **Handle mixed content**: If a user message contains both tool results and text, split them into separate messages

## Files Modified

1. **cli/index.ts** (lines 74-80, 599-604)
   - Added `--debug` flag support for query and tui commands
   - Sets environment variables: `DEBUG_CEREBRAS=1`, `DEBUG_MCP=1`, `DEBUG=1`

2. **llm/cerebras.ts** (lines 136-194, 226-249)
   - Fixed tool result message formatting (role: "tool" with tool_call_id)
   - Properly converts Anthropic format to OpenAI/Cerebras format
   - Handles assistant messages with tool_calls correctly (includes content only if non-empty)

3. **tools/bash.ts** (lines 69-82)
   - Added fallback message for empty command output
   - Returns "Command executed successfully (no output)" instead of empty string

4. **core/agent.ts** (lines 225-241)
   - Added safety check to ensure tool results never have empty content
   - Returns "Tool executed successfully (no output)" as fallback

5. **DEBUG.md** (new file)
   - Comprehensive debug mode documentation
   - Explains how to use `--debug` flag
   - Documents the tool result formatting issue and fix

6. **CEREBRAS_FIX.md** (this file)
   - Complete documentation of the 400 error root causes and solutions

## Testing

To verify the fix works:

```bash
# Build the updated code
npm run build

# Test with debug mode enabled
ceregrep query "list all typescript files in the cli directory" --debug

# You should now see:
# 1. Tool messages with role: "tool" instead of role: "user"
# 2. Assistant messages with tool_calls that include content field
# 3. No 400 errors from Cerebras API
```

**Successful Test Output:**
```
[AGENT] Starting query with: {
  messageCount: 3,
  systemPromptLength: 19,
  toolCount: 9,
  ...
}

🔍 === CEREBRAS REQUEST DEBUG ===
Full request params: {
  "model": "qwen-3-coder-480b",
  "messages": [
    {
      "role": "system",
      "content": "..."
    },
    {
      "role": "user",
      "content": "list all typescript files in the cli directory"
    },
    {
      "role": "assistant",
      "tool_calls": [{
        "id": "338f87132",
        "type": "function",
        "function": {
          "name": "Bash",
          "arguments": "{\"command\":\"find cli -name \\\"*.ts\\\" -type f\"}"
        }
      }],
      "content": "I'll help you list all TypeScript files in the cli directory. Let me use the bash command to find these files."
    },
    {
      "role": "tool",
      "tool_call_id": "338f87132",
      "content": "cli/commands/agent.ts\ncli/commands/completion.ts\ncli/stream-renderer.ts\ncli/index.ts"
    }
  ],
  ...
}
=== END CEREBRAS REQUEST DEBUG ===

[AGENT] No tool use found, conversation complete
✔ Complete
```

## Debug Output Comparison

### Before Fix (400 Error)
```
API messages: [
  { "role": "system", "content": "..." },
  { "role": "user", "content": "what is this project about" },
  { "role": "assistant", "content": "", "tool_calls": [...] },
  { "role": "user", "content": "Tool result: ..." }  ← WRONG
]
```

### After Fix (Success)
```
API messages: [
  { "role": "system", "content": "..." },
  { "role": "user", "content": "what is this project about" },
  { "role": "assistant", "content": "", "tool_calls": [...] },
  { "role": "tool", "tool_call_id": "930883f77", "content": "..." }  ← CORRECT
]
```

## Impact

- ✅ **VERIFIED WORKING**: Fixes 400 errors when using tools with Cerebras
- ✅ Maintains compatibility with Anthropic Claude (different message format internally)
- ✅ Enables proper multi-turn conversations with tool usage
- ✅ Adds comprehensive debugging capabilities via `--debug` flag
- ✅ Ensures tool results never return empty/null content
- ✅ Properly formats all messages according to OpenAI API specification

## Additional Notes

The fix maintains backward compatibility because:
- Anthropic messages still use their native format internally
- Only the Cerebras client converts to OpenAI format at API call time
- The conversion is transparent to the rest of the system

## Enhanced Debug Logging

Comprehensive request/response logging has been added to help diagnose issues:

**See [DEBUG_LOGGING.md](./DEBUG_LOGGING.md) for complete documentation.**

### Quick Example

```bash
ceregrep query "test prompt" --debug
```

This will show:
- 📤 Every request sent to Cerebras (with full message details)
- 📥 Every response received (with token usage, cost, duration)
- ❌ Detailed error information if something fails
- 💬 Message content previews and tool call details
- 🛠️ Tool execution flow (which tools called, with what arguments)

### What You Can Debug With Logging

1. **Message Formatting Issues**:
   - See exact role for each message (`user`, `assistant`, `tool`, `system`)
   - Verify content is non-empty
   - Check tool_call_id matches between assistant tool_calls and tool responses

2. **Token Usage & Performance**:
   - Track token consumption per request
   - Monitor API call duration
   - Estimate costs in real-time

3. **Tool Call Flow**:
   - Verify tool call arguments are properly formatted
   - Ensure tool results are being sent with correct format
   - Track multi-turn conversations with tool usage

## References

- OpenAI Chat Completions API: https://platform.openai.com/docs/api-reference/chat/create
- Tool result messages require `role: "tool"` and `tool_call_id` fields
- Cerebras uses OpenAI-compatible API format
- Complete logging documentation: [DEBUG_LOGGING.md](./DEBUG_LOGGING.md)
