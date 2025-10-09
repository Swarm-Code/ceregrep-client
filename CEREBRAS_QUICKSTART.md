# Cerebras Quick Start Guide

This guide shows how to use Ceregrep Client with Cerebras' Qwen 3 Coder 480B model.

## Why Cerebras?

- **Ultra-fast inference**: ~2000 tokens/sec
- **Large context**: 128k tokens (paid tier)
- **Specialized for coding**: Optimized for agentic code generation
- **Cost-effective**: $2/M tokens (both input and output)
- **Tool calling support**: Full function calling capabilities

## Setup

### 1. Install Dependencies

```bash
cd ceregrep-client
npm install
```

### 2. Configure for Cerebras

Create a `.ceregrep.json` file in your project root:

```json
{
  "model": "qwen-3-coder-480b",
  "provider": {
    "type": "cerebras",
    "apiKey": "your-cerebras-api-key-here",
    "baseURL": "https://api.cerebras.ai/v1",
    "temperature": 0.7,
    "top_p": 0.8
  },
  "verbose": true,
  "debug": false
}
```

Or set via environment variable:

```bash
export CEREBRAS_API_KEY=your-cerebras-api-key-here
```

### 3. Build the Project

```bash
npm run build
```

## Usage Examples

### CLI

```bash
# Simple query
./dist/cli/index.js query "List all TypeScript files in the src directory"

# With verbose output
./dist/cli/index.js query "Search for TODO comments in the codebase" --verbose

# Check configuration
./dist/cli/index.js config
```

### TypeScript SDK

```typescript
import { CeregrepClient } from '@ceregrep/client';

// Initialize client (automatically uses config from .ceregrep.json)
const client = new CeregrepClient({
  verbose: true,
});

// Query the agent
const result = await client.query(
  'Find all functions that use async/await in this codebase'
);

// Print results
for (const msg of result.messages) {
  if (msg.type === 'assistant') {
    const textContent = msg.message.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
    console.log(textContent);
  }
}

console.log(`\nTotal cost: $${result.totalCost.toFixed(4)}`);
```

### Programmatic Configuration

```typescript
import { CeregrepClient } from '@ceregrep/client';

const client = new CeregrepClient({
  model: 'qwen-3-coder-480b',
  apiKey: 'csk-your-api-key',
  verbose: true,
});

const result = await client.query('Explain the architecture of this codebase');
```

## Model Specifications

- **Model ID**: `qwen-3-coder-480b`
- **Context Length**: 64k (free), 128k (paid)
- **Speed**: ~2000 tokens/sec
- **Pricing**: $2.00 per million tokens (both input and output)
- **Recommended Settings**:
  - `temperature: 0.7`
  - `top_p: 0.8`

## Available Tools

The agent has access to:

1. **Bash Tool**: Execute shell commands
   ```
   - List files: ls
   - Search: grep
   - Git operations: git status, git diff
   - Build: npm run build
   ```

2. **Grep Tool**: Search for patterns in files
   ```
   - Pattern: any regex
   - Include: file patterns like "*.ts", "*.{js,jsx}"
   - Path: specific directory or current directory
   ```

3. **MCP Tools**: Any configured MCP servers (optional)

## Example Queries

```bash
# Code analysis
"Find all async functions and explain what they do"

# Refactoring
"Search for all console.log statements and suggest using a proper logger"

# Documentation
"List all exported functions in src/ and generate JSDoc comments"

# Debugging
"Find files that import lodash and check if they can use native methods instead"

# Architecture
"Analyze the dependency graph between modules in src/"
```

## Rate Limits (Free Tier)

- Requests/min: 10
- Input tokens/min: 150k
- Output tokens/request: 8k
- Daily tokens: 1M

For higher limits, see [Cerebras Pricing](https://www.cerebras.ai/pricing).

## Troubleshooting

### Error: CEREBRAS_API_KEY is not set

Make sure you've either:
1. Set `provider.apiKey` in `.ceregrep.json`, or
2. Exported `CEREBRAS_API_KEY` environment variable

### Error: Tool calling failed

Cerebras does not support `strict: true` for tool calling. The framework uses standard tool calling by default, which is fully supported.

### Slow responses

Check your rate limits. Free tier has 10 requests/min. Upgrade for higher limits.

## Next Steps

- Add MCP servers for extended functionality
- Create custom tools for your specific use case
- Integrate into your CI/CD pipeline
- Use the Python SDK (coming soon)

## Resources

- [Cerebras API Docs](https://inference-docs.cerebras.ai/)
- [Qwen 3 Coder Model Card](https://inference-docs.cerebras.ai/models)
- [Ceregrep GitHub](https://github.com/your-org/ceregrep-client)
