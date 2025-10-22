#!/bin/bash
echo "Testing Cerebras API with tool result fix..."
echo ""
echo "Running: ceregrep query 'what is this project about' --debug"
echo ""
./dist/cli/index.js query "what is this project about" --debug 2>&1 | head -100
