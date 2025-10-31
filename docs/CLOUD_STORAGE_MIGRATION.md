# Cloud Storage Migration Summary

## Changes Made

### 1. **Added Cloudinary Cloud Storage**
   - Installed `cloudinary` npm package
   - Created `src/services/storage.ts` for cloud storage operations
   - Files are now uploaded to Cloudinary instead of local `uploads/` folder

### 2. **Updated Database Models**
   - Added `cloudPublicId` field to `FileDoc` schema
   - `uri` field now stores the cloud URL (secure HTTPS link)
   - Updated TypeScript interfaces to reflect changes

### 3. **Modified Upload Flow**
   - `src/routes/upload.ts`: 
     - Files are temporarily stored locally for text extraction
     - Uploaded to Cloudinary cloud storage
     - Local temp files are automatically cleaned up
     - Cloud URL is saved in database
   
### 4. **Enhanced File Management**
   - `src/routes/files.ts`:
     - Added DELETE endpoint to remove files from cloud
     - GET endpoint returns cloud URLs
   
### 5. **Chat History Integration**
   - `src/routes/conversations.ts`:
     - Message attachments now include cloud URLs
     - Direct access to files via public links
     - No need for additional file serving

### 6. **Environment Configuration**
   - Updated `.env` and `env.example` with Cloudinary credentials
   - Updated `src/config/env.ts` to read Cloudinary config

## Quick Start

### 1. Get Cloudinary Credentials
Sign up at: https://cloudinary.com/users/register/free

### 2. Update .env File
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Install Dependencies & Build
```bash
npm install
npm run build
```

### 4. Start Server
```bash
npm run dev
```

## API Changes

### Upload File
**Endpoint:** `POST /api/upload`

**Request:**
```http
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary file data>
conversationId: <optional conversation id>
collection: <optional collection name>
```

**Response:**
```json
{
  "success": true,
  "fileId": "6904e79293093a7b9d815753",
  "uri": "https://res.cloudinary.com/.../filename.pdf",
  "kind": "pdf",
  "textExtracted": true
}
```

### Get Messages with Attachments
**Endpoint:** `GET /api/conversations/:id/messages`

**Response:**
```json
{
  "messages": [
    {
      "_id": "...",
      "role": "user",
      "text": "Here's the document",
      "attachments": [
        {
          "_id": "...",
          "uri": "https://res.cloudinary.com/.../document.pdf",
          "mime": "application/pdf",
          "kind": "pdf",
          "size": 102400,
          "cloudPublicId": "users/user-id/files/document"
        }
      ],
      "createdAt": "2025-10-31T16:45:06.779Z"
    }
  ]
}
```

### Delete File
**Endpoint:** `DELETE /api/files/:id`

Deletes file from both Cloudinary and database.

## Benefits

✅ **No Local Storage Issues**: Files stored in cloud, not server disk  
✅ **Direct Access**: Chat history includes public URLs  
✅ **Automatic CDN**: Fast global delivery via Cloudinary CDN  
✅ **Free Tier**: 25GB storage + 25GB bandwidth/month  
✅ **Secure**: HTTPS URLs, user-based organization  
✅ **Easy Sharing**: URLs can be shared directly with frontend  

## Testing

1. **Upload a file:**
   ```bash
   curl -X POST http://localhost:3001/api/upload \
     -H "Authorization: Bearer <token>" \
     -F "file=@test.pdf"
   ```

2. **Check conversation messages:**
   ```bash
   curl http://localhost:3001/api/conversations/<id>/messages \
     -H "Authorization: Bearer <token>"
   ```

3. **Verify the `uri` field contains a Cloudinary URL starting with:**
   `https://res.cloudinary.com/...`

## Migration Notes

- **Existing local files** in `uploads/` folder will continue to work
- **New uploads** automatically use Cloudinary
- **No data loss**: Database references updated, not replaced

## Troubleshooting

See `docs/CLOUD_STORAGE_SETUP.md` for detailed setup instructions and troubleshooting.

## Next Steps

1. Sign up for Cloudinary (free)
2. Add credentials to `.env`
3. Restart server
4. Test file upload
5. Verify URLs in chat history

That's it! Your files are now stored in the cloud! 🎉
