import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

async function test(description, systemPrompt) {
  console.log(`\nTesting: ${description} (length: ${systemPrompt.length})`);
  const testRequest = JSON.parse(JSON.stringify(fullRequest));
  testRequest.messages[0].content = systemPrompt;
  
  try {
    const response = await client.chat.completions.create(testRequest);
    console.log('✓ SUCCESS');
    return true;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    return false;
  }
}

const originalPrompt = fullRequest.messages[0].content;

async function main() {
  // Binary search for the problematic length/content
  await test('Original (should fail)', originalPrompt);
  await test('First half', originalPrompt.substring(0, originalPrompt.length / 2));
  await test('Second half', originalPrompt.substring(originalPrompt.length / 2));
  await test('First 500 chars', originalPrompt.substring(0, 500));
  await test('First 1000 chars', originalPrompt.substring(0, 1000));
  await test('First 1500 chars', originalPrompt.substring(0, 1500));
  await test('First 2000 chars', originalPrompt.substring(0, 2000));
  await test('First 2500 chars', originalPrompt.substring(0, 2500));
}

main();
