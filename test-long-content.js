import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const longContent = 'Found 118 files\n' + '/home/user/file'.repeat(400); // Make it ~7000+ chars

async function test() {
  const response = await client.chat.completions.create({
    model: 'qwen-3-coder-480b',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user',
        content: 'test'
      },
      {
        role: 'assistant',
        tool_calls: [{
          id: 'test123',
          type: 'function',
          function: {
            name: 'Grep',
            arguments: '{"pattern":"test"}'
          }
        }],
        content: 'Let me search.'
      },
      {
        role: 'tool',
        tool_call_id: 'test123',
        content: longContent
      }
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'Grep',
        description: 'Search',
        parameters: {
          type: 'object',
          properties: { pattern: { type: 'string' } },
          required: ['pattern'],
          additionalProperties: false
        }
      }
    }],
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 100000
  });

  console.log('Success with long content! Length:', longContent.length);
}

test().catch(err => {
  console.error('ERROR:', err.message, 'Status:', err.status);
});
