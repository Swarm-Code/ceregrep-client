import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

async function test() {
  // First request - with tools
  console.log('=== REQUEST 1: Initial query with tools ===');
  const response1 = await client.chat.completions.create({
    model: 'qwen-3-coder-480b',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is 2+2?' }
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Perform a calculation',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string' }
          },
          required: ['expression']
        }
      }
    }],
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 1000
  });

  console.log('Response 1:', JSON.stringify(response1, null, 2));

  // Check if tool was called
  if (response1.choices[0].message.tool_calls) {
    const toolCall = response1.choices[0].message.tool_calls[0];
    console.log('\n=== REQUEST 2: After tool execution ===');
    
    // Second request - with tool result
    const response2 = await client.chat.completions.create({
      model: 'qwen-3-coder-480b',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 2+2?' },
        { 
          role: 'assistant',
          content: response1.choices[0].message.content,
          tool_calls: response1.choices[0].message.tool_calls
        },
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: '4'
        }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'calculate',
          description: 'Perform a calculation',
          parameters: {
            type: 'object',
            properties: {
              expression: { type: 'string' }
            },
            required: ['expression']
          }
        }
      }],
      temperature: 0.7,
      top_p: 0.8,
      max_tokens: 1000
    });

    console.log('Response 2:', JSON.stringify(response2, null, 2));
  }
}

test().catch(err => {
  console.error('ERROR:', err.message);
  console.error('Status:', err.status);
  console.error('Full error:', err);
});
