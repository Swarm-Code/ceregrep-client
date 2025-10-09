# Quick Command Reference

## 🏃 Getting Started

```bash
# One-command setup
./GET_STARTED.sh

# Or step-by-step:
npm install
cp .ceregrep.example.json .ceregrep.json
npm run build
node dist/test-cerebras.js
```

## 🛠️ Build Commands

```bash
# Build project
npm run build

# Watch mode (rebuild on changes)
npm run dev

# Clean build
npm run clean && npm run build
```

## 💻 CLI Commands

```bash
# Query the agent
./dist/cli/index.js query "Your question here"

# List available tools
./dist/cli/index.js list-tools

# Show configuration
./dist/cli/index.js config

# With options
./dist/cli/index.js query "test" --verbose --debug
```

## 🧪 Testing

```bash
# Test Cerebras integration
node dist/test-cerebras.js

# Test from TypeScript
node -e "import('./dist/sdk/typescript/index.js').then(async m => {
  const client = new m.CeregrepClient();
  const result = await client.query('Hello');
  console.log(result);
})"
```

## 📝 Configuration

```bash
# View current config
cat .ceregrep.json

# Edit config
nano .ceregrep.json

# Use example as template
cp .ceregrep.example.json .ceregrep.json
```

## 🔄 Switch Providers

### Use Cerebras (Current)
```json
{
  "model": "qwen-3-coder-480b",
  "provider": {
    "type": "cerebras",
    "apiKey": "csk-..."
  }
}
```

### Use Anthropic
```json
{
  "model": "claude-sonnet-4-20250514",
  "provider": {
    "type": "anthropic"
  },
  "apiKey": "sk-ant-..."
}
```

## 📊 Example Queries

```bash
# Code analysis
./dist/cli/index.js query "Find all async functions"

# File operations
./dist/cli/index.js query "List all .ts files in src/"

# Search patterns
./dist/cli/index.js query "Search for TODO comments"

# Architecture questions
./dist/cli/index.js query "Explain the structure of this codebase"
```

## 🔍 Debugging

```bash
# Enable verbose output
./dist/cli/index.js query "test" --verbose

# Enable debug mode
./dist/cli/index.js query "test" --debug

# Check logs
tail -f debug-*.log
```

## 📦 Package Management

```bash
# Install all dependencies
npm install

# Add a new dependency
npm install package-name

# Update dependencies
npm update
```

## 🌐 Environment Variables

```bash
# Set Cerebras API key
export CEREBRAS_API_KEY=csk-your-key

# Set Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-your-key

# Use in command
CEREBRAS_API_KEY=csk-... ./dist/cli/index.js query "test"
```

## 📁 File Structure

```bash
# Show project structure
find . -type f -name "*.ts" | head -20

# Count files
find . -type f \( -name "*.ts" -o -name "*.json" \) ! -path "./node_modules/*" | wc -l

# List tools
ls -la tools/
```

## 🚀 Quick Tasks

```bash
# Fresh install
rm -rf node_modules dist && npm install && npm run build

# Test everything
npm run build && node dist/test-cerebras.js

# Show all available commands
./dist/cli/index.js --help

# Get version
./dist/cli/index.js --version
```
