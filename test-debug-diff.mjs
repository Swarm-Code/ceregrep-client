import fs from 'fs';

const failing = JSON.parse(fs.readFileSync('/tmp/cerebras-request-4msg.json', 'utf8'));

console.log('=== FAILING REQUEST ANALYSIS ===\n');

// Check for any unusual characters or formatting
console.log('Tools count:', failing.tools.length);
console.log('Messages count:', failing.messages.length);
console.log('');

// Check each tool definition for issues
failing.tools.forEach((tool, idx) => {
  console.log(`Tool ${idx}: ${tool.function.name}`);
  console.log(`  Has description: ${!!tool.function.description}`);
  console.log(`  Has parameters: ${!!tool.function.parameters}`);
  if (tool.function.parameters) {
    console.log(`    Type: ${tool.function.parameters.type}`);
    console.log(`    Has properties: ${!!tool.function.parameters.properties}`);
    console.log(`    Has required: ${!!tool.function.parameters.required}`);
  }
});

// Check tool result message
const toolMsg = failing.messages[3];
console.log('\nTool result message:');
console.log('  Role:', toolMsg.role);
console.log('  Has tool_call_id:', !!toolMsg.tool_call_id);
console.log('  Content length:', toolMsg.content.length);
console.log('  Content preview:', toolMsg.content.substring(0, 100));

// Check for null/undefined values in critical fields
console.log('\nChecking for null/undefined values...');
function checkForNulls(obj, path = '') {
  for (const key in obj) {
    const val = obj[key];
    const currentPath = path ? `${path}.${key}` : key;
    if (val === null || val === undefined) {
      console.log(`  NULL/UNDEFINED at: ${currentPath}`);
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      checkForNulls(val, currentPath);
    }
  }
}

checkForNulls(failing);
console.log('Done checking');
