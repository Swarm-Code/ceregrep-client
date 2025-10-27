# Testing Image Functionality

## Quick Test

Run the TUI with debug logging:

```bash
DEBUG_IMAGES=1 npm start
```

Then in the TUI, type:
```
Read the image at /home/alejandro/Pictures/screenshots/claude_20251027_125030.png
```

## What to Look For in Debug Output

You should see output like:
```
[DEBUG_IMAGES] Message X (user):
  Block 0: tool_result, content is array: true
    Content 0: type=image
```

## Expected Behavior

Claude SHOULD be able to see and describe the image. If Claude says "I don't have the ability to view images", then there's still an issue.

## Possible Issues

1. **Model doesn't support vision**: Make sure you're using a vision-capable model like `claude-sonnet-4-20250514` (not Haiku)
2. **API version**: The image blocks might need a specific API version header
3. **Content structure**: The image block structure might be slightly wrong

## Alternative Test: Direct API Call

Create a minimal test:

```bash
node test-direct-api-call.js
```

Where test-direct-api-call.js contains a direct Anthropic API call with the image.
