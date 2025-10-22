import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

async function test() {
  const req = {
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
        content: 'Let me search for that.'
      },
      {
        role: 'tool',
        tool_call_id: 'test123',
        content: 'Found 5 files'
      }
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'Grep',
        description: 'Search tool',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string' }
          },
          required: ['pattern'],
          additionalProperties: false
        }
      }
    }],
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 100000
  };

  console.log('Request:', JSON.stringify(req, null, 2));
  const response = await client.chat.completions.create(req);
  console.log('Success!', response.choices[0].message.content);
}

test().catch(err => {
  console.error('ERROR:', err.message, 'Status:', err.status);
});
