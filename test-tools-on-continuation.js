import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const req = JSON.parse(fs.readFileSync('/tmp/cerebras-request-8msg.json', 'utf8'));

console.log('Testing with tools array on continuation...');
console.log('Last message:', req.messages[req.messages.length - 1].role);
console.log('Has tools array:', !!req.tools);
console.log('Tools count:', req.tools?.length);

async function test(description, hasTools) {
  console.log(`\n${description}`);
  const testReq = JSON.parse(JSON.stringify(req));
  if (!hasTools) {
    delete testReq.tools;
  }
  
  try {
    const response = await client.chat.completions.create(testReq);
    console.log('✓ SUCCESS!');
  } catch (err) {
    console.log('✗ FAILED:', err.message, '- Status:', err.status);
  }
}

await test('WITH tools array', true);
await test('WITHOUT tools array', false);
