import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const req = JSON.parse(fs.readFileSync('/tmp/cerebras-request-4msg.json', 'utf8'));

const shortSystemPrompt = `You are a helpful AI assistant with access to bash and file search tools.

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

console.log('Testing with SHORT system prompt (ceregrep-style)...');
console.log('Short prompt length:', shortSystemPrompt.length);
console.log('Original prompt length:', req.messages[0].content.length);
console.log('');

// Clone and modify
const testReq = JSON.parse(JSON.stringify(req));
testReq.messages[0].content = shortSystemPrompt;

async function test() {
  try {
    const response = await client.chat.completions.create(testReq);
    console.log('✓ SUCCESS with short system prompt!');
    console.log('Response:', response.choices[0].message.content?.substring(0, 100));
  } catch (err) {
    console.log('✗ FAILED with short system prompt:', err.message);
    console.log('Status:', err.status);
  }
}

test();
