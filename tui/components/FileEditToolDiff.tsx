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
};

export function FileEditToolDiff({
  file_path,
  new_string,
  old_string,
  verbose,
  width,
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

  return (
    <Box flexDirection="column">
      <Box
        borderColor="#6b7280"
        borderStyle="round"
        flexDirection="column"
        paddingX={1}
      >
        <Box paddingBottom={1}>
          <Text bold>
            {verbose ? fullFilePath : relative(getCwd(), fullFilePath)}
          </Text>
        </Box>
        {patch.map((hunk, index) => (
          <StructuredDiff
            key={index}
            patch={hunk}
            dim={false}
            width={width}
          />
        ))}
      </Box>
    </Box>
  );
}