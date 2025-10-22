import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const request = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

console.log('Testing saved failing request...');
console.log('Has max_tokens:', 'max_tokens' in request);
console.log('Messages:', request.messages.length);
console.log('Tools:', request.tools?.length || 0);

try {
  const response = await client.chat.completions.create(request);
  console.log('✓ SUCCESS!');
  console.log('Response:', response.choices[0].message.content);
} catch (err) {
  console.log('✗ FAILED:', err.message);
  console.log('Status:', err.status);
}
