# File Upload UI Guide

## Admin Interface - Challenge Creation/Editing

### Location: Admin Panel → Challenges Tab → Create/Edit Challenge

```
┌─────────────────────────────────────────────────────────────┐
│ Create New Challenge                                     [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Challenge ID                    Title                       │
│ ┌─────────────────┐            ┌──────────────────────┐   │
│ │ osint-1         │            │ Find the Secret      │   │
│ └─────────────────┘            └──────────────────────┘   │
│                                                             │
│ Category            Difficulty           Points             │
│ ┌─────────────┐    ┌─────────────┐     ┌──────────┐       │
│ │ OSINT    ▼  │    │ Easy     ▼  │     │ 100      │       │
│ └─────────────┘    └─────────────┘     └──────────┘       │
│                                                             │
│ Description                                                 │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Find the hidden message in the image...             │   │
│ │                                                      │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Flag                                                        │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ CTF{hidden_data_found}                               │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Challenge Files                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │                                                      │   │
│ │  [📁 Choose Files]  [⬆ Upload 2 file(s)]           │   │
│ │                                                      │   │
│ │  Selected: secret_image.png, hints.txt              │   │
│ │                                                      │   │
│ │  Uploaded Files:                                     │   │
│ │  ┌──────────────────────────────────────────────┐   │   │
│ │  │ 📄 secret_image.png (1.2 MB)    [⬇] [×]    │   │   │
│ │  └──────────────────────────────────────────────┘   │   │
│ │  ┌──────────────────────────────────────────────┐   │   │
│ │  │ 📄 hints.txt (5.4 KB)           [⬇] [×]    │   │   │
│ │  └──────────────────────────────────────────────┘   │   │
│ │                                                      │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│           [  Update Challenge  ]  [  Cancel  ]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## User Interface - Challenge Modal

### Location: Challenges Page → Click on Challenge

```
┌─────────────────────────────────────────────────────────────┐
│                                                          [×] │
│  Find the Secret                                            │
│  [Easy] [100 points]                                        │
│                                                             │
│  Challenge Description                                      │
│  ────────────────────────────────────────────────────────  │
│  Find the hidden message in the provided image. Use         │
│  steganography tools to extract the flag.                   │
│                                                             │
│  📄 Attached Files                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ 📄 secret_image.png                       [⬇]  │ │   │
│  │ │    1.2 MB                                       │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ 📄 hints.txt                              [⬇]  │ │   │
│  │ │    5.4 KB                                       │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Submit Your Flag                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ flag{your_answer_here}                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  Press Enter or click Submit to validate your flag          │
│                                                             │
│                    [  Submit Flag  ]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key UI Elements

### 1. File Upload Button
```
[📁 Choose Files]
```
- Opens system file picker
- Supports multiple file selection
- Shows selected files below button

### 2. Upload Confirmation Button
```
[⬆ Upload 2 file(s)]
```
- Only visible when files are selected
- Shows number of files to upload
- Disabled during upload with "Uploading..." text

### 3. Uploaded File Item
```
┌────────────────────────────────────────────────┐
│ 📄 secret_image.png (1.2 MB)    [⬇] [×]      │
└────────────────────────────────────────────────┘
```
- 📄 = File icon
- Filename and size displayed
- [⬇] = Download button
- [×] = Delete button (admin only)

### 4. Download Link (User View)
```
┌────────────────────────────────────────────────┐
│ 📄 secret_image.png                      [⬇]  │
│    1.2 MB                                      │
└────────────────────────────────────────────────┘
```
- Hover effect: background changes
- Click anywhere to download
- Border highlights on hover

## Color Scheme

### Admin Interface
- Background: `#f3f4f6` (light gray)
- File items: `white`
- Borders: `#e5e7eb`
- Hover: `#f9fafb`
- Delete icon: `#ef4444` (red)

### User Interface
- Background: `#f9fafb`
- File items: `white`
- Borders: `#e5e7eb`
- Hover border: `#5b67f7` (blue)
- Icons: `#6b7280` (gray)
- Download icon: `#5b67f7` (blue)

## Interaction Flow

### Admin Upload Flow
1. Click "Edit" on challenge
2. Scroll to "Challenge Files"
3. Click "Choose Files"
4. Select files from computer
5. See selected files list
6. Click "Upload X file(s)"
7. Wait for "uploaded successfully" message
8. See files in uploaded list
9. Can download to verify
10. Can delete if needed

### User Download Flow
1. Open challenge modal
2. See "Attached Files" section
3. Click on any file item
4. Browser downloads file
5. File saved with original name
6. Use file to solve challenge

## Responsive Design

### Desktop (> 768px)
- Full width layout
- Files displayed in list
- All actions visible

### Mobile (< 768px)
- Stacked layout
- Touch-friendly buttons
- Scrollable file list
- Same functionality

## Icons Used

- 📁 `FaUpload` - Upload button
- ⬇ `FaDownload` - Download action
- × `FaTimes` - Delete action
- 📄 `FaFileAlt` - File icon

## Status Messages

### Success Messages
- "2 file(s) uploaded successfully!" (green)
- "File deleted successfully!" (green)

### Error Messages
- "Please select files to upload" (yellow/warning)
- "Failed to upload file: [error]" (red)
- "Failed to delete file: [error]" (red)

### Info Messages
- "No files uploaded yet" (gray, italic)

## File Upload Progress

During upload:
```
[📁 Choose Files]  [⬆ Uploading...]
```
Button disabled, text changes to "Uploading..."

## Empty State

When no files uploaded:
```
No files uploaded yet
```
Displayed in gray, italic text

## Best Practices

1. **Upload descriptive filenames**
   - ✅ `challenge1_encrypted.zip`
   - ❌ `file1.dat`

2. **Group related files in archives**
   - Use ZIP for multiple small files
   - Easier for users to download

3. **Test downloads before live**
   - Verify files open correctly
   - Check file integrity

4. **Add file context in description**
   - Mention files in challenge text
   - Explain what to do with them

---

This UI is clean, intuitive, and production-ready!
