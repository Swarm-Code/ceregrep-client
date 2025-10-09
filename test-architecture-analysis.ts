#!/usr/bin/env node
/**
 * Test: Agent analyzes its own architecture
 */

import { CeregrepClient } from './sdk/typescript/index.js';

async function main() {
  console.log('🧠 Agent Self-Analysis Test...\n');

  const client = new CeregrepClient({
    model: 'qwen-3-coder-480b',
    verbose: true,
  });

  await client.initialize();
  console.log('✓ Client initialized\n');

  const query = `Analyze the architecture of this ceregrep-client codebase.

Please examine the following and provide a comprehensive analysis:

1. Core Architecture: How does the agent execution loop work (core/agent.ts)?
2. Tool System: How are tools defined, registered, and executed?
3. LLM Integration: How does the multi-provider system work (Anthropic vs Cerebras)?
4. Message Flow: How do messages flow through the system from user input to LLM response?
5. Key Design Patterns: What patterns are used (generators, recursive loops, etc.)?

Use the Bash and Grep tools to explore the codebase and provide detailed insights.`;

  console.log('Querying agent with architecture analysis request...\n');

  const result = await client.query(query);

  console.log('\n=== Agent Architecture Analysis ===\n');

  const lastAssistantMessage = result.messages
    .filter(m => m.type === 'assistant')
    .pop();

  if (lastAssistantMessage && lastAssistantMessage.type === 'assistant') {
    const textContent = lastAssistantMessage.message.content
      .filter(c => c.type === 'text')
      .map(c => (c as any).text)
      .join('\n');

    console.log(textContent);
  }

  console.log(`\n📊 Messages: ${result.messages.length}`);

  console.log('\n✅ Architecture analysis completed!');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
