#!/bin/bash

# Cerebras MITM Proxy Starter Script

echo "Starting Cerebras MITM Proxy Router..."
echo "========================================"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Clear old logs if requested
if [ "$1" == "--clear-logs" ]; then
    echo "Clearing old logs..."
    rm -rf logs/*
fi

# Start the proxy
echo ""
echo "Starting proxy server on http://localhost:8080"
echo "Logs will be saved to: ./logs/"
echo ""
echo "To use this proxy, update ~/.ceregrep.json:"
echo '  "baseURL": "http://localhost:8080/v1"'
echo ""
echo "Press Ctrl+C to stop the proxy"
echo "========================================"
echo ""

node cerebras-proxy.js