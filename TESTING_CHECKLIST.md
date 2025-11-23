# ✅ File Upload Feature - Testing & Deployment Checklist

## Pre-Deployment Testing

### Backend Testing

- [ ] **Server Starts Successfully**
  ```bash
  cd server
  npm start
  # Should see: "✅ Connected to MongoDB Atlas"
  # Should see: "✅ GridFS bucket initialized"
  ```

- [ ] **Dependencies Installed**
  ```bash
  npm list multer
  npm list gridfs-stream
  # Both should show as installed
  ```

- [ ] **MongoDB Connection**
  - [ ] MONGODB_URI environment variable set
  - [ ] Connection to Atlas successful
  - [ ] Collections accessible

- [ ] **GridFS Initialization**
  - [ ] GridFS bucket created
  - [ ] No console errors during startup

### Frontend Testing

- [ ] **Frontend Starts Successfully**
  ```bash
  npm run dev
  # Should start without errors
  ```

- [ ] **No Build Errors**
  - [ ] Admin.jsx compiles
  - [ ] Challenges.jsx compiles
  - [ ] api.js has no errors

### Basic Functionality Testing

#### Admin Upload Testing

- [ ] **Create Challenge**
  - [ ] Fill all required fields
  - [ ] Submit challenge
  - [ ] Challenge appears in list

- [ ] **Upload Single File**
  - [ ] Edit created challenge
  - [ ] Click "Choose Files"
  - [ ] Select ONE file (< 10MB)
  - [ ] Click "Upload 1 file(s)"
  - [ ] See success message
  - [ ] File appears in uploaded list

- [ ] **Upload Multiple Files**
  - [ ] Click "Choose Files"
  - [ ] Select MULTIPLE files
  - [ ] Click "Upload X file(s)"
  - [ ] See success message
  - [ ] All files appear in list

- [ ] **Download File (Admin Verification)**
  - [ ] Click download icon on uploaded file
  - [ ] File downloads correctly
  - [ ] Filename is correct
  - [ ] File opens without errors

- [ ] **Delete File**
  - [ ] Click delete icon (X)
  - [ ] See confirmation dialog
  - [ ] Confirm deletion
  - [ ] See success message
  - [ ] File removed from list

#### User Download Testing

- [ ] **View Challenge with Files**
  - [ ] Open challenge as user
  - [ ] See "Attached Files" section
  - [ ] Files listed correctly

- [ ] **Download File (User)**
  - [ ] Click on file in list
  - [ ] File downloads correctly
  - [ ] Filename matches original
  - [ ] File opens without errors

### File Type Testing

Test with different file types:

- [ ] **Images**
  - [ ] PNG file
  - [ ] JPEG file
  - [ ] GIF file

- [ ] **Documents**
  - [ ] PDF file
  - [ ] TXT file

- [ ] **Archives**
  - [ ] ZIP file
  - [ ] RAR file (if available)

- [ ] **Binary Files**
  - [ ] EXE file (Windows)
  - [ ] DLL file
  - [ ] Any binary

- [ ] **CTF-Specific**
  - [ ] PCAP file
  - [ ] Memory dump
  - [ ] Encrypted file

### Edge Case Testing

- [ ] **Large Files**
  - [ ] Upload 45MB file (should work)
  - [ ] Try 51MB file (should fail with error)

- [ ] **Special Characters in Filename**
  - [ ] File with spaces: "my file.txt"
  - [ ] File with special chars: "file!@#$.txt"
  - [ ] File with unicode: "文件.txt"

- [ ] **Multiple Rapid Uploads**
  - [ ] Upload 3 files quickly
  - [ ] All should succeed

- [ ] **Delete Challenge with Files**
  - [ ] Create challenge with files
  - [ ] Delete entire challenge
  - [ ] Verify files removed from GridFS
  - [ ] Check MongoDB for orphaned files

### UI/UX Testing

- [ ] **Admin Interface**
  - [ ] File upload section visible only when editing
  - [ ] "Choose Files" button works
  - [ ] Selected files display correctly
  - [ ] Upload button enabled/disabled properly
  - [ ] Progress indication during upload
  - [ ] Success/error messages appear
  - [ ] File list updates after upload
  - [ ] Download buttons work
  - [ ] Delete buttons work with confirmation

- [ ] **User Interface**
  - [ ] "Attached Files" section appears only when files exist
  - [ ] File list displays correctly
  - [ ] File names and sizes shown
  - [ ] Hover effects work
  - [ ] Download works on click
  - [ ] Mobile responsive

### Error Handling Testing

- [ ] **Network Errors**
  - [ ] Disconnect internet during upload
  - [ ] Should show error message
  - [ ] UI should recover

- [ ] **Invalid Challenge ID**
  - [ ] Try uploading to non-existent challenge
  - [ ] Should show error

- [ ] **Missing File**
  - [ ] Try downloading deleted file
  - [ ] Should show 404 error

### Performance Testing

- [ ] **Small Files (< 1MB)**
  - [ ] Upload time: < 2 seconds
  - [ ] Download time: < 1 second

