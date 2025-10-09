#!/bin/bash
# Ceregrep Client - Quick Start Script
# Run this to get up and running with Cerebras

set -e

echo "🚀 Ceregrep Client - Cerebras Setup"
echo "===================================="
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 2: Create config file
echo "⚙️  Step 2: Creating configuration..."
if [ ! -f .ceregrep.json ]; then
    cp .ceregrep.example.json .ceregrep.json
    echo "✓ Created .ceregrep.json with your Cerebras API key"
else
    echo "⚠️  .ceregrep.json already exists, keeping it"
fi
echo ""

# Step 3: Build project
echo "🔨 Step 3: Building project..."
npm run build
echo "✓ Project built successfully"
echo ""

# Step 4: Test
echo "🧪 Step 4: Running test..."
echo ""
echo "Testing Cerebras Qwen 3 Coder 480B..."
echo "Query: 'List all TypeScript files in the current directory'"
echo ""
node dist/test-cerebras.js
echo ""

# Success!
echo "================================================"
echo "✅ Setup complete!"
echo ""
echo "Try these commands:"
echo ""
echo "  CLI:"
echo "    ./dist/cli/index.js query \"Find TODO comments\""
echo "    ./dist/cli/index.js list-tools"
echo "    ./dist/cli/index.js config"
echo ""
echo "  Test Script:"
echo "    node dist/test-cerebras.js"
echo ""
echo "  TypeScript SDK:"
echo "    See CEREBRAS_QUICKSTART.md for examples"
echo ""
echo "📚 Documentation:"
echo "  - SETUP.md - Complete setup guide"
echo "  - CEREBRAS_QUICKSTART.md - Cerebras-specific guide"
echo "  - README.md - Full documentation"
echo ""
echo "🎉 Happy coding with Cerebras Qwen 3 Coder 480B!"
