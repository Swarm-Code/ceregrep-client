export function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const char of text) {
    // Important: we need the spread to properly count multi-plane UTF-8 characters (eg. 𑚖)
    if ([...currentLine].length < width) {
      currentLine += char;
    } else {
      lines.push(currentLine);
      currentLine = char;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}
