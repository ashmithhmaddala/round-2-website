# Quick Start: File Uploads for CTF Challenges

## 🚀 What Was Added

Your CTF platform now has **full file upload/download support** using MongoDB Atlas GridFS (production-ready).

## 📦 Dependencies Installed

```bash
npm install multer gridfs-stream
```

## 🎯 How to Use (Step-by-Step)

### For Admins:

1. **Go to Admin Panel** → Challenges tab
2. **Create a new challenge** (if not exists)
3. **Click "Edit"** on the challenge
4. **Scroll down** to "Challenge Files" section
5. **Click "Choose Files"** and select file(s)
6. **Click "Upload X file(s)"** button
7. **Done!** Files are now stored in MongoDB Atlas

### For Users:

1. **Open any challenge** from the challenges page
2. **Look for "Attached Files"** section
3. **Click on any file** to download it
4. **Use the file** to solve the challenge

## ✨ Key Features

- ✅ **MongoDB GridFS Storage** - Files stored in your Atlas database
- ✅ **Multiple File Upload** - Upload many files at once
- ✅ **All File Types** - PDF, ZIP, images, PCAP, binaries, etc.
- ✅ **50MB Limit** - Per file (configurable)
- ✅ **Download & Delete** - Full file management
- ✅ **Production Ready** - No local storage needed

## 🔧 Files Modified

1. **server/server.js** - Added GridFS + file endpoints
2. **server/models/Challenge.js** - Added files array
3. **src/pages/Admin.jsx** - Added file upload UI
4. **src/pages/Challenges.jsx** - Added file download UI
5. **src/utils/api.js** - Added file API functions

## 🧪 Test It Now!

1. Start your server: `cd server && npm start`
2. Start frontend: `npm run dev`
3. Login as admin
4. Create/edit a challenge
5. Upload a test file
6. View as user - download the file

## 📝 Example Use Cases

- **OSINT**: Upload images with hidden metadata
- **Crypto**: Upload encrypted files to decrypt
- **Forensics**: Upload PCAP files or memory dumps
- **Steganography**: Upload images with hidden data
- **Web**: Upload HTML/JS files for analysis
- **Binary**: Upload executables for reverse engineering

## 🎨 UI Screenshots

### Admin View (File Upload)
- File selection button
- Upload progress indicator
- List of uploaded files with download/delete options
- File sizes displayed

### User View (File Download)
- Clean "Attached Files" section in challenge modal
- Click to download any file
- File size information
- Modern UI with icons

## 🔐 Security

- Only admins can upload/delete files
- All authenticated users can download files
- 50MB file size limit prevents abuse
- Files stored securely in MongoDB Atlas
- CORS properly configured

## 📊 Storage

- Files stored in: **MongoDB Atlas GridFS**
- Bucket name: `challengeFiles`
- No local disk storage required
- Automatic replication across Atlas cluster
- Included in database backups

## 🚨 Important Notes

1. **File upload only works for EXISTING challenges**
   - Create the challenge first, then edit to add files
   
2. **All file types are supported**
   - No restrictions on file extensions
   
3. **Files persist in MongoDB**
   - Deleting a challenge also deletes its files
   
4. **No additional configuration needed**
   - Uses your existing MongoDB Atlas connection

## 💡 Tips

- Upload files with meaningful names
- Keep file sizes reasonable (under 10MB preferred)
- Test file downloads before competition
- Use ZIP archives to bundle multiple files
- Add file descriptions in challenge description

---

## 🎉 You're All Set!

The file upload feature is ready to use. Just start your server and try uploading a file to any challenge!

Need help? Check `FILE_UPLOAD_FEATURE.md` for detailed documentation.
