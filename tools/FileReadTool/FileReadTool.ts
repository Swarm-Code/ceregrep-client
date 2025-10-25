/**
 * FileRead Tool - Read files from the filesystem
 * Converted from Kode implementation to headless TypeScript
 */

import type { Base64ImageSource } from '@anthropic-ai/sdk/resources/index.mjs';
import { stat, readFile } from 'fs/promises';
import { statSync, existsSync, readdirSync } from 'fs';
import * as path from 'path';
import { extname, dirname, basename, join, isAbsolute, resolve } from 'path';
import { z } from 'zod';
import { Tool, ValidationResult } from '../../core/tool.js';

const MAX_LINES_TO_READ = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_OUTPUT_SIZE = 0.25 * 1024 * 1024; // 0.25MB in bytes

// Common image extensions
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
]);

// Maximum dimensions for images
const MAX_WIDTH = 2000;
const MAX_HEIGHT = 2000;
const MAX_IMAGE_SIZE = 3.75 * 1024 * 1024; // 5MB in bytes, with base64 encoding

const DESCRIPTION = `Read a file from the local filesystem. The file_path parameter must be an absolute path, not a relative path. By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file. You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters. Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated. For image files, the tool will display the image for you.`;

const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the file to read'),
  offset: z
    .number()
    .optional()
    .describe(
      'The line number to start reading from. Only provide if the file is too large to read at once',
    ),
  limit: z
    .number()
    .optional()
    .describe(
      'The number of lines to read. Only provide if the file is too large to read at once.',
    ),
});

type Input = typeof inputSchema;
type Output =
  | {
      type: 'text';
      file: {
        filePath: string;
        content: string;
        numLines: number;
        startLine: number;
        totalLines: number;
      };
    }
  | {
      type: 'image';
      file: { base64: string; type: Base64ImageSource['media_type'] };
    };

// Utility functions

function normalizeFilePath(filePath: string): string {
  const cwd = process.cwd();
  return isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
}

function findSimilarFile(filePath: string): string | null {
  try {
    const dir = dirname(filePath);
    const base = basename(filePath);
    const ext = extname(base);
    const nameWithoutExt = base.slice(0, -ext.length);

    if (!existsSync(dir)) {
      return null;
    }

    const files = readdirSync(dir);
    for (const file of files) {
      const fileBase = basename(file, extname(file));
      if (fileBase === nameWithoutExt && file !== base) {
        return join(dir, file);
      }
    }
    return null;
  } catch {
    return null;
  }
}

