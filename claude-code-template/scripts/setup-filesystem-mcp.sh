#!/bin/bash

# Setup script to add filesystem MCP server to swarm config

echo "Setting up MCP filesystem server for swarm..."

# Create .swarmrc file in project root if it doesn't exist
if [ ! -f ".swarmrc" ]; then
  echo "{}" > .swarmrc
fi

# Add the filesystem server config using node
node -e "
const fs = require('fs');
const path = require('path');

const configPath = '.swarmrc';
let config = {};

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  // File doesn't exist or is invalid JSON
}

// Initialize mcpServers if it doesn't exist
if (!config.mcpServers) {
  config.mcpServers = {};
}

// Add filesystem server
config.mcpServers.filesystem = {
  command: 'npx',
  args: [
    '-y',
    '@modelcontextprotocol/server-filesystem',
    process.cwd()
  ],
  type: 'stdio'
};

// Write back the config
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('✓ Filesystem MCP server added to .swarmrc');
console.log('  Allowed directory:', process.cwd());
console.log('');
console.log('You can now use @ mentions in swarm to reference files!');
console.log('Example: @README.md or @src/index.ts');
"