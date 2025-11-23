# File Upload System Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CTF Platform File Upload System                  │
│                                                                      │
│  ┌────────────────┐         ┌─────────────────┐                    │
│  │   Admin UI     │         │    User UI      │                    │
│  │  (Admin.jsx)   │         │ (Challenges.jsx)│                    │
│  └────────┬───────┘         └────────┬────────┘                    │
│           │                           │                              │
│           │ Upload/Delete             │ Download                     │
│           │                           │                              │
│  ┌────────▼───────────────────────────▼────────┐                   │
│  │         API Layer (api.js)                  │                   │
│  │  - uploadChallengeFile()                    │                   │
│  │  - deleteChallengeFile()                    │                   │
│  │  - getChallengeFileUrl()                    │                   │
│  └────────┬─────────────────────────┬──────────┘                   │
│           │                         │                               │
│           │ HTTP Requests           │                               │
│           │                         │                               │
│  ┌────────▼─────────────────────────▼──────────┐                   │
│  │       Express Server (server.js)            │                   │
│  │  - POST   /api/challenges/:id/files         │                   │
│  │  - GET    /api/challenges/:id/files/:name   │                   │
│  │  - DELETE /api/challenges/:id/files/:name   │                   │
│  │                                              │                   │
│  │  ┌────────────────────────────────────┐     │                   │
│  │  │  Multer Middleware                 │     │                   │
│  │  │  - Memory storage                  │     │                   │
│  │  │  - 50MB limit                      │     │                   │
│  │  │  - All file types                  │     │                   │
│  │  └────────────────────────────────────┘     │                   │
│  └────────┬─────────────────────────┬──────────┘                   │
│           │                         │                               │
│           │ Write/Read              │                               │
│           │                         │                               │
│  ┌────────▼─────────────────────────▼──────────┐                   │
│  │      MongoDB GridFS Bucket                  │                   │
│  │  (challengeFiles)                           │                   │
│  │  - Stream-based storage                     │                   │
│  │  - Automatic chunking                       │                   │
│  │  - Binary data storage                      │                   │
│  └────────┬─────────────────────────┬──────────┘                   │
│           │                         │                               │
│  ┌────────▼─────────────────────────▼──────────┐                   │
│  │      MongoDB Atlas Database                 │                   │
│  │                                              │                   │
│  │  ┌──────────────────────────────────────┐   │                   │
│  │  │  challengeFiles.files (metadata)     │   │                   │
│  │  │  - _id, filename, length, uploadDate │   │                   │
│  │  └──────────────────────────────────────┘   │                   │
│  │                                              │                   │
│  │  ┌──────────────────────────────────────┐   │                   │
│  │  │  challengeFiles.chunks (data)        │   │                   │
│  │  │  - files_id, n, data (binary)        │   │                   │
│  │  └──────────────────────────────────────┘   │                   │
│  │                                              │                   │
│  │  ┌──────────────────────────────────────┐   │                   │
│  │  │  challenges (your collection)        │   │                   │
│  │  │  - files: [{                         │   │                   │
│  │  │      filename, originalName,         │   │                   │
│  │  │      size, mimetype, gridFsId        │   │                   │
│  │  │    }]                                │   │                   │
│  │  └──────────────────────────────────────┘   │                   │
│  └──────────────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Upload Flow

```
1. Admin selects file(s)
   ↓
2. Frontend: File objects in memory
   ↓
3. API: Creates FormData with files
   ↓
4. HTTP POST: multipart/form-data to server
   ↓
5. Multer: Parses multipart data
   ↓
6. Server: Receives file buffer in req.file
   ↓
7. GridFS: Opens upload stream
   ↓
8. Stream: Writes buffer to GridFS
   ↓
9. GridFS: Splits into chunks (if > 16MB)
   ↓
10. MongoDB: Stores chunks + metadata
    ↓
11. Challenge: Updates with file metadata
    ↓
12. Response: Returns file info to client
    ↓
13. Frontend: Shows success message
    ↓
14. UI: Displays uploaded file in list
```

### Download Flow

```
1. User clicks file link
   ↓
2. Browser: HTTP GET request
   ↓
3. Server: Finds file metadata in challenge
   ↓
4. GridFS: Opens download stream by gridFsId
   ↓
5. Stream: Reads chunks from MongoDB
   ↓
6. GridFS: Reassembles chunks
   ↓
7. Response: Streams file to browser
   ↓
8. Browser: Sets headers (Content-Disposition)
   ↓
9. Browser: Downloads file
   ↓
10. User: Receives file with original name
```

### Delete Flow

```
1. Admin clicks delete button
   ↓
2. Confirm dialog appears
   ↓
3. Frontend: HTTP DELETE request
   ↓
4. Server: Finds file in challenge
   ↓
5. GridFS: Deletes file by gridFsId
   ↓
6. MongoDB: Removes chunks + metadata
   ↓
7. Challenge: Removes file from array
   ↓
8. Response: Success message
   ↓
9. Frontend: Updates UI
   ↓
10. UI: File removed from list
```

## Database Structure

### GridFS Collections

