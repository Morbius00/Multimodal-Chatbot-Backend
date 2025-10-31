# Cloud Storage Setup Guide (Cloudinary)

This backend now uses **Cloudinary** for cloud file storage instead of storing files locally in the `uploads/` folder.

## Why Cloudinary?

- **Free Tier**: 25GB storage + 25GB bandwidth per month
- **Easy Integration**: Simple API and SDK
- **Multiple File Types**: Images, PDFs, documents, videos
- **Automatic Optimization**: Image transformations and optimization
- **CDN Delivery**: Fast global content delivery
- **Secure URLs**: Automatic HTTPS support

## Setup Instructions

### 1. Create a Free Cloudinary Account

1. Go to: https://cloudinary.com/users/register/free
2. Sign up with your email
3. Verify your email address
4. Log in to the Cloudinary dashboard

### 2. Get Your Credentials

Once logged in to the Cloudinary dashboard:

1. You'll see your **Dashboard** with credentials
2. Copy the following values:
   - **Cloud Name** (e.g., `dxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnop`)

### 3. Update Your .env File

Add the following to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

Replace the placeholder values with your actual credentials from step 2.

### 4. Restart Your Server

```bash
npm run dev
```

## Features

### File Upload

Files uploaded through the `/api/upload` endpoint are now:
1. Temporarily stored locally for processing (text extraction, OCR)
2. Uploaded to Cloudinary cloud storage
3. Local temp file is automatically deleted
4. Cloud URL is stored in the database

### Chat History with File Links

When you retrieve messages from a conversation:
- Attachments include the `uri` field with the **public cloud URL**
- You can directly use this URL to display/download the file
- No need for local file serving or additional API calls

Example message response:
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
          "uri": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/users/user-id/files/document.pdf",
          "mime": "application/pdf",
          "kind": "pdf",
          "size": 102400,
          "cloudPublicId": "users/user-id/files/document"
        }
      ]
    }
  ]
}
```

### File Management

**Get File Details:**
```http
GET /api/files/:fileId
```

**Delete File:**
```http
DELETE /api/files/:fileId
```
- Deletes from both Cloudinary and database
- Only the file owner can delete

## File Organization

Files are automatically organized in Cloudinary:

```
/multimodal-chat/
  └── users/
      └── {userId}/
          └── files/
              ├── image1.jpg
              ├── document.pdf
              └── ...
```

## Supported File Types

- **Images**: JPG, PNG, GIF, WebP, etc.
- **Documents**: PDF, DOC, DOCX (stored as raw files)
- **Audio**: MP3, WAV, etc.
- **Other**: Any file type

## Image Transformations (Optional)

Cloudinary provides powerful image transformation capabilities. You can modify the `getCloudinaryUrl` function in `src/services/storage.ts` to add transformations:

```typescript
const thumbnailUrl = storageService.getCloudinaryUrl(publicId, {
  width: 300,
  height: 300,
  crop: 'fill',
  format: 'jpg'
});
```

## Troubleshooting

### Error: "Cloudinary credentials not configured"

**Solution**: Make sure you've added all three Cloudinary environment variables to your `.env` file and restarted the server.

### Files still saving locally

**Solution**: 
1. Check that Cloudinary credentials are correct
2. Check server logs for specific error messages
3. Verify your Cloudinary account is active

### Upload fails with "Invalid credentials"

**Solution**: 
1. Double-check your API Key and API Secret
2. Make sure there are no extra spaces in the `.env` file
3. Try regenerating credentials in the Cloudinary dashboard

## Migration from Local Storage

If you have existing files in the `uploads/` folder:

1. They will continue to work (old messages reference local paths)
2. New uploads will automatically use Cloudinary
3. You can optionally migrate old files using a migration script (contact dev team)

## Cost Monitoring

Monitor your usage in the Cloudinary dashboard:
- Dashboard → Usage Report
- Free tier limits:
  - 25GB storage
  - 25GB bandwidth/month
  - 25 credits/month for transformations

If you exceed the free tier, you'll need to upgrade to a paid plan or optimize your usage.

## Security

- All files are stored with **secure HTTPS URLs**
- Files are organized by user ID for privacy
- Only authenticated users can upload
- Only file owners can delete their files
- Cloudinary provides DDoS protection and CDN security

## Alternative: AWS S3

If you prefer AWS S3 instead of Cloudinary, the `.env` file already has placeholders for S3 credentials. You would need to:

1. Create an AWS account
2. Set up an S3 bucket
3. Configure IAM credentials
4. Update `src/services/storage.ts` to use AWS SDK instead of Cloudinary

However, Cloudinary is recommended for the free tier and ease of use.
