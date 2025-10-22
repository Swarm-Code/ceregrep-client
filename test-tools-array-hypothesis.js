import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

async function test(description, modifications) {
  console.log(`\nTesting: ${description}`);
  const testRequest = JSON.parse(JSON.stringify(fullRequest));
  if (modifications) modifications(testRequest);

  try {
    await client.chat.completions.create(testRequest);
    console.log('✓ SUCCESS');
    return true;
  } catch (err) {
    console.log(`✗ FAILED: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('=== HYPOTHESIS: max_tokens + tools array on continuation causes 400 ===\n');

  // Test 1: Original (should fail)
  await test('Original (max_tokens=100000, tools included)', null);

  // Test 2: Remove tools array (keep max_tokens)
  await test('Remove tools array (max_tokens=100000)', req => {
    delete req.tools;
  });

  // Test 3: Lower max_tokens (keep tools array)
  await test('Lower max_tokens to 4096 (tools included)', req => {
    req.max_tokens = 4096;
  });

  // Test 4: Both changes
  await test('Remove tools + lower max_tokens to 4096', req => {
    delete req.tools;
    req.max_tokens = 4096;
  });

  console.log('\n=== CONCLUSION ===');
  console.log('If test 2 succeeds: tools array is the problem');
  console.log('If test 3 succeeds: max_tokens is the problem');
  console.log('If only test 4 succeeds: combination is the problem');
}

main();
