# Day 3 (Monday) - Frontend & Multi-File

## Overview
Focus on cross-browser compatibility, mobile responsiveness, and multi-file upload support.

---

## 1. Cross-Browser Testing (Desktop)

### Browsers to Test
- [ ] Chrome desktop
- [ ] Safari desktop
- [ ] Firefox desktop

### Test Checklist (each browser)
- [ ] File upload drag & drop
- [ ] File selection via click
- [ ] Progress bar animation
- [ ] Terminal log rendering & animations
- [ ] Download buttons (all formats)
- [ ] CSS animations (blink cursor, fadeIn logs)
- [ ] Backdrop blur effects

### Known Issues to Watch
| Browser | Potential Issue |
|---------|----------------|
| Safari | XHR upload progress events may differ |
| Firefox | Backdrop blur (`backdrop-blur-sm`) compatibility |
| Chrome-only | `scrollbar-thin` utility (won't work in others) |

---

## 2. Mobile Testing

### Devices to Test
- [ ] Chrome mobile (Android)
- [ ] Safari iOS (iPhone)

### Test Checklist
- [ ] Touch drag & drop (may need tap-to-select fallback)
- [ ] Responsive layout stacking (lg:grid-cols-2 → single column)
- [ ] Terminal font readability on small screens
- [ ] Button tap targets (minimum 44px)
- [ ] Progress bar visibility
- [ ] Horizontal scroll prevention
- [ ] Card overflow handling

### Files to Modify for Mobile
```
app/dashboard/page.tsx          - Main layout
components/dashboard/AIInsightsPanel.tsx   - Cards layout
components/dashboard/ProcessingTerminal.tsx - Font sizes
components/dashboard/FileUploader.tsx      - Touch handling
```

---

## 3. Multi-File Upload - Same Exchange

### Implementation Steps

#### Step 1: Update FileUploader.tsx
```tsx
// Change from:
const [file, setFile] = useState<File | null>(null);

// To:
const [files, setFiles] = useState<File[]>([]);
```

```tsx
// Update dropzone config:
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  onDrop,
  accept: { 'text/csv': ['.csv'] },
  maxFiles: 10,      // was: 1
  multiple: true,    // was: false
  maxSize: 10 * 1024 * 1024,
});
```

#### Step 2: Add File List UI
- Show list of selected files with:
  - Filename
  - File size
  - Remove button (X)
  - Individual progress bar during upload

#### Step 3: Update upload-client.ts
```typescript
// Add new function:
export async function uploadMultipleCSVFiles(
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await uploadCSVFile(files[i], (progress) => {
      onProgress?.(i, progress);
    });
    results.push(result);
  }

  return results;
}
```

#### Step 4: Backend Changes
**None required** - Lambda already handles files individually

#### Step 5: Results Handling
- Each file gets its own jobId
- Show results list with download buttons per file
- Option to "Download All" as ZIP (future enhancement)

---

## 4. Multi-File Upload - Different Exchanges

### Additional Requirements
Same as above, plus:

- [ ] Show detected exchange name per file in the list
- [ ] Group results by exchange in download UI
- [ ] Handle mixed success/failure gracefully
  - Some files parse successfully
  - Some files fail auto-detection
  - Show per-file status indicators

### UI Mockup
```
┌─────────────────────────────────────┐
│ Selected Files (3)                  │
├─────────────────────────────────────┤
│ ✓ coinbase_2024.csv    [Coinbase]  │
│ ✓ kraken_trades.csv    [Kraken]    │
│ ⚠ unknown_file.csv     [Unknown]   │
└─────────────────────────────────────┘
```

---

## 5. Fix Responsive Issues

### Current Responsive Classes
```tsx
// dashboard/page.tsx line 45
<div className="grid lg:grid-cols-2 gap-6 mb-8">

// dashboard/page.tsx line 40
<main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
```

### Fixes Needed

#### Terminal Component
```tsx
// ProcessingTerminal.tsx - reduce height on mobile
className="p-4 font-mono text-sm max-h-64 md:max-h-64 max-h-40 ..."

// Reduce font size on mobile
className="... text-xs sm:text-sm ..."
```

#### Card Padding
```tsx
// Reduce padding on mobile
className="p-4 sm:p-6 ..."
```

#### Touch-Friendly Buttons
```tsx
// Ensure minimum 44px tap targets
className="min-h-[44px] ..."
```

#### Scrollbar Fallback
```css
/* Add to globals.css for cross-browser scrollbar */
.scrollbar-thin {
  scrollbar-width: thin; /* Firefox */
}
.scrollbar-thin::-webkit-scrollbar {
  width: 6px; /* Chrome/Safari */
}
```

---

## Recommended Schedule

| Time | Task |
|------|------|
| 9:00 AM | Cross-browser desktop testing (Chrome, Safari, Firefox) |
| 10:30 AM | Mobile testing + responsive fixes |
| 12:00 PM | Lunch |
| 1:00 PM | Multi-file upload - FileUploader.tsx changes |
| 2:30 PM | Multi-file upload - upload-client.ts changes |
| 4:00 PM | Multi-file upload - different exchanges handling |
| 5:00 PM | Integration testing on all browsers |
| 5:30 PM | Bug fixes and polish |

---

## Files to Modify

### Priority 1 (Multi-file core)
- `components/dashboard/FileUploader.tsx`
- `lib/upload-client.ts`

### Priority 2 (Responsive)
- `app/dashboard/page.tsx`
- `components/dashboard/AIInsightsPanel.tsx`
- `components/dashboard/ProcessingTerminal.tsx`
- `app/globals.css`

### Priority 3 (Polish)
- `components/dashboard/TaxSoftwareSelector.tsx`
- `components/dashboard/ExchangeSelector.tsx`

---

## Success Criteria

- [ ] Upload works in Chrome, Safari, Firefox (desktop)
- [ ] Upload works on Chrome mobile and Safari iOS
- [ ] Can upload 2+ files at once
- [ ] Each file shows individual progress
- [ ] Different exchanges detected correctly
- [ ] No horizontal scroll on mobile
- [ ] All buttons have 44px+ tap targets
- [ ] Terminal readable on small screens
