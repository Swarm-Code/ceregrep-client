import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

async function test(description, systemPrompt) {
  console.log(`\nTesting: ${description}`);
  const testRequest = JSON.parse(JSON.stringify(fullRequest));
  testRequest.messages[0].content = systemPrompt;
  
  try {
    await client.chat.completions.create(testRequest);
    console.log('✓ SUCCESS');
    return true;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    return false;
  }
}

async function main() {
  await test('With # heading', '# ENVIRONMENT: TEST\n\nYou are a helpful assistant.');
  await test('Without # heading', 'ENVIRONMENT: TEST\n\nYou are a helpful assistant.');
  await test('With ## heading', '## ENVIRONMENT: TEST\n\nYou are a helpful assistant.');
  await test('Simple text', 'You are a helpful assistant.');
}

main();
