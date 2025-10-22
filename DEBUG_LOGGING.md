# Enhanced Debug Logging for Cerebras API

## Overview

The Cerebras LLM client (`llm/cerebras.ts`) now includes comprehensive debug logging to help troubleshoot API request/response issues. This logging is activated with the `--debug` flag.

## How to Enable Debug Logging

### Command Line
```bash
# For query command
ceregrep query "your prompt here" --debug

# For TUI command
ceregrep tui --debug
```

### Environment Variables (Alternative)
```bash
export DEBUG_CEREBRAS=1
export DEBUG_MCP=1
export DEBUG=1
ceregrep query "your prompt here"
```

## What Gets Logged

### 📤 Request Logging (Before API Call)

The debug output shows detailed information about every request sent to the Cerebras API:

```
📤 === CEREBRAS API REQUEST ===
⏰ Timestamp: 2025-10-21T12:34:56.789Z
🎯 Model: qwen-3-coder-480b
📊 Request Details:
  - Temperature: 0.7
  - Top P: 0.8
  - Max Tokens: 100000
  - Message Count: 3
  - Tool Count: 9

💬 Messages Being Sent:

  Message #1:
    Role: system
    Content: You are a helpful AI assistant with access to bash and file search tools...
    Content Length: 1234 chars

  Message #2:
    Role: user
    Content: list all typescript files in the cli directory
    Content Length: 45 chars

  Message #3:
    Role: assistant
    Tool Calls: 1
      [1] Bash (id: 338f87132)
          Args: {"command":"find cli -name \"*.ts\" -type f"}
    Content: I'll help you list all TypeScript files in the cli directory. Let me use the bash command to find these files.

  Message #4:
    Role: tool
    Tool Call ID: 338f87132
    Content: cli/commands/agent.ts
cli/commands/completion.ts
cli/stream-renderer.ts
cli/index.ts

🛠️  Available Tools:
  [1] Bash
      Description: Executes bash commands in a persistent shell session with optional timeout
  [2] Grep
      Description: Tool: Grep
  ...

📋 Full Request JSON:
{
  "model": "qwen-3-coder-480b",
  "messages": [...],
  "temperature": 0.7,
  "top_p": 0.8,
  "max_tokens": 100000,
  "tools": [...]
}

=== END REQUEST ===
```

#### Key Request Fields Logged:

1. **Timestamp**: When the request was made (ISO 8601 format)
2. **Model**: Which model is being used (e.g., `qwen-3-coder-480b`)
3. **Request Parameters**:
   - Temperature: Randomness control (0-1)
   - Top P: Nucleus sampling threshold
   - Max Tokens: Maximum response length
   - Message Count: Number of messages in conversation
   - Tool Count: Number of available tools

4. **Each Message**:
   - **Role**: `system`, `user`, `assistant`, or `tool`
   - **Content**: Message text (truncated to 200 chars for preview, full in JSON)
   - **Content Length**: Character count
   - **Tool Calls** (for assistant messages):
     - Count and details of tools being called
     - Tool ID, name, and arguments
   - **Tool Call ID** (for tool response messages):
     - Links tool response back to the original tool call

5. **Available Tools**: List of all tools the model can use
6. **Full JSON**: Complete request payload for detailed inspection

### 📥 Response Logging (After API Call)

The debug output shows detailed information about every response received from Cerebras:

```
📥 === CEREBRAS API RESPONSE ===
⏰ Timestamp: 2025-10-21T12:34:57.234Z
⏱️  Duration: 445 ms
💰 Cost: $ 0.000123
📊 Response Details:
  - ID: chatcmpl-abc123xyz
  - Model: qwen-3-coder-480b
  - Finish Reason: stop
  - Token Usage:
      Prompt: 1234
      Completion: 56
      Total: 1290

💬 Response Content:
  Text: I've found all the TypeScript files in the cli directory for you. Here's the complete list:

1. `cli/commands/agent.ts` - This file likely contains agent-related commands for the CLI
2. `cli/commands/completion.ts` - This file probably handles completion functionality...
  Length: 456 chars

🛠️  Tool Calls in Response: 0

📋 Full Response JSON:
{
  "id": "chatcmpl-abc123xyz",
  "model": "qwen-3-coder-480b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "...",
        "tool_calls": null
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 1234,
    "completion_tokens": 56,
    "total_tokens": 1290
  }
}

=== END RESPONSE ===
```

