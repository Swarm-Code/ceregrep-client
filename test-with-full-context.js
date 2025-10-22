import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

async function test(description, modifications) {
  console.log(`\nTesting: ${description}`);
  const testRequest = JSON.parse(JSON.stringify(fullRequest)); // Deep copy
  if (modifications) modifications(testRequest);
  
  try {
    const response = await client.chat.completions.create(testRequest);
    console.log('✓ SUCCESS');
    return true;
  } catch (err) {
    console.log('✗ FAILED:', err.message);
    return false;
  }
}

async function main() {
  // Test with modifications to isolate the issue
  await test('Original full request (should fail)', null);
  await test('Without tools array', req => { delete req.tools; });
  await test('With only 1 tool', req => { req.tools = [req.tools[0]]; });
  await test('With short system prompt', req => { req.messages[0].content = 'You are a helpful assistant.'; });
  await test('Without git status in system prompt', req => { 
    req.messages[0].content = req.messages[0].content.split('## Background Context:')[0]; 
  });
}

main();
