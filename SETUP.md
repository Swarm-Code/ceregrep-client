# Ceregrep Client - Complete Setup Guide

## 🎉 What We Built

A modular, headless agent framework with **Cerebras Qwen 3 Coder 480B** support and multi-provider LLM integration.

## ✅ Features Implemented

- ✅ **Cerebras Integration**: OpenAI-compatible client for Cerebras API
- ✅ **Multi-Provider Support**: Seamlessly switch between Anthropic and Cerebras
- ✅ **Automatic Routing**: Config-based provider selection
- ✅ **Tool Calling**: Full function calling support for Cerebras
- ✅ **Optimized Settings**: temperature=0.7, top_p=0.8 (Cerebras recommended)
- ✅ **TypeScript SDK**: Programmatic access
- ✅ **CLI Interface**: Command-line usage
- ✅ **Example Configs**: Ready-to-use configuration files

## 📁 Project Structure

```
ceregrep-client/
├── llm/
│   ├── anthropic.ts      # Anthropic Claude client
│   ├── cerebras.ts       # 🆕 Cerebras client (OpenAI SDK)
│   └── router.ts         # 🆕 Multi-provider router
├── config/
│   ├── schema.ts         # 🆕 Updated with Cerebras settings
│   └── loader.ts         # Config file loader
├── sdk/typescript/
│   └── index.ts          # 🆕 Updated to use router
├── .ceregrep.example.json # 🆕 Cerebras config example
├── CEREBRAS_QUICKSTART.md # 🆕 Detailed guide
└── test-cerebras.ts      # 🆕 Test script
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /home/alejandro/Swarm/ceregrep/ceregrep-client
npm install
```

### 2. Create Configuration

Copy the example config:
```bash
cp .ceregrep.example.json .ceregrep.json
```

Then add your Cerebras API key:
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

### 3. Build the Project

```bash
npm run build
```

### 4. Test It!

#### Option A: Test Script
```bash
node dist/test-cerebras.js
```

#### Option B: CLI
```bash
./dist/cli/index.js query "List all TypeScript files"
./dist/cli/index.js list-tools
./dist/cli/index.js config
```

#### Option C: TypeScript SDK
```typescript
import { CeregrepClient } from './dist/sdk/typescript/index.js';

const client = new CeregrepClient();
await client.initialize();

const result = await client.query('Explain this codebase');
console.log(result);
```

## 🔧 Configuration Options

### Cerebras (Current Setup)
```json
{
  "model": "qwen-3-coder-480b",
  "provider": {
    "type": "cerebras",
    "apiKey": "csk-...",
    "baseURL": "https://api.cerebras.ai/v1",
    "temperature": 0.7,
    "top_p": 0.8
  }
}
```

### Anthropic (Alternative)
```json
{
  "model": "claude-sonnet-4-20250514",
  "provider": {
    "type": "anthropic"
  },
  "apiKey": "sk-ant-..."
}
```

### Switch Providers
Just change `provider.type` in `.ceregrep.json` - no code changes needed!

## 📊 Cerebras Model Specs

- **Model**: Qwen 3 Coder 480B (`qwen-3-coder-480b`)
- **Speed**: ~2000 tokens/sec
- **Context**: 64k (free), 128k (paid)
- **Pricing**: $2.00/M tokens (input + output)
- **Features**: Streaming, Tool Calling, Structured Outputs

## 🛠️ Available Tools

1. **Bash** - Execute shell commands
2. **Grep** - Search files with ripgrep
3. **MCP** - Connect external servers (optional)

## 📝 Example Queries

```bash
# Code analysis
./dist/cli/index.js query "Find all async functions and explain them"

# File operations
./dist/cli/index.js query "List all TypeScript files in src/"

# Search
./dist/cli/index.js query "Find TODO comments in the codebase"

# Refactoring suggestions
./dist/cli/index.js query "Analyze imports and suggest optimizations"
```

## 🔍 Debugging

Enable debug mode in `.ceregrep.json`:
```json
{
  "verbose": true,
  "debug": true
}
```

Or via CLI:
```bash
./dist/cli/index.js query "test" --verbose --debug
```

## 📚 Documentation

- **CEREBRAS_QUICKSTART.md** - Detailed Cerebras guide
- **README.md** - Full framework documentation
- **.ceregrep.example.json** - Config template

## 🎯 Next Steps

1. **Test the setup**: Run `npm run build && node dist/test-cerebras.js`
2. **Try CLI**: `./dist/cli/index.js query "Hello"`
3. **Explore tools**: `./dist/cli/index.js list-tools`
4. **Add MCP servers**: Configure in `.ceregrep.json`
5. **Build custom tools**: Implement `Tool` interface

## 💡 Tips

- **Rate Limits**: Free tier has 10 req/min, 150k input tokens/min
- **Context Window**: Use 64k on free tier, 128k on paid
- **Temperature**: 0.7 recommended for balanced creativity
- **Top-p**: 0.8 recommended for diverse responses
- **Streaming**: Supported (except with JSON mode + reasoning)

## 🆘 Troubleshooting

### Build Errors
```bash
rm -rf node_modules dist
npm install
npm run build
```

### API Key Not Found
Check `.ceregrep.json` exists and has `provider.apiKey` set.

### Tool Calling Issues
Cerebras doesn't support `strict: true`. Framework uses standard tool calling (fully supported).

### Module Resolution Errors
Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "node"
  }
}
```

## 🔗 Resources

- [Cerebras API Docs](https://inference-docs.cerebras.ai/)
- [Qwen 3 Coder Model](https://inference-docs.cerebras.ai/models)
- [OpenAI SDK Compatibility](https://inference-docs.cerebras.ai/api-reference/openai-compatibility)

---

**Ready to go!** 🚀 Your Cerebras-powered agent is configured and ready to use.
