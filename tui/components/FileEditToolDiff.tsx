import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { StructuredDiff } from './StructuredDiff.js';
import { getPatch } from '../../utils/diff.js';
import { getCwd } from '../../utils/state.js';
import { relative } from 'path';

type FileEditToolDiffProps = {
  file_path: string;
  new_string: string;
  old_string: string;
  verbose: boolean;
  width: number;
  maxLinesPerDiff?: number; // Truncate diffs longer than this (default: 100)
  collapsible?: boolean; // Allow collapsing diffs (default: false)
};

export function FileEditToolDiff({
  file_path,
  new_string,
  old_string,
  verbose,
  width,
  maxLinesPerDiff = 100,
  collapsible = false,
}: FileEditToolDiffProps): React.ReactNode {
  const fullFilePath = useMemo(
    () => (file_path.startsWith('/') ? file_path : resolve(getCwd(), file_path)),
    [file_path],
  );

  const file = useMemo(
    () => (existsSync(fullFilePath) ? readFileSync(fullFilePath, 'utf8') : ''),
    [fullFilePath],
  );

  const patch = useMemo(
    () =>
      getPatch({
        filePath: fullFilePath,
        fileContents: file,
        oldStr: old_string,
        newStr: new_string,
      }),
    [fullFilePath, file, old_string, new_string],
  );

  // Calculate stats for display
  const totalAdditions = patch.reduce(
    (sum, hunk) => sum + hunk.lines.filter(l => l.startsWith('+')).length,
    0
  );
  const totalDeletions = patch.reduce(
    (sum, hunk) => sum + hunk.lines.filter(l => l.startsWith('-')).length,
    0
  );

  return (
    <Box flexDirection="column">
      <Box
        borderColor="#6b7280"
        borderStyle="round"
        flexDirection="column"
        paddingX={1}
      >
        <Box paddingBottom={1}>
          <Box>
            <Text bold>
              {verbose ? fullFilePath : relative(getCwd(), fullFilePath)}
            </Text>
          </Box>
          <Box paddingLeft={1}>
            <Text color="#9CA3AF">
              {totalAdditions > 0 && <Text color="#10B981">+{totalAdditions}</Text>}
              {totalAdditions > 0 && totalDeletions > 0 && <Text>{' '}</Text>}
              {totalDeletions > 0 && <Text color="#EF4444">-{totalDeletions}</Text>}
            </Text>
          </Box>
        </Box>
        {patch.map((hunk, index) => (
          <Box key={index} marginBottom={1}>
            <StructuredDiff
              patch={hunk}
              dim={false}
              width={width}
              maxLines={maxLinesPerDiff}
              collapsible={collapsible}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}