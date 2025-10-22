import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const request = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

async function test() {
  console.log('Testing exact failing request...');
  const response = await client.chat.completions.create(request);
  console.log('SUCCESS!', response.choices[0].message.content?.substring(0, 100));
}

test().catch(err => {
  console.error('FAILED:', err.message, 'Status:', err.status);
});
