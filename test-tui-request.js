import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const req = JSON.parse(fs.readFileSync('/tmp/cerebras-request-4msg.json', 'utf8'));

console.log('Testing TUI request...');
console.log('Messages:', req.messages.length);
console.log('Max tokens:', req.max_tokens);
console.log('Has tools:', !!req.tools);

try {
  const response = await client.chat.completions.create(req);
  console.log('✓ SUCCESS!');
  console.log('Response:', response.choices[0].message.content?.substring(0, 100));
} catch (err) {
  console.log('✗ FAILED:', err.message);
  console.log('Status:', err.status);
}