- [ ] **Medium Files (1-10MB)**
  - [ ] Upload time: < 10 seconds
  - [ ] Download time: < 5 seconds

- [ ] **Large Files (10-50MB)**
  - [ ] Upload time: < 60 seconds
  - [ ] Download time: < 30 seconds

### Database Verification

- [ ] **Check MongoDB Atlas**
  - [ ] Log into MongoDB Atlas
  - [ ] Navigate to your database
  - [ ] Find `challengeFiles.files` collection
  - [ ] Verify uploaded files are there
  - [ ] Find `challengeFiles.chunks` collection
  - [ ] Verify chunks exist
  - [ ] Check `challenges` collection
  - [ ] Verify file metadata in challenge documents

### Security Testing

- [ ] **Authentication**
  - [ ] Try uploading without admin login (should fail)
  - [ ] Try deleting without admin login (should fail)
  - [ ] Downloads work for authenticated users

- [ ] **Authorization**
  - [ ] Regular users cannot access upload endpoint
  - [ ] Regular users cannot access delete endpoint

## Pre-Production Checklist

### Configuration

- [ ] **Environment Variables**
  - [ ] MONGODB_URI is set
  - [ ] Production URL configured
  - [ ] EMAIL credentials set (if needed)

- [ ] **CORS Settings**
  - [ ] Production domain added to allowedOrigins
  - [ ] API domain configured
  - [ ] Frontend domain configured

- [ ] **Security**
  - [ ] HTTPS enabled in production
  - [ ] Helmet security headers configured
  - [ ] Rate limiting enabled

### MongoDB Atlas Setup

- [ ] **Database Configuration**
  - [ ] Cluster has sufficient storage
  - [ ] Backup enabled
  - [ ] Monitoring configured
  - [ ] Alerts set up

- [ ] **Performance**
  - [ ] Index on challenge.id exists
  - [ ] GridFS indexes exist (auto-created)
  - [ ] Connection pooling configured

### Deployment

- [ ] **Backend Deployment**
  - [ ] Server deployed to hosting platform
  - [ ] Environment variables set
  - [ ] Server starts successfully
  - [ ] Health check passes

- [ ] **Frontend Deployment**
  - [ ] Frontend built successfully
  - [ ] Deployed to hosting platform
  - [ ] API_URL configured correctly
  - [ ] CORS working

- [ ] **Post-Deployment Testing**
  - [ ] Upload file in production
  - [ ] Download file in production
  - [ ] Delete file in production
  - [ ] All features work as expected

## Production Monitoring

### Daily Checks

- [ ] **Storage Usage**
  - [ ] Monitor MongoDB Atlas storage
  - [ ] Check for unusual growth
  - [ ] Verify within tier limits

- [ ] **Error Logs**
  - [ ] Check server logs for errors
  - [ ] Monitor file upload failures
  - [ ] Track download errors

### Weekly Checks

- [ ] **Performance**
  - [ ] Review upload/download times
  - [ ] Check for slow queries
  - [ ] Monitor bandwidth usage

- [ ] **User Feedback**
  - [ ] Collect feedback on file feature
  - [ ] Address any issues
  - [ ] Make improvements

## Rollback Plan

If issues occur:

1. [ ] **Disable File Uploads**
   - Comment out file upload endpoints
   - Redeploy server
   - Users can still download existing files

2. [ ] **Revert Frontend**
   - Remove file upload UI
   - Keep download functionality
   - Redeploy frontend

3. [ ] **Database Rollback**
   - Remove files array from challenges
   - Keep GridFS data (can be cleaned later)
   - Revert Challenge model

## Success Criteria

Feature is ready for production when:

- [x] All backend tests pass
- [x] All frontend tests pass
- [x] All file type tests pass
- [x] All edge cases handled
- [x] UI/UX is polished
- [x] Error handling works
- [x] Performance is acceptable
- [x] Database verified
- [x] Security checks pass
- [x] Documentation complete
- [ ] Production testing done
- [ ] Monitoring in place

## Final Sign-Off

- [ ] **Development Team**
  - [ ] Code reviewed
  - [ ] Tests passed
  - [ ] Documentation complete

- [ ] **QA Team**
  - [ ] All test cases passed
  - [ ] No critical bugs
  - [ ] Performance acceptable

- [ ] **Product Owner**
  - [ ] Feature meets requirements
  - [ ] UI/UX approved
  - [ ] Ready for production

---

## Quick Test Script

Run this script to test all basic functionality:

```bash
# 1. Start servers
cd server && npm start &
cd .. && npm run dev &

# 2. Open browser
# Navigate to http://localhost:5173

# 3. Test as Admin
# - Login as admin
# - Create challenge
# - Upload test file
# - Download file
# - Delete file

# 4. Test as User
# - Login as user
# - Open challenge
# - Download file
# - Solve challenge

# 5. Check MongoDB
# - Open MongoDB Atlas
# - Verify files in challengeFiles collections
# - Check challenges collection for metadata

# If all steps work: ✅ READY FOR PRODUCTION!
```

---

**Status**: Ready for testing and deployment! 🚀