#### Key Response Fields Logged:

1. **Timestamp**: When the response was received
2. **Duration**: How long the API call took (milliseconds)
3. **Cost**: Estimated cost in USD (based on token usage)
4. **Response Metadata**:
   - **ID**: Unique identifier for this completion
   - **Model**: Model that generated the response
   - **Finish Reason**: Why generation stopped (`stop`, `length`, `tool_calls`, etc.)
   - **Token Usage**:
     - Prompt tokens: Input tokens consumed
     - Completion tokens: Output tokens generated
     - Total: Sum of prompt + completion

5. **Response Content**:
   - **Text**: The actual text response (truncated to 300 chars for preview)
   - **Length**: Character count
   - **Tool Calls** (if the model wants to use tools):
     - Count and details of tools being called
     - Tool ID, name, and arguments

6. **Full JSON**: Complete response payload for detailed inspection

### ❌ Error Logging (On Failure)

If an API call fails, detailed error information is logged:

```
❌ === CEREBRAS API ERROR ===
Error type: Error
Error message: 400 Bad Request
Status code: 400

📡 API Response:
  Status: 400
  Headers: {...}
  Data: {...}

🔍 Error details: {...}

📄 Response body: {"error": {"message": "Invalid request", "type": "invalid_request_error"}}

📊 Request summary:
  Model: qwen-3-coder-480b
  Messages: 4
  Tools: 9
  Temperature: 0.7
  Top P: 0.8
  Max tokens: 100000

=== FULL REQUEST DEBUG ===
API messages: [...]
API tools: [...]
=== END DEBUG ===
```

#### Error Information Logged:

1. **Error Type**: JavaScript error class name
2. **Error Message**: Human-readable error description
3. **Status Code**: HTTP status code (400, 401, 429, 500, etc.)
4. **API Response**: Raw response from server (if available)
5. **Error Details**: Structured error object
6. **Response Body**: Raw response text
7. **Request Summary**: Quick overview of what was sent
8. **Full Request**: Complete request that caused the error (for reproduction)

## Common Issues Diagnosed with Debug Logging

### Issue 1: 400 Bad Request - Empty Content

**Symptoms**:
- 400 status code
- Message: "Invalid request"

**Debug Output Shows**:
```
Message #3:
  Role: assistant
  Tool Calls: 1
  Content: <none>  ← PROBLEM: Content should have text or be omitted
```

**Solution**: Implemented in `llm/cerebras.ts:226-249`
- If assistant message has tool_calls, only include content field if there's actual text
- Empty/whitespace content is omitted entirely

### Issue 2: 400 Bad Request - Wrong Role for Tool Results

**Symptoms**:
- 400 status code after tool execution
- "Invalid request" error on second API call

**Debug Output Shows**:
```
Message #4:
  Role: user  ← PROBLEM: Should be "tool" not "user"
  Content: tool result data
```

**Solution**: Implemented in `llm/cerebras.ts:141-172`
- Tool results detected by `type: 'tool_result'` in content array
- Converted to `role: 'tool'` with `tool_call_id` field

### Issue 3: Empty Tool Output

**Symptoms**:
- Tool executes successfully but returns empty string
- Causes downstream 400 errors

**Debug Output Shows**:
```
Message #4:
  Role: tool
  Tool Call ID: abc123
  Content:   ← PROBLEM: Empty content
```

**Solution**: Implemented in `tools/bash.ts:81` and `core/agent.ts:232`
- Never return empty strings from tools
- Fallback: "Command executed successfully (no output)"

## Interpreting the Logs

### Normal Flow (Successful Request)

1. **First Request** (User message):
   - 1 system message
   - 1 user message
   - Response: Assistant message with tool_calls

