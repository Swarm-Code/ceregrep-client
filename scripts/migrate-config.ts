/**
 * Migration Script - Run this to migrate .swarmrc file to .swarmrc/ folder
 */

import { migrateSwarmRc } from '../config/migrate-swarmrc.js';

async function main() {
  console.log('Starting .swarmrc migration...\n');

  const result = await migrateSwarmRc(process.cwd());

  console.log(`Migration ${result.migrated ? 'SUCCESSFUL' : 'SKIPPED'}`);
  console.log(`Message: ${result.message}\n`);

  if (result.migrated) {
    console.log('✓ Old .swarmrc backed up to .swarmrc.backup');
    console.log('✓ New .swarmrc/ folder structure created');
    console.log('✓ All models and settings migrated');
  }

  process.exit(result.migrated ? 0 : 1);
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
