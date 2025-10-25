import { structuredPatch } from 'diff'

// Define Hunk type since it's not exported by the 'diff' module
export interface Hunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

const CONTEXT_LINES = 3

// For some reason, & confuses the diff library, so we replace it with a token,
// then substitute it back in after the diff is computed.
const AMPERSAND_TOKEN = '<<:AMPERSAND_TOKEN:>>'

const DOLLAR_TOKEN = '<<:DOLLAR_TOKEN:>>'

export function getPatch({
  filePath,
  fileContents,
  oldStr,
  newStr,
}: {
  filePath: string
  fileContents: string
  oldStr: string
  newStr: string
}): Hunk[] {
  return structuredPatch(
    filePath,
    filePath,
    fileContents.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN),
    fileContents
      .replaceAll('&', AMPERSAND_TOKEN)
      .replaceAll('$', DOLLAR_TOKEN)
      .replace(
        oldStr.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN),
        newStr.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN),
      ),
    undefined,
    undefined,
    { context: CONTEXT_LINES },
  ).hunks.map(_ => ({
    ..._,
    lines: _.lines.map(_ =>
      _.replaceAll(AMPERSAND_TOKEN, '&').replaceAll(DOLLAR_TOKEN, '$'),
    ),
  }))
}

/**
 * Get a line-by-line diff between two complete file contents
 * Use this for FileWriteTool where the entire file is being replaced
 */
export function getFileDiff({
  filePath,
  oldContent,
  newContent,
}: {
  filePath: string
  oldContent: string
  newContent: string
}): Hunk[] {
  return structuredPatch(
    filePath,
    filePath,
    oldContent.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN),
    newContent.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN),
    undefined,
    undefined,
    { context: CONTEXT_LINES },
  ).hunks.map(_ => ({
    ..._,
    lines: _.lines.map(_ =>
      _.replaceAll(AMPERSAND_TOKEN, '&').replaceAll(DOLLAR_TOKEN, '$'),
    ),
  }))
}
