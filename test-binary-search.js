import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));
const originalPrompt = fullRequest.messages[0].content;

async function test(length) {
  const testRequest = JSON.parse(JSON.stringify(fullRequest));
  testRequest.messages[0].content = originalPrompt.substring(0, length);
  
  try {
    await client.chat.completions.create(testRequest);
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log('Testing specific lengths...');
  
  // Test around boundaries
  for (let len = 1; len <= 100; len += 10) {
    const ok = await test(len);
    console.log('Length', len + ':', ok ? '✓' : '✗');
  }
}

main();