function readTextContent(
  filePath: string,
  offset: number = 0,
  limit?: number,
): { content: string; lineCount: number; totalLines: number } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n');
    const totalLines = allLines.length;

    let lines = allLines;
    if (offset > 0) {
      lines = lines.slice(offset);
    }
    if (limit !== undefined) {
      lines = lines.slice(0, limit);
    }

    // Truncate long lines
    const truncatedLines = lines.map((line) => {
      if (line.length > MAX_LINE_LENGTH) {
        return line.slice(0, MAX_LINE_LENGTH) + '... (line truncated)';
      }
      return line;
    });

    return {
      content: truncatedLines.join('\n'),
      lineCount: truncatedLines.length,
      totalLines,
    };
  } catch (error) {
    throw new Error(
      `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function addLineNumbers(file: {
  filePath: string;
  content: string;
  numLines: number;
  startLine: number;
  totalLines: number;
}): string {
  const { content, startLine } = file;
  const lines = content.split('\n');

  const lineNumberWidth = String(startLine + lines.length - 1).length;
  const numberedLines = lines.map((line, index) => {
    const lineNumber = startLine + index;
    const paddedNumber = String(lineNumber).padStart(lineNumberWidth, ' ');
    return `${paddedNumber}\t${line}`;
  });

  return numberedLines.join('\n');
}

function createImageResponse(
  buffer: Buffer,
  ext: string,
): {
  type: 'image';
  file: { base64: string; type: Base64ImageSource['media_type'] };
} {
  return {
    type: 'image',
    file: {
      base64: buffer.toString('base64'),
      type: `image/${ext.slice(1)}` as Base64ImageSource['media_type'],
    },
  };
}

async function readImage(
  filePath: string,
  ext: string,
): Promise<{
  type: 'image';
  file: { base64: string; type: Base64ImageSource['media_type'] };
}> {
  try {
    const stats = statSync(filePath);

    // Try to use sharp for image processing
    let sharp: typeof import('sharp') | null = null;
    try {
      sharp = (
        (await import('sharp')) as unknown as { default: typeof import('sharp') }
      ).default;
    } catch {
      // Sharp not available, use simple file read
      const buffer = await readFile(filePath);
      if (buffer.length > MAX_IMAGE_SIZE) {
        throw new Error(
          `Image file size (${Math.round(buffer.length / 1024)}KB) exceeds maximum allowed size (${Math.round(MAX_IMAGE_SIZE / 1024)}KB)`,
        );
      }
      return createImageResponse(buffer, ext);
    }

    const buffer = await readFile(filePath);
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      if (stats.size > MAX_IMAGE_SIZE) {
        const compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer();
        return createImageResponse(compressedBuffer, '.jpeg');
      }
    }

    // Calculate dimensions while maintaining aspect ratio
    let width = metadata.width || 0;
    let height = metadata.height || 0;

    // Check if the original file just works
    if (
      stats.size <= MAX_IMAGE_SIZE &&
      width <= MAX_WIDTH &&
      height <= MAX_HEIGHT
    ) {
      return createImageResponse(buffer, ext);
    }

    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }

    if (height > MAX_HEIGHT) {
      width = Math.round((width * MAX_HEIGHT) / height);
      height = MAX_HEIGHT;
    }

    // Resize image and convert to buffer
    const resizedImageBuffer = await image
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // If still too large after resize, compress quality
    if (resizedImageBuffer.length > MAX_IMAGE_SIZE) {
      const compressedBuffer = await image.jpeg({ quality: 80 }).toBuffer();
      return createImageResponse(compressedBuffer, '.jpeg');
    }

    return createImageResponse(resizedImageBuffer, ext);
  } catch (error) {
    // If any error occurs during processing, try to return original image
    try {
      const buffer = await readFile(filePath);
      if (buffer.length > MAX_IMAGE_SIZE) {
        throw new Error(
          `Image file size (${Math.round(buffer.length / 1024)}KB) exceeds maximum allowed size (${Math.round(MAX_IMAGE_SIZE / 1024)}KB)`,
        );
      }
      return createImageResponse(buffer, ext);
    } catch (readError) {
      throw new Error(
        `Failed to read image file: ${readError instanceof Error ? readError.message : String(readError)}`,
      );
    }
  }
}

function formatFileSizeError(sizeInBytes: number): string {
  return `File content (${Math.round(sizeInBytes / 1024)}KB) exceeds maximum allowed size (${Math.round(MAX_OUTPUT_SIZE / 1024)}KB). Please use offset and limit parameters to read specific portions of the file, or use the GrepTool to search for specific content.`;
}

// Import readFileSync for text reading
import { readFileSync } from 'fs';

export const FileReadTool = {
  name: 'Read',
  async description() {
    return DESCRIPTION;
  },
  inputSchema,
  isReadOnly() {
    return true;
  },
  async isEnabled() {
    return true;
  },
  needsPermissions({ file_path }: z.infer<typeof inputSchema>) {
    // For now, always require permissions for file reads
    return true;
  },
  async validateInput({
    file_path,
    offset,
    limit,
  }: z.infer<typeof inputSchema>): Promise<ValidationResult> {
    const fullFilePath = normalizeFilePath(file_path);

    // Check if file exists
    if (!existsSync(fullFilePath)) {
      // Try to find a similar file with a different extension
      const similarFilename = findSimilarFile(fullFilePath);
      let message = `File does not exist: ${fullFilePath}`;

      // If we found a similar file, suggest it to the assistant
      if (similarFilename) {
        message += ` Did you mean ${similarFilename}?`;
      } else {
        // Suggest using discovery tools first
        message += '\n\nSuggestion: Use the LS or Glob tools first to discover what files actually exist before trying to read them. For example:\n- Use LS to explore the directory structure\n- Use Glob with patterns like "**/*.md" or "**/*.ts" to find specific file types';
      }

      return {
        success: false,
        result: false,
        message,
      };
    }

    let stats;
    try {
      stats = statSync(fullFilePath);
    } catch (error) {
      return {
        success: false,
        result: false,
        message: `Cannot access file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const fileSize = stats.size;
    const ext = path.extname(fullFilePath).toLowerCase();

    // Skip size check for image files - they have their own size limits
    if (!IMAGE_EXTENSIONS.has(ext)) {
      // If file is too large and no offset/limit provided
      if (fileSize > MAX_OUTPUT_SIZE && !offset && !limit) {
        return {
          success: false,
          result: false,
          message: formatFileSizeError(fileSize),
          meta: { fileSize },
        };
      }
    }

    return { success: true, result: true };
  },
  async *call(
    { file_path, offset = 1, limit = undefined }: z.infer<typeof inputSchema>,
    { readFileTimestamps }: any,
  ) {
    const ext = path.extname(file_path).toLowerCase();
    const fullFilePath = normalizeFilePath(file_path);

    // Update read timestamp to invalidate stale writes
    if (readFileTimestamps) {
      readFileTimestamps[fullFilePath] = Date.now();
    }

    // If it's an image file, process and return base64 encoded contents
    if (IMAGE_EXTENSIONS.has(ext)) {
      const data = await readImage(fullFilePath, ext);
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant!(data),
      };
      return;
    }

    // Handle offset properly - if offset is 0, don't subtract 1
    const lineOffset = offset === 0 ? 0 : offset - 1;
    const { content, lineCount, totalLines } = readTextContent(
      fullFilePath,
      lineOffset,
      limit,
    );

    // Add size validation after reading for non-image files
    if (!IMAGE_EXTENSIONS.has(ext) && content.length > MAX_OUTPUT_SIZE) {
      throw new Error(formatFileSizeError(content.length));
    }

    const data: Output = {
      type: 'text' as const,
      file: {
        filePath: file_path,
        content: content,
        numLines: lineCount,
        startLine: offset,
        totalLines,
      },
    };

    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant!(data),
    };
  },
  renderResultForAssistant(data: Output) {
    switch (data.type) {
      case 'image':
        return [
          {
            type: 'image',
            source: {
              type: 'base64',
              data: data.file.base64,
              media_type: data.file.type,
            },
          },
        ];
      case 'text':
        return addLineNumbers(data.file);
    }
  },
} as Tool;
