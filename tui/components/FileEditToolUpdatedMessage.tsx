import React from 'react';
import { Box, Text } from 'ink';
import type { Hunk } from '../../utils/diff.js';
import { StructuredDiff } from './StructuredDiff.js';
import { relative } from 'path';
import { getCwd } from '../../utils/state.js';

type FileEditToolUpdatedMessageProps = {
  filePath: string;
  structuredPatch?: Hunk[];
  verbose: boolean;
};

export function FileEditToolUpdatedMessage({
  filePath,
  structuredPatch,
  verbose,
}: FileEditToolUpdatedMessageProps): React.ReactNode {
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
        {'  '}{'\u23BF'} Updated{' '}
        <Text bold>{verbose ? filePath : relative(getCwd(), filePath)}</Text>
        {numAdditions > 0 || numRemovals > 0 ? ' with ' : ''}
        {numAdditions > 0 ? (
          <>
            <Text bold>{numAdditions}</Text>{' '}
            {numAdditions > 1 ? 'additions' : 'addition'}
          </>
        ) : null}
        {numAdditions > 0 && numRemovals > 0 ? ' and ' : null}
        {numRemovals > 0 ? (
          <>
            <Text bold>{numRemovals}</Text>{' '}
            {numRemovals > 1 ? 'removals' : 'removal'}
          </>
        ) : null}
      </Text>
      {displayPatches.map((patch, index) => (
        <Box key={index} flexDirection="column" paddingLeft={5}>
          <StructuredDiff patch={patch} dim={false} width={terminalWidth - 12} />
        </Box>
      ))}
      {hiddenHunks > 0 && (
        <Box paddingLeft={5} marginTop={1}>
          <Text dimColor>
            ... +{hiddenHunks} more change{hiddenHunks > 1 ? 's' : ''} (Ctrl+O to expand)
          </Text>
        </Box>
      )}
    </Box>
  );
}