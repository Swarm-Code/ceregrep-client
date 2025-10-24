#!/usr/bin/env node

import { addMcpServer } from '../services/mcpClient.js'
import { getCwd } from '../utils/state.js'

// Add filesystem MCP server with current directory as allowed path
const serverConfig = {
  command: 'npx',
  args: [
    '-y',
    '@modelcontextprotocol/server-filesystem',
    getCwd() // Allow access to current working directory
  ],
  type: 'stdio',
}

console.log('Adding MCP filesystem server with access to:', getCwd())

try {
  addMcpServer('filesystem', serverConfig, 'project')
  console.log('✓ Filesystem server added successfully')
  console.log('You can now use @ mentions to reference files in your project')
} catch (error) {
  console.error('Failed to add filesystem server:', error)
  process.exit(1)
}