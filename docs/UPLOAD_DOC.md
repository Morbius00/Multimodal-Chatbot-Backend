# Upload & Chat-Context Integration (frontend notes)

This document focuses only on the file upload flow and how uploaded files are incorporated into chat context so the frontend dev can integrate quickly.

Overview
- Upload endpoint: POST /api/upload
- Purpose: accept files (PDFs, images, others), extract text (PDF parse / OCR for images), store metadata, chunk and insert extracted text into the vector knowledge DB, and optionally attach the file to a conversation.
- Returned value: file id to reference in future chat requests.

Endpoint: POST /api/upload
- URL: http://localhost:3001/api/upload (use your API base)
- Auth: Bearer token required (Authorization: Bearer <jwt>)
- Content-Type: multipart/form-data
- Form fields:
  - `file` (file) — required
  - `conversationId` (string) — optional; if provided the backend will create a user message with this attachment
  - `collection` (string) — optional; name of the retrieval collection to store chunks under

Response (success):

```json
{
  "success": true,
  "fileId": "656...",
  "uri": "uploads/169.../mydoc.pdf",
  "kind": "pdf",
  "textExtracted": true
}
```

Notes about file processing
- Supported extraction today:
  - PDF: parsed using `pdf-parse` (text extraction)
  - Image: OCR via `tesseract.js` (English by default)
  - Audio: not yet implemented (placeholder)
- Extracted text is split into chunks and saved into the knowledge DB under the specified `collection` (or `conversation_<conversationId>` if `conversationId` provided). These chunks are later used by the retrieval service for context.
- The backend saves a `FileDoc` with `transcripts` (array of { lang, text }) and other metadata (mime, size, uri).

How uploads affect chat context
- When a chat request includes `attachmentIds` (an array of file IDs returned from upload) the orchestrator will load the corresponding `FileDoc` records and include their transcripts into the system prompt sent to the LLM. This gives the assistant access to the file content.
- Alternatively, if you uploaded with `conversationId`, the upload handler will create a user `Message` with the attachment so the conversation history already contains the file link.

Frontend usage examples

A) Upload a file (FormData)

```js
// fileInput is an <input type="file" /> element
const token = localStorage.getItem('token');
const form = new FormData();
form.append('file', fileInput.files[0]);
// optional
form.append('conversationId', conversationId);
form.append('collection', `conversation_${conversationId}`);

const resp = await fetch('http://localhost:3001/api/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: form
});
const json = await resp.json();
if (json.success) {
  // Save json.fileId and use it in chat requests
}
```

B) Send a chat referencing uploaded files (non-stream)

```js
const token = localStorage.getItem('token');
const body = {
  conversationId,
  text: 'Please summarise the attached document',
  attachmentIds: [fileId]
};

const r = await fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify(body)
});
const data = await r.json();
console.log('Assistant reply:', data.message);
```

C) Streaming chat (SSE-like) — use fetch + reader

```js
async function streamChat(conversationId, text, attachmentIds) {
  const token = localStorage.getItem('token');
  const res = await fetch('http://localhost:3001/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversationId, text, attachmentIds }),
  });

  if (!res.ok) throw new Error('Stream failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      // backend sends SSE-formatted chunks like: data: {"type":"...","data":{...}}\n\n
      // Parse and handle events (or append raw chunk to UI)
      console.log(chunk);
    }
  }
}
```

Attachments in GET messages
- `GET /api/messages` and `GET /api/messages/:id` return `attachments` populated with `{ _id, uri, mime, kind, size }`.
- `uri` is a filesystem path on the server. If the frontend needs to download or preview files, ask backend to add one of:
  - Static serving: `app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))`
  - Authenticated download endpoint: `GET /api/files/:id` that streams file bytes (recommended for access control).

Limitations & recommendations
- OCR is English by default; if you need multi-language support, update the upload service to pass the correct language to Tesseract.
- Audio transcription is not implemented yet; plan a job pipeline (e.g., upload -> job -> transcript saved) if you need it.
- For large files, chunking parameters can be tuned in backend (`chunkText` size). The frontend can show an upload progress bar using fetch/XHR progress events.

If you want, I can add a small `GET /api/files/:id` authenticated endpoint and/or enable `/uploads` static serving so the frontend can preview/download files directly. Tell me which you prefer and I will implement it.
