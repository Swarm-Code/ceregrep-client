import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const req = JSON.parse(fs.readFileSync('/tmp/cerebras-request-8msg.json', 'utf8'));

console.log('Testing request ending with tool message...');
console.log('Last message role:', req.messages[req.messages.length - 1].role);
console.log('Last message has tool_call_id:', !!req.messages[req.messages.length - 1].tool_call_id);

try {
  const response = await client.chat.completions.create(req);
  console.log('✓ SUCCESS!');
  console.log('Response:', response.choices[0].message.content?.substring(0, 200));
} catch (err) {
  console.log('✗ FAILED:', err.message);
  console.log('Status:', err.status);
  console.log('Type:', err.type);
}
