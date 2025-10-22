import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

async function test(maxTokens) {
  const testRequest = JSON.parse(JSON.stringify(fullRequest));
  testRequest.max_tokens = maxTokens;
  
  try {
    await client.chat.completions.create(testRequest);
    console.log(`max_tokens=${maxTokens}: ✓ SUCCESS`);
  } catch (err) {
    console.log(`max_tokens=${maxTokens}: ✗ FAILED (${err.message})`);
  }
}

async function main() {
  await test(4096); // Standard OpenAI limit
  await test(8192);
  await test(16384);
  await test(32768);
  await test(65536);
  await test(100000);
}

main();
