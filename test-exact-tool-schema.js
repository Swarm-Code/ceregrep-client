import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

// Exact tool schema from our failing request
const tools = [
  {
    type: 'function',
    function: {
      name: 'Bash',
      description: 'Tool: Bash',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command to execute'
          },
          timeout: {
            type: 'number',
            description: 'Optional timeout in milliseconds (max 600000)'
          }
        },
        required: ['command'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'Grep',
      description: 'Tool: Grep',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The regular expression pattern to search for in file contents'
          },
          path: {
            type: 'string',
            description: 'The directory to search in. Defaults to the current working directory.'
          },
          include: {
            type: 'string',
            description: 'File pattern to include in the search (e.g. "*.ts", "*.{ts,tsx}")'
          }
        },
        required: ['pattern'],
        additionalProperties: false
      }
    }
  }
];

async function test() {
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
          function: { name: 'Grep', arguments: '{"pattern":"test"}' }
        }],
        content: 'Let me search.'
      },
      { role: 'tool', tool_call_id: 'test123', content: 'Found files' }
    ],
    tools,
    temperature: 0.7,
    top_p: 0.8,
    max_tokens: 100000
  });

  console.log('Success with exact tool schemas!');
}

test().catch(err => {
  console.error('ERROR:', err.message, 'Status:', err.status);
});
