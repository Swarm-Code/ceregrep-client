import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Hunk } from '../../utils/diff.js';
import { getTheme, ThemeNames } from '../../utils/theme.js';
import { wrapText } from '../../utils/format.js';

type StructuredDiffProps = {
  patch: Hunk;
  dim: boolean;
  width: number;
  overrideTheme?: ThemeNames;
};

export function StructuredDiff({
  patch,
  dim,
  width,
  overrideTheme,
}: StructuredDiffProps): React.ReactNode {
  const diffLines = useMemo(() => {
    return formatDiff(patch.lines, patch.oldStart, width, dim, overrideTheme);
  }, [patch.lines, patch.oldStart, width, dim, overrideTheme]);

  return diffLines.map((line, i) => <Box key={i}>{line}</Box>);
}

function formatDiff(
  lines: string[],
  startingLineNumber: number,
  width: number,
  dim: boolean,
  overrideTheme?: ThemeNames,
): React.ReactNode[] {
  const theme = getTheme(overrideTheme);

  const ls = numberDiffLines(
    lines.map(code => {
      if (code.startsWith('+')) {
        return {
          code: ' ' + code.slice(1),
          type: 'add',
        };
      }
      if (code.startsWith('-')) {
        return {
          code: ' ' + code.slice(1),
          type: 'remove',
        };
      }
      return { code, type: 'nochange' };
    }),
    startingLineNumber,
  );

  const maxLineNumber = Math.max(...ls.map(({ i }) => i));
  const maxWidth = maxLineNumber.toString().length;

  return ls.flatMap(({ type, code, i }, index) => {
    // Simple word wrapping implementation
    const wrappedLines = wrapText(code, width - maxWidth - 3); // -3 for padding and line numbers
    
    return wrappedLines.map((line, lineIndex) => {
      const key = `${type}-${i}-${lineIndex}-${index}`;
      
      switch (type) {
        case 'add':
          return (
            <Text key={key}>
              <LineNumber i={lineIndex === 0 ? i : undefined} width={maxWidth} />
              <Text
                color={overrideTheme ? theme.text : undefined}
                backgroundColor={dim ? theme.diff.addedDimmed : theme.diff.added}
                dimColor={dim}
              >
                {line}
              </Text>
            </Text>
          );
        case 'remove':
          return (
            <Text key={key}>
              <LineNumber i={lineIndex === 0 ? i : undefined} width={maxWidth} />
              <Text
                color={overrideTheme ? theme.text : undefined}
                backgroundColor={dim ? theme.diff.removedDimmed : theme.diff.removed}
                dimColor={dim}
              >
                {line}
              </Text>
            </Text>
          );
        case 'nochange':
          return (
            <Text key={key}>
              <LineNumber i={lineIndex === 0 ? i : undefined} width={maxWidth} />
              <Text color={overrideTheme ? theme.text : undefined} dimColor={dim}>
                {line}
              </Text>
            </Text>
          );
      }
    });
  });
}

function LineNumber({
  i,
  width,
}: {
  i: number | undefined;
  width: number;
}): React.ReactNode {
  const theme = getTheme();
  return (
    <Text color={theme.secondaryText}>
      {i !== undefined ? i.toString().padStart(width) : ' '.repeat(width)}{' '}
    </Text>
  );
}

function numberDiffLines(
  diff: { code: string; type: string }[],
  startLine: number,
): { code: string; type: string; i: number }[] {
  let i = startLine;
  const result: { code: string; type: string; i: number }[] = [];
  const queue = [...diff];

  while (queue.length > 0) {
    const { code, type } = queue.shift()!;
    const line = {
      code,
      type,
      i,
    };

    // Update counters based on change type
    switch (type) {
      case 'nochange':
        i++;
        result.push(line);
        break;
      case 'add':
        i++;
        result.push(line);
        break;
      case 'remove': {
        result.push(line);
        let numRemoved = 0;
        while (queue[0]?.type === 'remove') {
          i++;
          const { code, type } = queue.shift()!;
          const line = {
            code,
            type,
            i,
          };
          result.push(line);
          numRemoved++;
        }
        i -= numRemoved;
        break;
      }
    }
  }

  return result;
}