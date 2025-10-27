# Quick Image Reference Card

## ⚡ Quick Test Commands

### Test Image Reading:
```bash
npm start
# Then in TUI:
Read /home/alejandro/Pictures/screenshots/claude_20251027_125030.png
```

### Test with Debug Logging:
```bash
DEBUG_IMAGES=1 npm start
```

### Test Clipboard Paste (macOS):
1. Screenshot: `Cmd+Ctrl+Shift+4`
2. In TUI: `Ctrl+V`
3. Send message

## 🔧 What Was Fixed

| Issue | Status | File |
|-------|--------|------|
| Tool results stringifying arrays | ✅ Fixed | `core/agent.ts` |
| Claude not prompted for vision | ✅ Fixed | `tools/FileReadTool/FileReadTool.ts` |
| No clipboard support | ✅ Added | `utils/imagePaste.ts` |
| No error handling | ✅ Added | `tui/components/InputBox.tsx` |
| Unclear tool description | ✅ Fixed | `tools/FileReadTool/FileReadTool.ts` |

## 📋 Checklist for Testing

- [ ] Build successful (`npm run build`)
- [ ] Read tool works with images
- [ ] Claude describes image content
- [ ] Clipboard paste works (macOS)
- [ ] Size validation works (try >5MB image)
- [ ] Error messages appear correctly
- [ ] Debug logging shows image blocks

## 🎯 Expected Behavior

### Before Fix:
```
User: Read image.png
Tool: [executes]
Claude: "I don't have the ability to view images"
```

### After Fix:
```
User: Read image.png
Tool: [executes, returns image + prompt]
Claude: "The image shows a screenshot with text..."
```

## 🐛 If Still Not Working

1. **Check model:** Must be vision-capable (Sonnet, not Haiku)
2. **Enable debug:** `DEBUG_IMAGES=1 npm start`
3. **Check logs:** Look for `[DEBUG_IMAGES]` output
4. **Verify image:** Use `test-image-tool.js` script
5. **Test structure:** Use `test-tool-result-structure.js`

## 📝 Usage Examples

### Read and Analyze:
```
Read screenshot.png
```

### Read Specific File:
```
Read /path/to/diagram.jpg
```

### Paste from Clipboard:
```
[Press Ctrl+V in input]
What's in this screenshot?
```

### Multiple Images:
```
Read image1.png
[Wait for response]
Read image2.png
[Wait for response]
Compare these two images
```

## 🔑 Key Code Locations

- **Image reading logic:** `tools/FileReadTool/FileReadTool.ts:309-404`
- **Tool result handling:** `core/agent.ts:396-420, 556-587`
- **Clipboard paste:** `utils/imagePaste.ts`
- **TUI input handling:** `tui/components/InputBox.tsx:436-480`
- **API formatting:** `llm/anthropic.ts:102-126`

## 💡 Pro Tips

1. **First message matters:** Claude responds better when prompted
2. **Be specific:** "Describe this image" vs just "Read image.png"
3. **Follow-up questions:** Can ask about specific parts after initial read
4. **Size matters:** Keep images <5MB for best results
5. **Format flexibility:** PNG/JPEG/GIF/WebP all supported

## 🚀 Performance Notes

- Images compressed automatically if >2000x2000px
- Base64 encoding adds ~33% size overhead
- Sharp handles resizing efficiently
- Async processing prevents UI blocking

## 🔒 Security Notes

- File path validation enforced
- Size limits prevent DOS attacks
- Media type validation
- Temporary files cleaned up (clipboard)

---

**Status:** ✅ Ready to test  
**Build:** Successful  
**Deploy:** Recommended after verification
