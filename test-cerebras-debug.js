import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

async function test() {
  // Exact recreation of failing request
  const response2 = await client.chat.completions.create({
    model: 'qwen-3-coder-480b',
    messages: [
      {
        role: 'system',
        content: '# Test system prompt\n\nYou are a helpful assistant.'
      },
      {
        role: 'user',
        content: 'what is this project about'
      },
      {
        role: 'assistant',
        tool_calls: [{
          id: '2e9be866d',
          type: 'function',
          function: {
            name: 'Grep',
            arguments: '{"pattern":"description|README","path":"."}'
          }
        }],
        content: "I'll help you understand what this project is about. Let me gather some information by examining the codebase structure and key files."
      },
      {
        role: 'tool',
        tool_call_id: '2e9be866d',
        content: 'Found 118 files\n/some/file/path\n...'
      }
    ],
    tools: [{
      type: 'function',
      function: {
        name: 'Grep',
        description: 'Tool: Grep',
        parameters: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Pattern to search' }
          },
          required: ['pattern']
        }
      }
    }],
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 100000
  });

  console.log('Success!', JSON.stringify(response2, null, 2));
}

test().catch(err => {
  console.error('ERROR:', err.message);
  console.error('Status:', err.status);
});
