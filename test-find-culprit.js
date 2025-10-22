import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

async function test(args, description) {
  console.log(`\nTesting: ${description}`);
  console.log(`Arguments: ${args}`);
  
  try {
    const response = await client.chat.completions.create({
      model: 'qwen-3-coder-480b',
      messages: [
        { role: 'system', content: 'Test' },
        { role: 'user', content: 'test' },
        {
          role: 'assistant',
          tool_calls: [{
            id: 'test123',
            type: 'function',
            function: { name: 'Grep', arguments: args }
          }],
          content: 'Let me search.'
        },
        { role: 'tool', tool_call_id: 'test123', content: 'Found files' }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'Grep',
          description: 'Search',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string' },
              include: { type: 'string' }
            },
            required: ['pattern']
          }
        }
      }],
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 100000
    });
    console.log('✓ SUCCESS');
  } catch (err) {
    console.log('✗ FAILED:', err.message);
  }
}

async function main() {
  // Test different argument formats
  await test('{"pattern":"test"}', 'Simple pattern');
  await test('{"pattern":"test|other"}', 'Pattern with pipe');
  await test('{"pattern":"test\\\\.json"}', 'Pattern with escaped dot');
  await test('{"pattern":"description|README|package\\\\.json"}', 'Full failing pattern');
  await test('{"pattern":"description|README|package\\\\.json","include":"*.json"}', 'Full failing args');
}

main();
