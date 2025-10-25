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
  const systemPrompt = [
    'You are an expert technical architect analyzing development conversations.',
    'Your task is to extract comprehensive technical context for continuing work.',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. ANALYZE USER MESSAGES ONLY - Focus on what the developer asked for, tried to do, and built',
    '2. EXTRACT EXACT SPECIFICATIONS:',
    '   - OS/Runtime/Versions: Node.js v24.9.0, TypeScript 5.x, etc.',
    '   - Technology Stack: List EVERY language, framework, library with exact version',
    '   - File paths: Include complete paths from project root',
    '   - Configuration: Show actual config values, not just names',
    '3. PROJECT STRUCTURE:',
    '   - Directory tree: /src, /core, /utils, etc.',
    '   - Module organization: how code is organized',
    '   - Entry points: main files, index files',
    '4. BUILD & DEPLOYMENT:',
    '   - Build commands: npm run build, tsc, etc.',
    '   - Output locations: dist/, build/,etc.',
    '   - Deployment: where code runs, environment setup',
    '5. FORMAT OUTPUT:',
    '   - Use bullet points, not paragraphs',
    '   - Include version numbers in [brackets]',
    '   - Use code blocks for configuration files',
  ];

  const prompt = `From the conversation history, extract technical architecture and environment:

## Development Environment
- Operating system and version
- Runtime (Node.js/Python/etc) and version
- Development tools (compiler, IDE, etc)

## Technology Stack
- Programming languages and versions
- Frameworks (React, Express, FastAPI, etc) and versions
- Key libraries and their versions
- Build tools and bundlers

## Project Structure
- Directory organization (src/, core/, utils/, etc)
- Module organization and naming
- Entry points and main files
- Configuration file locations

## Build System
- Build commands and scripts
- TypeScript/compiler configuration
- Output directories and artifacts
- Build optimization settings

## Deployment & Environment
- Deployment targets (production, staging, etc)
- Environment variables needed
- Database connections
- External service endpoints
- Required system dependencies

INSTRUCTIONS:
- Include EXACT version numbers for all tools
- Show actual file paths from project root
- List ALL configuration files mentioned
- Be specific with actual values, not generic descriptions`;

  const response = await querySonnetFn(messages, systemPrompt, 0, [], new AbortController().signal, options);

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
  const systemPrompt = [
    'You are a code change expert analyzing development conversations.',
    'Extract ALL code modifications with surgical precision.',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. ANALYZE USER ACTIONS - What did the developer create, modify, or delete?',
    '2. FILES CREATED:',
    '   - Full path from project root',
    '   - Initial purpose and what it does',
    '   - Key exports and public API',
    '3. FILES MODIFIED:',
    '   - Complete path: src/core/agent.ts',
    '   - Line numbers: "lines 65-90" or "line 243"',
    '   - Exact change: "Added checkAutoCompact call", "Fixed token counting"',
    '   - Code snippet: Show the actual code that changed',
    '4. CODE DETAILS:',
    '   - Function signatures with parameters and return types',
    '   - Interface/type definitions and their fields',
    '   - Imports and dependencies added',
    '   - Exports and public APIs',
    '5. REFACTORING:',
    '   - What code was moved and where',
    '   - Why the refactoring happened',
    '   - Before/after comparison',
    '6. DELETION:',
    '   - What was deleted: specific functions, files, code blocks',
    '   - Why it was deleted',
    '   - Impact on other code',
    '7. FORMATTING:',
    '   - Use "file.ts:123" format for line references',
    '   - Include code in triple backticks',
    '   - Use diff format for major changes (+ and - prefixes)',
  ];

  const prompt = `From the conversation history, extract all code changes with complete accuracy:

## Files Created
For each file created, include:
- Full path from project root
- Purpose and what the file does
- Initial implementation (show code)
- Key functions/exports

## Files Modified
For each file modified, include:
- Complete file path
- Line numbers of changes
- What changed (be specific, not vague)
- The actual code (show snippets)
- Why it changed

## Functions Implemented
- Function name and full signature
- Parameters and their types
- Return type
- Key implementation details
- How it's used

## Interfaces & Types
- Type name and definition
- All fields with their types
- Purpose and usage

## Imports & Dependencies Added
- What was imported
- From where
- Why it was needed

CRITICAL REQUIREMENTS:
- Include actual code, not descriptions
- Provide file paths in format: src/core/agent.ts:243
- Show line numbers where changes occurred
- Include code in markdown blocks with language`;

  const response = await querySonnetFn(messages, systemPrompt, 0, [], new AbortController().signal, options);

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
  const systemPrompt = [
    'You are a debugging expert analyzing development conversations.',
    'Extract EVERY error and its complete resolution path.',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. ANALYZE ALL ERRORS - Find every error message, warning, and failure',
    '2. ERROR DOCUMENTATION:',
    '   - Exact error message (copy-paste from terminal)',
    '   - Error code/type (SyntaxError, TypeError, etc)',
    '   - File and line number where error occurred',
    '   - Full stack trace if available',
    '3. ROOT CAUSE ANALYSIS:',
    '   - What was wrong (be specific, not vague)',
    '   - Why it was wrong (root cause, not symptom)',
    '   - Which files/code were affected',
    '   - Impact on the system',
    '4. SOLUTION STEPS:',
    '   - Exact steps taken to fix the error',
    '   - Code changes made (show actual code)',
    '   - Files modified and line numbers',
    '   - Commands run to verify the fix',
    '5. FAILED ATTEMPTS:',
    '   - What was tried that didn\'t work',
    '   - Why it didn\'t work',
    '   - Error messages from failed attempts',
    '   - What was learned from failures',
    '6. PERFORMANCE ISSUES:',
    '   - What was slow: specific operation or function',
    '   - Measurements: before and after times',
    '   - Root cause of slowness',
    '   - Solution implemented',
    '7. WARNINGS & DEPRECATIONS:',
    '   - All warnings encountered',
    '   - What they mean and how they were resolved',
  ];

  const prompt = `From the conversation history, extract all errors, debugging, and problem resolution:

## Errors Encountered
For each error:
- Exact error message (verbatim from console/terminal)
- Error type/code
- File and line number
- Stack trace (if available)
- When it occurred

## Root Cause Analysis
- What was wrong (specific technical problem)
- Why it happened (root cause)
- Which code/files were affected
- Impact on functionality

## Solutions Applied
- Exact steps taken to fix
- Code changes made (show actual code)
- Files modified with line numbers
- How the fix was verified

## Failed Attempts
- What was tried but didn't work
- Error messages from failed attempts
- Why each attempt failed
- What was learned

## Performance Issues
- What was slow (specific operation)
- Performance metrics: before/after
- Root cause of poor performance
- Solution implemented

## Warnings & Deprecations
- Warning messages
- What they indicate
- How they were resolved`;

  const response = await querySonnetFn(messages, systemPrompt, 0, [], new AbortController().signal, options);

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
  const systemPrompt = [
    'You are a decision analyst reviewing development conversations.',
    'Extract EVERY significant decision with complete rationale.',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. IDENTIFY ALL DECISIONS - Find every architectural, technical, or implementation decision',
    '2. DECISION FORMAT:',
    '   - Decision: Clear statement of what was decided',
    '   - Why: Full reasoning and rationale',
    '   - Alternatives: What other options were considered',
    '   - Trade-offs: What was gained and what was sacrificed',
    '   - Impact: How this decision affects the system',
    '3. ARCHITECTURE DECISIONS:',
    '   - Design patterns chosen and why',
    '   - Module organization and rationale',
    '   - Data flow architecture',
    '   - Component structure decisions',
    '4. TECHNOLOGY DECISIONS:',
    '   - Why specific libraries were chosen',
    '   - Why certain tools were selected',
    '   - Framework choices and reasoning',
    '   - Version selection decisions',
    '5. IMPLEMENTATION DECISIONS:',
    '   - How to structure features',
    '   - Code organization choices',
    '   - API design decisions',
    '   - Error handling strategies',
    '6. TRADE-OFFS:',
    '   - Performance vs clarity: what was chosen and why',
    '   - Features vs stability: what was prioritized',
    '   - Time vs perfection: what compromises were made',
    '   - Complexity vs simplicity: rationale for choices',
  ];

  const prompt = `From the conversation history, extract all significant technical decisions with rationale:

## Architecture Decisions
- Design pattern chosen and why
- Module/component organization and rationale
- Data flow and structure decisions
- Reasoning for architectural choices

## Technology Choices
- Libraries selected and why (with alternatives considered)
- Frameworks chosen and reasoning
- Tools selected and their benefits
- Version decisions and constraints

## Implementation Decisions
- How features were structured
- Code organization choices
- Algorithm selections
- Design pattern applications

## Trade-offs Made
- What was prioritized over what
- Performance vs clarity decisions
- Completeness vs time constraints
- Scalability vs simplicity choices

## Alternatives Considered
- What other approaches were discussed
- Why alternatives were rejected
- Lessons from considering alternatives

## Lessons Learned
- What worked well and why
- What didn't work and why
- Patterns to follow in future
- Mistakes to avoid`;

  const response = await querySonnetFn(messages, systemPrompt, 0, [], new AbortController().signal, options);

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
  const systemPrompt = [
    'You are a performance analyst reviewing development conversations.',
    'Extract EVERY metric and measurement mentioned.',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. FOCUS ON DATA - Extract exact numbers, not estimates',
    '2. TOKEN METRICS:',
    '   - Conversation token count: [exact number]',
    '   - Context usage: [percentage]',
    '   - Token threshold: [limit]',
    '   - Tokens per message: [average or specific]',
    '3. BUILD PERFORMANCE:',
    '   - Build time: before and after numbers',
    '   - Compilation time: specific values',
    '   - Bundle size: changes measured',
    '   - Optimization results',
    '4. RUNTIME PERFORMANCE:',
    '   - Operations measured: what was timed',
    '   - Time taken: in milliseconds/seconds',
    '   - Before/after improvements',
    '   - Slow functions identified',
    '5. MEMORY & RESOURCES:',
    '   - Memory usage: specific values',
    '   - CPU usage if mentioned',
    '   - Resource bottlenecks',
    '6. OPTIMIZATION OPPORTUNITIES:',
    '   - What could be faster',
    '   - Estimated improvements',
    '   - Priority level',
  ];

  const prompt = `From the conversation history, extract all performance metrics and measurements:

## Token Metrics
- Total conversation tokens: [exact number]
- Context usage percentage: [percentage]
- Tokens per message: [average]
- Context threshold: [limit]

## Build Performance
- Build time: before and after
- Compilation metrics
- Bundle size changes
- Build optimizations applied

## Runtime Performance
- Operations measured: what was timed
- Time taken: specific numbers (ms/sec)
- Before/after comparison
- Bottlenecks identified

## Memory & Resources
- Memory usage: specific values
- CPU usage if mentioned
- Resource constraints

## Optimization Opportunities
- What could be faster
- Estimated improvements
- Implementation priority`;

  const response = await querySonnetFn(messages, systemPrompt, 0, [], new AbortController().signal, options);

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
  const systemPrompt = [
    'You are a dependency analyst reviewing development conversations.',
    'Extract EVERY external dependency and integration.',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. LIST ALL DEPENDENCIES - Find every external resource the system depends on',
    '2. NPM PACKAGES:',
    '   - Package name and exact version',
    '   - Why it\'s used: purpose',
    '   - Integration: how it\'s used in code',
    '3. EXTERNAL APIs:',
    '   - API name and endpoint',
    '   - Authentication required: type and credentials',
    '   - Endpoints called: list all',
    '   - Data format: request/response structure',
    '4. THIRD-PARTY SERVICES:',
    '   - Service name (Cerebras, OpenAI, etc)',
    '   - Integration: how it\'s called',
    '   - Configuration: API keys, URLs, settings',
    '   - Cost/limitations: if discussed',
    '5. DATABASE:',
    '   - Database type (PostgreSQL, MongoDB, etc)',
    '   - Version',
    '   - Connection string/config',
    '   - Tables/collections used',
    '6. INTERNAL DEPENDENCIES:',
    '   - Module dependencies',
    '   - Import paths',
    '   - Version constraints',
  ];

  const prompt = `From the conversation history, extract all dependencies and integrations:

## NPM Packages
For each package:
- Name and exact version
- Purpose: why it's used
- Integration: how it's used in code
- Alternative packages considered

## External APIs
- API name and base URL
- Endpoints: methods and paths
- Authentication: type, API key location
- Request/response format
- Rate limits or constraints

## Third-Party Services
- Service name (Cerebras, OpenAI, etc)
- How it's integrated
- Configuration: URLs, API keys, settings
- Cost implications if discussed

## Database
- Type: PostgreSQL, MongoDB, MySQL, etc
- Version number
- Connection string/configuration
- Tables/collections used

## Build & Development Tools
- Tool name and version
- Purpose: what it does
- Configuration details`;

  const response = await querySonnetFn(messages, systemPrompt, 0, [], new AbortController().signal, options);

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
  const systemPrompt = [
    'You are a preferences analyst reviewing development conversations.',
    'Extract ALL user preferences and style guidance.',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. ANALYZE USER REQUESTS - How does the user want things done?',
    '2. CODING STYLE:',
    '   - Indentation: spaces/tabs and count',
    '   - Naming: camelCase, snake_case, PascalCase for different items',
    '   - Formatting: line length, bracket style',
    '   - Comments: style and detail level preferred',
    '3. ARCHITECTURE PREFERENCES:',
    '   - Design patterns they like/dislike',
    '   - Code organization: how they want things structured',
    '   - Module boundaries: how to separate concerns',
    '   - Examples: if they showed preferred patterns, note them',
    '4. COMMUNICATION:',
    '   - Verbosity: how detailed should responses be',
    '   - Format: bullet points, paragraphs, code examples',
    '   - Tone: formal, casual, technical, etc',
    '5. TOOL PREFERENCES:',
    '   - Tools to use: which ones they prefer',
    '   - Tools to avoid: which ones they don\'t like',
    '   - Why: if they gave reasons',
    '6. OPTIMIZATION PRIORITIES:',
    '   - What matters most: speed, clarity, features, maintainability',
    '   - What to avoid: over-engineering, over-simplification',
  ];

  const prompt = `From the conversation history, extract all user preferences and style guides:

## Coding Style
- Indentation: spaces or tabs, how many
- Naming conventions: variables, functions, classes, constants
- Formatting preferences: line length, bracket style, spacing
- Comments and documentation: style and detail level

## Architecture Preferences
- Design patterns they like or dislike
- Code organization: how to structure modules/features
- Component boundaries: separation of concerns
- Examples of preferred patterns shown

## Communication Style
- Verbosity: how detailed should explanations be
- Format preferences: bullet points, paragraphs, code
- Tone: formal, casual, technical

## Tool Preferences
- Tools to use: preferred tools
- Tools to avoid: disliked tools
- Why: reasons if given

## Optimization Priorities
- Most important: speed, clarity, features, maintainability, etc
- Trade-off preferences: what to prioritize if needed

## Testing Approach
- Unit tests: expected
- Integration tests: preferred approach
- Manual testing: what needs manual verification`;

  const response = await querySonnetFn(messages, systemPrompt, 0, [], new AbortController().signal, options);

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
  const systemPrompt = [
    'You are a status tracker reviewing development conversations.',
    'Extract current state of the project with specific details.',
    '',
    'CRITICAL INSTRUCTIONS:',
    '1. TRACK ALL STATUS CHANGES - What works, what doesn\'t, what\'s incomplete',
    '2. COMPLETED FEATURES:',
    '   - Feature name: what was completed',
    '   - Files involved: file paths',
    '   - When: when was it completed',
    '   - Status: fully working or has issues',
    '3. INCOMPLETE FEATURES:',
    '   - Feature name and what\'s missing',
    '   - What was started but not finished',
    '   - What parts are done vs not done',
    '   - Why incomplete: blocked, deprioritized, or in progress',
    '4. KNOWN BUGS:',
    '   - Bug description: what\'s broken',
    '   - Files affected: file paths',
    '   - Severity: critical, high, medium, low',
    '   - Workaround if any',
    '5. BUILD & COMPILATION:',
    '   - Current build status: succeeds or fails',
    '   - Warnings or errors: list them',
    '   - Test results: passing or failing',
    '6. GIT STATUS:',
    '   - Modified files: which files have changes',
    '   - Uncommitted changes: what\'s staged vs unstaged',
    '   - Recent commits: last few messages',
  ];

  const prompt = `From the conversation history, extract current project status:

## Completed Features
For each completed feature:
- Feature name and description
- Files involved: full paths
- Completion status: fully working or has known issues
- When it was completed

## Incomplete / In-Progress Features
- Feature name: what\'s being worked on
- What\'s done: what part is complete
- What\'s missing: what still needs to be done
- Why incomplete: blocked, not started, or in progress
- Estimated next steps

## Known Bugs & Issues
- Bug description: what doesn\'t work
- Files affected: specific file paths
- Severity: critical, high, medium, low
- Workaround if any available
- When discovered

## Build & Test Status
- Build status: succeeds or fails
- Compilation errors/warnings: specific messages
- Test results: pass/fail, coverage %
- Performance baseline: if measured

## Git Status
- Modified files: list with paths
- Uncommitted changes: staged vs unstaged
- Recent commits: last few commit messages
- Branch: current branch name

## Next Immediate Steps
- What needs to be done next
- What blocks progress (if any)
- Dependencies for next phase`;

  const response = await querySonnetFn(messages, systemPrompt, 0, [], new AbortController().signal, options);

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
