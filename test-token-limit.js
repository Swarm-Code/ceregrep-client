import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

// Calculate approximate tokens (rough estimate: 4 chars ≈ 1 token)
function estimateTokens(request) {
  const jsonStr = JSON.stringify(request);
  return Math.ceil(jsonStr.length / 4);
}

console.log('Estimated tokens in full request:', estimateTokens(fullRequest));
console.log('Max tokens requested:', fullRequest.max_tokens);
console.log('\nBreakdown:');
console.log('- System prompt:', Math.ceil(fullRequest.messages[0].content.length / 4), 'tokens');
console.log('- Tools array:', Math.ceil(JSON.stringify(fullRequest.tools).length / 4), 'tokens');
console.log('- Messages:', Math.ceil(JSON.stringify(fullRequest.messages).length / 4), 'tokens');

// Test without max_tokens
async function test(description, modifications) {
  console.log(`\nTesting: ${description}`);
  const testRequest = JSON.parse(JSON.stringify(fullRequest));
  if (modifications) modifications(testRequest);
  
  try {
    await client.chat.completions.create(testRequest);
    console.log('✓ SUCCESS');
  } catch (err) {
    console.log('✗ FAILED:', err.message);
  }
}

async function main() {
  await test('Original (max_tokens: 100000)', null);
  await test('Reduced max_tokens to 50000', req => { req.max_tokens = 50000; });
  await test('Reduced max_tokens to 10000', req => { req.max_tokens = 10000; });
  await test('Reduced max_tokens to 5000', req => { req.max_tokens = 5000; });
  await test('Reduced max_tokens to 1000', req => { req.max_tokens = 1000; });
}

main();
