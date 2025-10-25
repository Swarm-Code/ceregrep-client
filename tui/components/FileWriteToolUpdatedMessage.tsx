import React from 'react';
import { Box, Text } from 'ink';
import type { Hunk } from '../../utils/diff.js';
import { StructuredDiff } from './StructuredDiff.js';
import { relative } from 'path';
import { getCwd } from '../../utils/state.js';

type FileWriteToolUpdatedMessageProps = {
  filePath: string;
  structuredPatch?: Hunk[];
  verbose: boolean;
  type: 'create' | 'update';
};

export function FileWriteToolUpdatedMessage({
  filePath,
  structuredPatch,
  verbose,
  type,
}: FileWriteToolUpdatedMessageProps): React.ReactNode {
  const patches = Array.isArray(structuredPatch) ? structuredPatch : [];
  const numAdditions = patches.reduce(
    (count, hunk) => count + hunk.lines.filter(line => line.startsWith('+')).length,
    0,
  );
  const numRemovals = patches.reduce(
    (count, hunk) => count + hunk.lines.filter(line => line.startsWith('-')).length,
    0,
  );

  // Get terminal width (approximate)
  const terminalWidth = process.stdout.columns || 80;

  // In compact mode, limit number of hunks shown
  const MAX_HUNKS_COMPACT = 5;
  const displayPatches = verbose ? patches : patches.slice(0, MAX_HUNKS_COMPACT);
  const hiddenHunks = patches.length - displayPatches.length;

  return (
    <Box flexDirection="column">
      <Text>
        {'  '}{type === 'create' ? '\u2713' : '\u23BF'} {type === 'create' ? 'Created' : 'Updated'}{' '}
        <Text bold>{verbose ? filePath : relative(getCwd(), filePath)}</Text>
        {type === 'update' && (numAdditions > 0 || numRemovals > 0) ? ' with ' : ''}
        {type === 'update' && numAdditions > 0 ? (
          <>
            <Text bold>{numAdditions}</Text>{' '}
            {numAdditions > 1 ? 'additions' : 'addition'}
          </>
        ) : null}
        {type === 'update' && numAdditions > 0 && numRemovals > 0 ? ' and ' : null}
        {type === 'update' && numRemovals > 0 ? (
          <>
            <Text bold>{numRemovals}</Text>{' '}
            {numRemovals > 1 ? 'removals' : 'removal'}
          </>
        ) : null}
      </Text>
      {type === 'update' && displayPatches.map((patch, index) => (
        <Box key={index} flexDirection="column" paddingLeft={5}>
          <StructuredDiff patch={patch} dim={false} width={terminalWidth - 12} />
        </Box>
      ))}
      {type === 'update' && hiddenHunks > 0 && (
        <Box paddingLeft={5} marginTop={1}>
          <Text dimColor>
            ... +{hiddenHunks} more change{hiddenHunks > 1 ? 's' : ''} (Ctrl+O to expand)
          </Text>
        </Box>
      )}
    </Box>
  );
}
