#!/usr/bin/env node

// Test filesystem resource provider directly
// We need to compile TypeScript first, so let's test via the actual swarm build
import { execSync } from 'child_process'

// Set working directory
setCwd(process.cwd())

async function test() {
  const provider = new FilesystemResourceProvider()

  console.log('Initializing filesystem provider...')
  await provider.initialize()

  const resources = provider.getResources()
  console.log(`\nFound ${resources.length} resources in ${getCwd()}`)

  if (resources.length > 0) {
    console.log('\nFirst 10 resources:')
    resources.slice(0, 10).forEach(r => {
      console.log(`  - ${r.uri} (${r.name}) [${r.mimeType}]`)
    })

    // Test reading a resource
    const firstTextFile = resources.find(r => r.mimeType.startsWith('text/'))
    if (firstTextFile) {
      console.log(`\nReading ${firstTextFile.uri}...`)
      const content = await provider.readResource(firstTextFile.uri)
      if (content?.text) {
        console.log(`Content preview (first 200 chars):`)
        console.log(content.text.substring(0, 200) + '...')
      }
    }
  }
}

test().catch(console.error)