# Clipboard Support in Scout TUI

Scout TUI now supports pasting images and large text directly from your clipboard!

## Features

### 📷 Image Pasting
- Press **Ctrl+V** to paste images from your clipboard
- Supports multiple image formats: PNG, JPEG, GIF, WebP
- Images are automatically base64 encoded and sent to Claude
- Visual indicators show attached images before sending

### 📝 Large Text Pasting
- Press **Ctrl+V** to paste text from clipboard
- Large text blocks (>1000 chars or >20 lines) show a preview
- Normal text is pasted directly into the input field
- Helpful for pasting code snippets, logs, or documentation

## Usage

### Pasting Images

1. Copy an image to your clipboard:
   - From a screenshot tool
   - Copy image file path (e.g., `/path/to/image.png`)
   - Copy base64 encoded image data

2. Press **Ctrl+V** in the Scout input box

3. You'll see the image attachment indicator:
   ```
   📎 Images (1):
     • Image 1 (245 KB)
   ```

4. Type your message and press Enter to send

5. The message will appear in the conversation with the image metadata:
   ```
   ▶ YOU
   What's in this image?
   
   📎 Images (1):
     • Image 1 (245 KB)
   ```

### Pasting Text

1. Copy text to your clipboard

2. Press **Ctrl+V** in the Scout input box

3. For normal text: It's pasted directly into the input
   
4. For large text: You'll see a preview:
   ```
   ✓ Large text: [first 200 chars]... [+5432 chars (145 lines)]
   ```

5. The full text is pasted into your message

## How It Works

### Image Detection
Scout automatically detects clipboard content type:
- **Image file paths**: Reads the file and encodes to base64
- **Base64 data**: Extracts media type and data
- **Text**: Handles as text content

### Supported Image Formats
- `image/png`
- `image/jpeg`
- `image/gif`
- `image/webp`

### Message Structure
When you paste an image, Scout creates a message with multiple content blocks:
```typescript
{
  content: [
    { type: 'text', text: 'Your message' },
    { 
      type: 'image', 
      source: { 
        type: 'base64',
        media_type: 'image/png',
        data: '...' 
      }
    }
  ]
}
```

## Multiple Attachments

You can attach multiple items in a single message:
- Multiple images (paste multiple times)
- Images + files (@mentions)
- Images + documents

Example:
```
Your message here @src/utils/clipboard.ts

📎 Images (2):
  • Image 1 (120 KB)
  • Image 2 (85 KB)

Attached: clipboard.ts
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+V** | Paste from clipboard (text or image) |
| **Ctrl+C** | Cancel current operation |
| **Escape** | Clear attachments |

## Technical Details

### Dependencies
- `clipboardy`: Cross-platform clipboard access
- Built-in Node.js `fs` for file reading
- Built-in `crypto` for UUID generation

### File Size Limits
- Images are base64 encoded (increases size by ~33%)
- Claude API has message size limits (~5MB per message)
- Large images may need to be resized before pasting

### Image Metadata
Scout extracts and displays:
- Media type (MIME type)
- File size (approximate from base64 length)
- File name (generated or from path)

## Example Use Cases

### 1. Debugging with Screenshots
```
I'm getting this error, can you help?
[Paste screenshot of error message]
```

### 2. UI/UX Feedback
```
How can I improve this design?
[Paste screenshot of UI]
```

### 3. Code + Diagram
```
Here's my architecture diagram @src/main.ts
[Paste architecture diagram]
Can you review the implementation?
```

### 4. Analyzing Logs
```
[Paste large log file from clipboard]
What's causing the timeout?
```

## Limitations

1. **No native image clipboard on macOS/Linux**: 
   - You may need to paste the image file path instead
   - Or use base64 encoded data

2. **No image preview in TUI**: 
   - Only metadata is shown (type, size)
   - Images are sent to Claude for analysis

3. **Size considerations**:
   - Very large images may exceed API limits
   - Consider resizing before pasting

## Future Enhancements

Potential future improvements:
- [ ] Drag & drop image files
- [ ] Image preview in TUI (if terminal supports)
- [ ] Automatic image resizing
- [ ] OCR for text extraction
- [ ] Support for more file types (PDFs, videos)

## Smart Command Detection

Scout is smart about distinguishing between commands and file paths:

- **Commands**: `/help`, `/new`, `/agent`, etc. → Treated as commands
- **File paths**: `/path/to/image.png`, `/home/user/screenshot.jpg` → Treated as message content

You can safely type or paste file paths starting with `/` without them being interpreted as commands!

Example:
```
# This is a command
/help

# This is just text/file path
/path/to/my/image.png
```

## Troubleshooting

### Images not being detected
- Try pasting the file path directly: `/path/to/image.png`
- Ensure the image format is supported
- Check clipboard contains valid image data

### Large clipboard content
- For very large text, consider saving to a file and using @mentions
- Break up large pastes into multiple messages

### Paste not working
- Ensure Ctrl+V is not captured by your terminal emulator
- Try pasting in a different terminal
- Check that clipboardy is installed: `npm list clipboardy`

## API Reference

See source code:
- `utils/clipboard.ts` - Clipboard utilities
- `tui/components/InputBox.tsx` - Paste handler
- `tui/components/MessageList.tsx` - Message rendering
