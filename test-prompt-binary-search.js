import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: 'https://api.cerebras.ai/v1'
});

const fullRequest = JSON.parse(fs.readFileSync('/tmp/failing-cerebras-request.json', 'utf8'));
const tuiPrompt = fullRequest.messages[0].content;

const cliPrompt = `You are a helpful AI assistant with access to bash and file search tools.

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

// Split TUI prompt into lines
const tuiLines = tuiPrompt.split('\n\n');
console.log(`TUI prompt has ${tuiLines.length} sections (split by \\n\\n)`);

async function test(promptContent) {
  const testRequest = JSON.parse(JSON.stringify(fullRequest));
  testRequest.messages[0].content = promptContent;

  try {
    await client.chat.completions.create(testRequest);
    return true;
  } catch (err) {
    return false;
  }
}

async function binarySearch() {
  console.log('\n=== Binary Search for Problematic Section ===\n');

  // First confirm CLI works and full TUI fails
  console.log('Baseline checks:');
  const cliWorks = await test(cliPrompt);
  console.log(`CLI prompt: ${cliWorks ? '✓ WORKS' : '✗ FAILS'}`);

  const tuiWorks = await test(tuiPrompt);
  console.log(`Full TUI prompt: ${tuiWorks ? '✓ WORKS' : '✗ FAILS'}`);

  if (cliWorks && !tuiWorks) {
    console.log('\n✓ Confirmed: CLI works, TUI fails. Starting binary search...\n');
  } else {
    console.log('\n⚠️  Unexpected: Expected CLI to work and TUI to fail');
    return;
  }

  // Binary search
  let left = 0;
  let right = tuiLines.length;
  let firstBadIndex = -1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const testPrompt = cliPrompt + '\n\n' + tuiLines.slice(0, mid + 1).join('\n\n');

    const works = await test(testPrompt);
    console.log(`Testing sections [0..${mid}]: ${works ? '✓ WORKS' : '✗ FAILS'}`);

    if (works) {
      // Works with sections 0..mid, problem is after mid
      left = mid + 1;
    } else {
      // Fails with sections 0..mid, problem is at or before mid
      firstBadIndex = mid;
      right = mid;
    }
  }

  if (firstBadIndex >= 0) {
    console.log(`\n🎯 Found problematic section at index ${firstBadIndex}:`);
    console.log('─'.repeat(80));
    console.log(tuiLines[firstBadIndex]);
    console.log('─'.repeat(80));

    // Verify by testing with and without this section
    console.log('\nVerification:');
    const withoutBad = cliPrompt + '\n\n' + tuiLines.filter((_, i) => i !== firstBadIndex).join('\n\n');
    const withBad = cliPrompt + '\n\n' + tuiLines.slice(0, firstBadIndex + 1).join('\n\n');

    const withoutWorks = await test(withoutBad);
    const withFails = await test(withBad);

    console.log(`Without section ${firstBadIndex}: ${withoutWorks ? '✓ WORKS' : '✗ FAILS'}`);
    console.log(`With section ${firstBadIndex}: ${withFails ? '✗ FAILS' : '✓ WORKS'}`);
  } else {
    console.log('\n⚠️  Could not isolate a single problematic section');
  }
}

binarySearch();
