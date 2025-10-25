/**
 * Specialized compression section extractors
 * Each function extracts a specific category of information using a focused prompt
 * All functions execute in parallel for faster compression
 */

import { AssistantMessage, Message } from '../core/messages.js';

export interface CompressionSection {
  title: string;
  content: string;
}

/**
 * Extract technical architecture and environment details
 */
export async function extractTechnicalContext(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection> {
  const prompt = `From the conversation history, extract and summarize:

## Technical Architecture & Environment
- Development environment (OS, runtime, versions)
- Technology stack (languages, frameworks, libraries with versions)
- Project structure and directory organization
- Key configuration files and their settings
- Build system and compilation setup
- Deployment targets and environment variables
- System dependencies and required tools

Be specific with versions, paths, and configuration details. Include exact file names and settings.`;

  const response = await querySonnetFn(messages, [prompt], 0, [], new AbortController().signal, options);

  return {
    title: '## Technical Context',
    content: extractTextFromResponse(response),
  };
}

/**
 * Extract code changes with file paths and line numbers
 */
export async function extractCodeChanges(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection> {
  const prompt = `From the conversation history, extract and summarize:

## Code Changes & Modifications
- Files created: full path, initial structure, purpose
- Files modified: path, line numbers, what changed specifically
- Code deleted: what was removed and why
- Refactoring performed: before and after structure
- Include actual code snippets for major changes
- Function signatures and implementations
- Export statements and public APIs
- Include file paths in format: filename.ts:123

For each file, provide the complete path from project root.`;

  const response = await querySonnetFn(messages, [prompt], 0, [], new AbortController().signal, options);

  return {
    title: '## Code Changes & Modifications',
    content: extractTextFromResponse(response),
  };
}

/**
 * Extract debugging information and error resolution
 */
export async function extractErrorsAndDebugging(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection> {
  const prompt = `From the conversation history, extract and summarize:

## Debugging & Error Resolution
- All errors encountered: exact error messages
- Stack traces: full stack traces if available
- Root causes: what was wrong and why
- Solutions applied: exact steps taken to fix
- Files affected by bugs: specific file paths and line numbers
- Performance issues identified: before/after measurements
- Failed attempts: what was tried that didn't work
- How errors were diagnosed and resolved

Include the exact error text, not paraphrased.`;

  const response = await querySonnetFn(messages, [prompt], 0, [], new AbortController().signal, options);

  return {
    title: '## Debugging & Error Resolution',
    content: extractTextFromResponse(response),
  };
}

/**
 * Extract decisions and rationale
 */
export async function extractDecisions(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection> {
  const prompt = `From the conversation history, extract and summarize:

## Important Decisions & Rationale
- Why specific technical decisions were made: full reasoning
- Alternatives considered: what else was tried or discussed
- Trade-offs accepted: what was sacrificed for what benefit
- Architecture choices: why certain patterns were chosen
- Design decisions: reasoning behind structure choices
- Technology selections: why specific tools were picked
- Lessons learned: mistakes to avoid, patterns that work
- Previous iterations: what changed and why

Include the complete rationale for each decision.`;

  const response = await querySonnetFn(messages, [prompt], 0, [], new AbortController().signal, options);

  return {
    title: '## Important Decisions & Rationale',
    content: extractTextFromResponse(response),
  };
}

/**
 * Extract performance metrics and measurements
 */
export async function extractPerformance(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection> {
  const prompt = `From the conversation history, extract and summarize:

## Performance & Metrics
- Token counts: conversation tokens, context usage, percentage
- Build times: initial, after optimizations, benchmarks
- Runtime performance: slow operations, bottlenecks identified
- Memory usage: if discussed or measured
- Optimization opportunities: what could be faster
- Before/after measurements: performance improvements
- Load testing results: if any performance tests were run
- Context window status: how much of the limit is being used

Include specific numbers and measurements, not estimates.`;

  const response = await querySonnetFn(messages, [prompt], 0, [], new AbortController().signal, options);

  return {
    title: '## Performance & Metrics',
    content: extractTextFromResponse(response),
  };
}

/**
 * Extract dependencies and integrations
 */
export async function extractDependencies(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection> {
  const prompt = `From the conversation history, extract and summarize:

## Dependencies & Integrations
- External libraries: names, versions, why they're used
- API integrations: which APIs, endpoints, credentials needed
- Third-party services: which services, integration points
- Internal service connections: dependencies between modules
- Database connections: type, version, connection details
- External tools: build tools, linters, formatters, their versions
- Package management: npm packages, version pinning
- Compatibility concerns: version constraints, breaking changes

Include exact package versions and configuration.`;

  const response = await querySonnetFn(messages, [prompt], 0, [], new AbortController().signal, options);

  return {
    title: '## Dependencies & Integrations',
    content: extractTextFromResponse(response),
  };
}

/**
 * Extract user preferences and style guide
 */
export async function extractUserContext(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection> {
  const prompt = `From the conversation history, extract and summarize:

## User Preferences & Context
- Coding style preferences: indentation, naming conventions, formatting
- Architecture preferences: patterns they like/dislike
- Communication style: how detailed responses should be
- Tool preferences: which tools to use, which to avoid
- Optimization priorities: speed vs clarity vs features
- Code organization preferences: how to structure files
- Comment and documentation preferences: style and detail level
- Testing approach: unit tests, integration tests, manual testing
- Git/version control preferences: commit message style, branching strategy

Include specific examples of preferred patterns or styles.`;

  const response = await querySonnetFn(messages, [prompt], 0, [], new AbortController().signal, options);

  return {
    title: '## User Preferences & Context',
    content: extractTextFromResponse(response),
  };
}

/**
 * Extract current status and what's been completed
 */
export async function extractCurrentStatus(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection> {
  const prompt = `From the conversation history, extract and summarize:

## Current Status & Completion
- What has been completed successfully: detailed list with file paths
- What is incomplete: partial implementations, what's missing
- What is broken: known bugs, not yet fixed
- Test coverage: which tests pass, which fail
- Build status: current compilation state, any warnings or errors
- Git status: modified files, uncommitted changes
- Recent commits: last few commit messages
- Next steps: what needs to happen immediately after compression

Be specific about which features work and which don't.`;

  const response = await querySonnetFn(messages, [prompt], 0, [], new AbortController().signal, options);

  return {
    title: '## Current Status & Completion',
    content: extractTextFromResponse(response),
  };
}

/**
 * Helper: Extract text content from assistant message response
 */
function extractTextFromResponse(response: AssistantMessage): string {
  const content = response.message.content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  }
  return '';
}

/**
 * Execute all section extractors in parallel
 */
export async function extractAllSections(
  messages: Message[],
  querySonnetFn: any,
  options: any,
): Promise<CompressionSection[]> {
  console.log('[AUTO-COMPACT] Starting parallel section extraction...');

  const sectionPromises = [
    extractTechnicalContext(messages, querySonnetFn, options).catch(e => ({
      title: '## Technical Context',
      content: `[EXTRACTION FAILED: ${e.message}]`,
    })),
    extractCodeChanges(messages, querySonnetFn, options).catch(e => ({
      title: '## Code Changes & Modifications',
      content: `[EXTRACTION FAILED: ${e.message}]`,
    })),
    extractErrorsAndDebugging(messages, querySonnetFn, options).catch(e => ({
      title: '## Debugging & Error Resolution',
      content: `[EXTRACTION FAILED: ${e.message}]`,
    })),
    extractDecisions(messages, querySonnetFn, options).catch(e => ({
      title: '## Important Decisions & Rationale',
      content: `[EXTRACTION FAILED: ${e.message}]`,
    })),
    extractPerformance(messages, querySonnetFn, options).catch(e => ({
      title: '## Performance & Metrics',
      content: `[EXTRACTION FAILED: ${e.message}]`,
    })),
    extractDependencies(messages, querySonnetFn, options).catch(e => ({
      title: '## Dependencies & Integrations',
      content: `[EXTRACTION FAILED: ${e.message}]`,
    })),
    extractUserContext(messages, querySonnetFn, options).catch(e => ({
      title: '## User Preferences & Context',
      content: `[EXTRACTION FAILED: ${e.message}]`,
    })),
    extractCurrentStatus(messages, querySonnetFn, options).catch(e => ({
      title: '## Current Status & Completion',
      content: `[EXTRACTION FAILED: ${e.message}]`,
    })),
  ];

  const sections = await Promise.all(sectionPromises);
  console.log(`[AUTO-COMPACT] Extracted ${sections.length} sections in parallel`);

  return sections;
}

/**
 * Merge all sections into a single comprehensive summary
 */
export function mergeSections(sections: CompressionSection[]): string {
  const header = `# Conversation Summary
Generated by parallel multi-section extraction for context preservation.
This summary captures all critical information for continuing development work.

---
`;

  const merged = sections
    .filter(s => s.content && s.content.trim().length > 0)
    .map(s => `${s.title}\n${s.content}`)
    .join('\n\n---\n\n');

  return header + merged;
}