2. **Second Request** (After tool execution):
   - 1 system message
   - 1 user message
   - 1 assistant message with tool_calls
   - 1+ tool messages (role: "tool", tool_call_id: "...")
   - Response: Assistant message with final answer (no tool_calls)

### Error Flow (400 Bad Request)

Look for these red flags in request logs:

1. **Empty/Null Content**:
   - `Content: <none>` when there should be text
   - `Content: ""` (empty string)
   - `Content: "   "` (whitespace only)

2. **Wrong Message Role**:
   - Tool results with `Role: user` instead of `Role: tool`
   - Missing `Tool Call ID` field for tool messages

3. **Invalid Tool Call Format**:
   - Missing `id` field
   - Missing `name` field
   - `arguments` is null or undefined

4. **Malformed JSON**:
   - Invalid JSON in tool call arguments
   - Unescaped quotes or special characters

## Performance Analysis with Debug Logs

### Token Usage Tracking

Monitor token consumption over time:
```bash
# Run query and capture debug output
ceregrep query "complex task" --debug 2>&1 | grep "Token Usage"
```

Output:
```
Token Usage:
    Prompt: 1234
    Completion: 567
    Total: 1801
```

### API Call Duration

Monitor response times:
```bash
ceregrep query "your prompt" --debug 2>&1 | grep "Duration"
```

Output:
```
⏱️  Duration: 1234 ms
```

### Cost Estimation

Track costs:
```bash
ceregrep query "your prompt" --debug 2>&1 | grep "Cost"
```

Output:
```
💰 Cost: $ 0.003608
```

## Log File Locations

Debug logs go to **stderr**, while normal output goes to **stdout**. This allows you to:

```bash
# Capture only debug logs
ceregrep query "prompt" --debug 2> debug.log

# Capture only normal output
ceregrep query "prompt" --debug 1> output.txt

# Capture both separately
ceregrep query "prompt" --debug 1> output.txt 2> debug.log

# Capture everything together
ceregrep query "prompt" --debug &> full_log.txt
```

## Related Files

- **llm/cerebras.ts**: Core logging implementation (lines 272-323, 341-381)
- **cli/index.ts**: `--debug` flag setup (lines 74-80, 599-604)
- **DEBUG.md**: Basic debug mode documentation
- **CEREBRAS_FIX.md**: Complete fix documentation with before/after examples

## Troubleshooting

### Debug Logs Not Appearing

1. Check that `--debug` flag is specified:
   ```bash
   ceregrep query "test" --debug
   ```

2. Or set environment variables manually:
   ```bash
   DEBUG_CEREBRAS=1 ceregrep query "test"
   ```

3. Check stderr output (logs go to stderr, not stdout):
   ```bash
   ceregrep query "test" --debug 2>&1
   ```

### Too Much Output

Filter to specific sections:
```bash
# Only show requests
ceregrep query "test" --debug 2>&1 | grep -A 50 "CEREBRAS API REQUEST"

# Only show responses
ceregrep query "test" --debug 2>&1 | grep -A 30 "CEREBRAS API RESPONSE"

# Only show errors
ceregrep query "test" --debug 2>&1 | grep -A 20 "CEREBRAS API ERROR"
```

### Analyzing Multiple Requests

When a query makes multiple API calls (e.g., tool use), count them:
```bash
ceregrep query "complex task" --debug 2>&1 | grep -c "CEREBRAS API REQUEST"
```

This shows how many round trips were needed.

## Summary

The enhanced debug logging provides complete visibility into:

✅ **Every request** sent to Cerebras API
✅ **Every response** received from Cerebras API
✅ **All errors** with detailed diagnostics
✅ **Token usage and costs** for each call
✅ **Message formatting** to catch issues early
✅ **Tool call/result flow** for debugging tool execution

This makes it trivial to diagnose issues like:
- Message formatting errors (empty content, wrong roles)
- Tool call/result mismatches
- Token limit issues
- Performance problems
- Cost tracking

Use `--debug` whenever you encounter issues or want to understand what's happening under the hood.
