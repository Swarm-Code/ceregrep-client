import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));

const cliSystemPrompt = `You are a helpful AI assistant with access to bash and file search tools.

Use the tools available to help the user accomplish their tasks.



CRITICAL INSTRUCTION - CONTEXT AND EXPLANATION REQUIREMENTS:

- Give as much context as possible in your responses. It is ALWAYS better to add too much context than too little.

- Use file references with line numbers in the format: filename.ts:123 or path/to/file.py:456

- Explain everything in an ultra explanatory tone, assuming the user needs complete understanding.

- Include specific details: function names, variable names, code snippets, file paths with line numbers.

- When referencing code, ALWAYS include the file path and line number where it can be found.

- Provide thorough explanations of how things work, why they work that way, and what each piece does.

- Word for word: "Better to add too much context than necessary" - follow this principle strictly.



CRITICAL INSTRUCTION - MUST USE TOOLS TO GATHER INFORMATION:

- You MUST use grep to search for information before answering questions about code.

- You CANNOT rely on stored context or prior knowledge about the codebase.

- Everything must be read using tools before giving an explanation.

- This is to ensure that you do not lazily answer questions without verifying current state.

- Always grep for relevant files, read the actual code, and then provide your explanation.

- Never answer based solely on assumptions or memory - always verify with tools first.`;

async function test(description, systemPrompt) {
  console.log(`\nTesting: ${description}`);
  const testRequest = JSON.parse(JSON.stringify(fullRequest));
  testRequest.messages[0].content = systemPrompt;
  
  try {
    await client.chat.completions.create(testRequest);
    console.log('✓ SUCCESS');
  } catch (err) {
    console.log('✗ FAILED:', err.message);
  }
}

await test('With TUI system prompt (original, should fail)', fullRequest.messages[0].content);
await test('With CLI system prompt (no mode prompts)', cliSystemPrompt);
