/**
 * Quick test script for Cerebras integration
 * Run with: npm run build && node dist/test-cerebras.js
 */

import { CeregrepClient } from './sdk/typescript/index.js';

async function main() {
  console.log('🧠 Testing Cerebras Qwen 3 Coder 480B...\n');

  const client = new CeregrepClient({
    model: 'qwen-3-coder-480b',
    verbose: true,
    debug: false,
  });

  console.log('Initializing client...');
  await client.initialize();
  console.log('✓ Client initialized\n');

  console.log('Querying agent with: "List all TypeScript files in the current directory"\n');

  try {
    const result = await client.query(
      'List all TypeScript files in the current directory'
    );

    console.log('\n=== Agent Response ===\n');

    for (const msg of result.messages) {
      if (msg.type === 'assistant') {
        const textContent = (msg as any).message.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');

        if (textContent) {
          console.log(textContent);
        }
      }
    }

    console.log(`\n📊 Messages: ${result.messages.length}`);
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
