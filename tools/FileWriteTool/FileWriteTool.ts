import type { Hunk } from '../../utils/diff.js'
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs'
import { EOL } from 'os'
import { dirname, extname, isAbsolute, resolve, sep } from 'path'
import { z } from 'zod'
import { Tool } from '../../core/tool.js'
import {
  addLineNumbers,
  detectFileEncoding,
  detectLineEndings,
  detectRepoLineEndings,
  writeTextContent,
} from '../../utils/file.js'
import { getCwd } from '../../utils/state.js'
import { PROMPT } from './prompt.js'
import { hasWritePermission } from '../../utils/permissions/filesystem.js'
import { getFileDiff } from '../../utils/diff.js'
import { PROJECT_FILE } from '../../constants/product.js'
import { emitReminderEvent } from '../../services/systemReminder.js'
import { recordFileEdit } from '../../services/fileFreshness.js'
import { FileWriteToolUpdatedMessage } from '../../tui/components/FileWriteToolUpdatedMessage.js'

const MAX_LINES_TO_RENDER_FOR_ASSISTANT = 16000
const TRUNCATED_MESSAGE =
  '<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with Grep in order to find the line numbers of what you are looking for.</NOTE>'

const inputSchema = z.strictObject({
  file_path: z
    .string()
    .describe(
      'The absolute path to the file to write (must be absolute, not relative)',
    ),
  content: z.string().describe('The content to write to the file'),
})

export const FileWriteTool = {
  name: 'Replace',
  async description() {
    return 'Write a file to the local filesystem.'
  },
  userFacingName: () => 'Write',
  async prompt() {
    return PROMPT
  },
  inputSchema,
  async isEnabled() {
    return true
  },
  isReadOnly() {
    return false
  },
  isConcurrencySafe() {
    return false // FileWriteTool modifies state/files, not safe for concurrent execution
  },
  needsPermissions({ file_path }) {
    return !hasWritePermission(file_path)
  },
  renderToolResultMessage({ filePath, structuredPatch, type }: { filePath: string; structuredPatch: Hunk[]; type: 'create' | 'update' }, { verbose = false }: { verbose?: boolean } = {}) {
    return FileWriteToolUpdatedMessage({
      filePath,
      structuredPatch,
      verbose,
      type,
    });
  },
  async validateInput({ file_path }, { readFileTimestamps }) {
    const fullFilePath = isAbsolute(file_path)
      ? file_path
      : resolve(getCwd(), file_path)
    if (!existsSync(fullFilePath)) {
      return { success: true, result: true }
    }

    const readTimestamp = readFileTimestamps[fullFilePath]
    if (!readTimestamp) {
      return {
        success: false,
        result: false,
        message:
          'File has not been read yet. Read it first before writing to it.',
      }
    }

    // Check if file exists and get its last modified time
    const stats = statSync(fullFilePath)
    const lastWriteTime = stats.mtimeMs
    if (lastWriteTime > readTimestamp) {
      return {
        success: false,
        result: false,
        message:
          'File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.',
      }
    }

    return { success: true, result: true }
  },
  async *call({ file_path, content }, { readFileTimestamps }) {
    const fullFilePath = isAbsolute(file_path)
      ? file_path
      : resolve(getCwd(), file_path)
    const dir = dirname(fullFilePath)
    const oldFileExists = existsSync(fullFilePath)
    const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8'
    const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : null

    const endings = oldFileExists
      ? detectLineEndings(fullFilePath)
      : await detectRepoLineEndings(getCwd())

    mkdirSync(dir, { recursive: true })
    writeTextContent(fullFilePath, content, enc, endings!)

    // Record Agent edit operation for file freshness tracking
    recordFileEdit(fullFilePath, content)

    // Update read timestamp, to invalidate stale writes
    readFileTimestamps[fullFilePath] = statSync(fullFilePath).mtimeMs

    // Log when writing to CLAUDE.md
    if (fullFilePath.endsWith(`${sep}${PROJECT_FILE}`)) {
    }

    // Emit file edited event for system reminders
    emitReminderEvent('file:edited', {
      filePath: fullFilePath,
      content,
      oldContent: oldContent || '',
      timestamp: Date.now(),
      operation: oldFileExists ? 'update' : 'create',
    })

    if (oldContent) {
      const patch = getFileDiff({
        filePath: file_path,
        oldContent: oldContent,
        newContent: content,
      })

      const data = {
        type: 'update' as const,
        filePath: file_path,
        content,
        structuredPatch: patch,
      }
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant!(data),
      }
      return
    }

    const data = {
      type: 'create' as const,
      filePath: file_path,
      content,
      structuredPatch: [],
    }
    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant!(data),
    }
  },
  renderResultForAssistant({ filePath, content, type }) {
    switch (type) {
      case 'create':
        return `File created successfully at: ${filePath}`
      case 'update':
        return `The file ${filePath} has been updated. Here's the result of running \`cat -n\` on a snippet of the edited file:
${addLineNumbers({
  content:
    content.split(/\r?\n/).length > MAX_LINES_TO_RENDER_FOR_ASSISTANT
      ? content
          .split(/\r?\n/)
          .slice(0, MAX_LINES_TO_RENDER_FOR_ASSISTANT)
          .join('\n') + TRUNCATED_MESSAGE
      : content,
  startLine: 1,
})}`
    }
  },
} as Tool