#### challengeFiles.files
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  length: 1234567,
  chunkSize: 261120,
  uploadDate: ISODate("2025-11-23T10:30:00Z"),
  filename: "1732357800000-secret.png",
  metadata: {
    challengeId: "osint-1",
    originalName: "secret.png",
    mimetype: "image/png"
  }
}
```

#### challengeFiles.chunks
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  files_id: ObjectId("507f1f77bcf86cd799439011"),
  n: 0,  // Chunk number
  data: BinData(0, "...") // 255KB of binary data
}
```

### Challenge Document

```javascript
{
  _id: ObjectId("..."),
  id: "osint-1",
  title: "Find the Secret",
  description: "...",
  category: "osint",
  difficulty: "easy",
  points: 100,
  flagHash: "...",
  files: [
    {
      filename: "1732357800000-secret.png",
      originalName: "secret.png",
      size: 1234567,
      mimetype: "image/png",
      gridFsId: ObjectId("507f1f77bcf86cd799439011"),
      uploadedAt: ISODate("2025-11-23T10:30:00Z")
    }
  ],
  solvedBy: [],
  visible: true,
  disabled: false,
  createdAt: ISODate("2025-11-23T10:00:00Z")
}
```

## API Endpoints

### POST /api/challenges/:id/files

**Request:**
```http
POST /api/challenges/osint-1/files HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="secret.png"
Content-Type: image/png

[binary data]
------WebKitFormBoundary...--
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "filename": "1732357800000-secret.png",
    "originalName": "secret.png",
    "size": 1234567,
    "mimetype": "image/png",
    "gridFsId": "507f1f77bcf86cd799439011",
    "uploadedAt": "2025-11-23T10:30:00.000Z"
  }
}
```

### GET /api/challenges/:id/files/:filename

**Request:**
```http
GET /api/challenges/osint-1/files/1732357800000-secret.png HTTP/1.1
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Disposition: attachment; filename="secret.png"
Content-Length: 1234567

[binary data stream]
```

### DELETE /api/challenges/:id/files/:filename

**Request:**
```http
DELETE /api/challenges/osint-1/files/1732357800000-secret.png HTTP/1.1
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Component Hierarchy

```
App
│
├── Admin (Admin.jsx)
│   │
│   ├── Challenge Form
│   │   ├── Input Fields
│   │   └── File Upload Section
│   │       ├── File Input (hidden)
│   │       ├── Choose Files Button
│   │       ├── Upload Button
│   │       ├── Selected Files Display
│   │       └── Uploaded Files List
│   │           ├── File Item
│   │           │   ├── File Icon
│   │           │   ├── File Name & Size
│   │           │   ├── Download Button
│   │           │   └── Delete Button
│   │           └── ...more files
│   │
│   └── Challenges Table
│
└── Challenges (Challenges.jsx)
    │
    ├── Challenge Cards
    │
    └── Challenge Modal
        ├── Challenge Info
        ├── Attached Files Section
        │   └── File List
        │       ├── File Item (clickable)
        │       │   ├── File Icon
        │       │   ├── File Name
        │       │   ├── File Size
        │       │   └── Download Icon
        │       └── ...more files
        │
        └── Flag Submission
```

## Security Model

```
┌─────────────────────────────────────────────┐
│          Security Layers                    │
├─────────────────────────────────────────────┤
│                                             │
│  1. Authentication                          │
│     - Admin login required for uploads      │
│     - User login required for downloads     │
│     - Session management                    │
│                                             │
│  2. Authorization                           │
│     - Only admins can upload files          │
│     - Only admins can delete files          │
│     - All users can download files          │
│                                             │
│  3. File Validation                         │
│     - 50MB size limit per file              │
│     - Memory buffer limit                   │
│     - No file type restrictions             │
│                                             │
│  4. Network Security                        │
│     - CORS configured for allowed origins   │
│     - HTTPS in production                   │
│     - Rate limiting on endpoints            │
│                                             │
│  5. Database Security                       │
│     - MongoDB Atlas encryption at rest      │
│     - TLS/SSL for data in transit           │
│     - Access control lists                  │
│                                             │
│  6. Data Integrity                          │
│     - GridFS checksums                      │
│     - Atomic operations                     │
│     - Transaction support                   │
│                                             │
└─────────────────────────────────────────────┘
```

## Performance Characteristics

```
File Size    | Upload Time  | Download Time | Storage
-------------|--------------|---------------|----------
< 1 MB       | < 1 second   | < 1 second    | Minimal
1-10 MB      | 2-10 seconds | 2-5 seconds   | Low
10-50 MB     | 30-60 sec    | 10-30 seconds | Moderate
> 50 MB      | Not allowed  | N/A           | N/A
```

## Scalability Considerations

```
Aspect              | Current Setup          | Scale To
--------------------|------------------------|------------------
Max file size       | 50 MB                  | Configurable
Concurrent uploads  | Multiple               | High
Storage location    | MongoDB Atlas          | Cloud-based
File chunking       | 255 KB (GridFS)        | Automatic
Replication         | Atlas cluster          | Multi-region
Backup              | Included in Atlas      | Automated
CDN                 | Not implemented        | Future option
```

---

This architecture provides a robust, scalable, and production-ready file upload system!
