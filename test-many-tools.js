import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const tools = [];
for (let i = 1; i <= 9; i++) {
  tools.push({
    type: 'function',
    function: {
      name: `Tool${i}`,
      description: `Tool ${i}`,
      parameters: {
        type: 'object',
        properties: { param: { type: 'string' } },
        required: ['param'],
        additionalProperties: false
      }
    }
  });
}

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
            name: 'Tool1',
            arguments: '{"param":"test"}'
          }
        }],
        content: 'Let me use Tool1.'
      },
      {
        role: 'tool',
        tool_call_id: 'test123',
        content: 'Result from tool1'
      }
    ],
    tools,
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 100000
  });

  console.log('Success with 9 tools!');
}

test().catch(err => {
  console.error('ERROR:', err.message, 'Status:', err.status);
});
