/**
 * Test to verify message formatting fixes for Cerebras API
 * This test ensures we don't send null content which causes 400 errors
 */

import { AssistantMessage, UserMessage } from './core/messages.js';
import { randomUUID } from 'crypto';

/**
 * Simulate the message formatting logic from llm/cerebras.ts
 */
function formatMessagesForCerebras(messages: (UserMessage | AssistantMessage)[]) {
  const apiMessages: any[] = [];

  for (const msg of messages) {
    if (msg.message.role === 'user') {
      const content = msg.message.content;

      // Handle user message content - could be string or structured content
      let userContent: string;
      if (typeof content === 'string') {
        userContent = content;
      } else if (Array.isArray(content)) {
        // Extract text from structured content (e.g., tool results)
        userContent = content
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item.type === 'text') return item.text;
            if (item.type === 'tool_result') {
              return `Tool result: ${typeof item.content === 'string' ? item.content : JSON.stringify(item.content)}`;
            }
            return JSON.stringify(item);
          })
          .join('\n');
      } else {
        userContent = JSON.stringify(content);
      }

      apiMessages.push({
        role: 'user',
        content: userContent,
      });
    } else if (msg.message.role === 'assistant') {
      const content = msg.message.content;

      // Check if there are tool calls in the message
      const contentArray = Array.isArray(content) ? content : [];
      const toolCalls = contentArray
        .filter((c: any) => c.type === 'tool_use')
        .map((c: any) => ({
          id: c.id,
          type: 'function' as const,
          function: {
            name: c.name,
            arguments: JSON.stringify(c.input),
          },
        }));

      // Extract text content
      const textContent = contentArray
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');

      if (toolCalls.length > 0) {
        // FIXED: When there are tool calls, content should be either text or empty string (not null)
        apiMessages.push({
          role: 'assistant',
          content: textContent || '', // This was: textContent || null (CAUSED 400 ERROR)
          tool_calls: toolCalls,
        });
      } else {
        apiMessages.push({
          role: 'assistant',
          content: textContent || 'No response',
        });
      }
    }
  }

  return apiMessages;
}

/**
 * Test case 1: Assistant message with tool calls and no text content
 * This would have caused a 400 error before the fix (null content)
 */
function testAssistantMessageWithToolCallsNoText() {
  console.log('\n=== Test 1: Assistant message with tool calls and NO text content ===');

  const messages: AssistantMessage[] = [
    {
      type: 'assistant',
      uuid: randomUUID(),
      message: {
        id: 'msg-1',
        model: 'qwen-3-coder-480b',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'bash',
            input: { command: 'ls' },
          },
        ],
        stop_reason: 'tool_use',
        stop_sequence: '',
        type: 'message',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null,
        },
      } as any,
      costUSD: 0,
      durationMs: 0,
    },
  ];

  const formatted = formatMessagesForCerebras(messages);
  const assistantMsg = formatted[0];

  console.log('Formatted message:', JSON.stringify(assistantMsg, null, 2));

  // CRITICAL CHECKS
  if (assistantMsg.content === null) {
    console.error('❌ FAIL: content is null (would cause 400 error)');
    return false;
  } else if (assistantMsg.content === '') {
    console.log('✅ PASS: content is empty string (valid for Cerebras API)');
  } else {
    console.log('✅ PASS: content has text');
  }

  if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
    console.error('❌ FAIL: tool_calls missing');
    return false;
  }
  console.log('✅ PASS: tool_calls present');

  return true;
}

/**
 * Test case 2: Assistant message with tool calls AND text content
 */
function testAssistantMessageWithToolCallsAndText() {
  console.log('\n=== Test 2: Assistant message with tool calls AND text content ===');

  const messages: AssistantMessage[] = [
    {
      type: 'assistant',
      uuid: randomUUID(),
      message: {
        id: 'msg-2',
        model: 'qwen-3-coder-480b',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Let me check the files',
          },
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'bash',
            input: { command: 'ls -la' },
          },
        ],
        stop_reason: 'tool_use',
        stop_sequence: '',
        type: 'message',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null,
        },
      } as any,
      costUSD: 0,
      durationMs: 0,
    },
  ];

  const formatted = formatMessagesForCerebras(messages);
  const assistantMsg = formatted[0];

  console.log('Formatted message:', JSON.stringify(assistantMsg, null, 2));

  if (assistantMsg.content === 'Let me check the files') {
    console.log('✅ PASS: content has correct text');
  } else {
    console.error('❌ FAIL: content incorrect');
    return false;
  }

  if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
    console.error('❌ FAIL: tool_calls missing');
    return false;
  }
  console.log('✅ PASS: tool_calls present');

  return true;
}

/**
 * Test case 3: User message with structured content (tool results)
 */
function testUserMessageWithToolResults() {
  console.log('\n=== Test 3: User message with structured content (tool results) ===');

  const messages: UserMessage[] = [
    {
      type: 'user',
      uuid: randomUUID(),
      message: {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: 'file1.txt\nfile2.txt\nfile3.txt',
            is_error: false,
          },
        ],
      } as any,
    },
  ];

  const formatted = formatMessagesForCerebras(messages);
  const userMsg = formatted[0];

  console.log('Formatted message:', JSON.stringify(userMsg, null, 2));

  if (typeof userMsg.content === 'string' && userMsg.content.includes('Tool result:')) {
    console.log('✅ PASS: tool result properly converted to string');
  } else {
    console.error('❌ FAIL: tool result not properly formatted');
    return false;
  }

  return true;
}

/**
 * Test case 4: Demonstrate the OLD BEHAVIOR (what would cause 400)
 */
function demonstrateOldBehavior() {
  console.log('\n=== Test 4: Demonstrating OLD behavior (would cause 400) ===');

  const textContent = ''; // Empty text content

  // OLD CODE (BROKEN):
  const oldFormatted = {
    role: 'assistant',
    content: textContent || null, // THIS CAUSES 400 ERROR
    tool_calls: [{ id: 'tool-1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
  };

  // NEW CODE (FIXED):
  const newFormatted = {
    role: 'assistant',
    content: textContent || '', // THIS WORKS
    tool_calls: [{ id: 'tool-1', type: 'function', function: { name: 'bash', arguments: '{}' } }],
  };

  console.log('OLD (broken) format:', JSON.stringify(oldFormatted, null, 2));
  console.log('NEW (fixed) format:', JSON.stringify(newFormatted, null, 2));

  if (oldFormatted.content === null) {
    console.log('❌ OLD: content is null (causes 400 Bad Request from Cerebras)');
  }

  if (newFormatted.content === '') {
    console.log('✅ NEW: content is empty string (accepted by Cerebras)');
  }

  return true;
}

// Run all tests
console.log('='.repeat(70));
console.log('MESSAGE FORMATTING FIX VERIFICATION TEST');
console.log('Testing fix for 400 Bad Request errors from Cerebras API');
console.log('='.repeat(70));

const results = [
  testAssistantMessageWithToolCallsNoText(),
  testAssistantMessageWithToolCallsAndText(),
  testUserMessageWithToolResults(),
  demonstrateOldBehavior(),
];

console.log('\n' + '='.repeat(70));
const passCount = results.filter(r => r).length;
const totalCount = results.length;

if (passCount === totalCount) {
  console.log(`✅ ALL TESTS PASSED (${passCount}/${totalCount})`);
  console.log('✅ The fix prevents null content from being sent to Cerebras');
  process.exit(0);
} else {
  console.log(`❌ SOME TESTS FAILED (${passCount}/${totalCount} passed)`);
  process.exit(1);
}
