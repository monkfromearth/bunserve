# File Uploads

Complete guide to handling file uploads in BunServe using Bun's native multipart form data support.

## Table of Contents

- [Basic File Upload](#basic-file-upload)
- [Multiple File Uploads](#multiple-file-uploads)
- [File Validation](#file-validation)
- [Large File Handling](#large-file-handling)
- [Image Processing](#image-processing)
- [Security Best Practices](#security-best-practices)
- [Storage Options](#storage-options)
- [Progress Tracking](#progress-tracking)

## Basic File Upload

BunServe automatically parses multipart form data using Bun's native support:

```typescript
import { bunserve } from 'bunserve';
import { write } from 'node:fs/promises';
import { join } from 'node:path';

const app = bunserve();

// Ensure upload directory exists
await Bun.write('./uploads/.gitkeep', '');

// Single file upload endpoint
app.post('/upload', async ({ body, set }) => {
  // Check if request is multipart/form-data
  if (!(body instanceof FormData)) {
    set.status = 400;
    return { error: 'Request must be multipart/form-data' };
  }

  // Get the uploaded file from FormData
  const file = body.get('file') as File;

  if (!file) {
    set.status = 400;
    return { error: 'No file provided' };
  }

  // Generate unique filename to prevent conflicts
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join('./uploads', filename);

  // Save file to disk using Bun's file API
  await Bun.write(filepath, file);

  // Return success response with file info
  set.status = 201;
  return {
    success: true,
    filename,
    size: file.size,
    type: file.type,
    url: `/uploads/${filename}`
  };
});

// Serve uploaded files
app.get('/uploads/:filename', ({ params }) => {
  const filepath = join('./uploads', params.filename);
  return new Response(Bun.file(filepath));
});

app.listen(3000);
```

### Testing File Upload

```bash
# Upload a file using curl
curl -X POST http://localhost:3000/upload \
  -F "file=@/path/to/image.jpg"

# Response
{
  "success": true,
  "filename": "1701234567890-image.jpg",
  "size": 123456,
  "type": "image/jpeg",
  "url": "/uploads/1701234567890-image.jpg"
}
```

## Multiple File Uploads

Handle multiple files in a single request:

```typescript
// Upload multiple files at once
app.post('/upload/multiple', async ({ body, set }) => {
  if (!(body instanceof FormData)) {
    set.status = 400;
    return { error: 'Request must be multipart/form-data' };
  }

  // Get all files from the 'files' field
  const files = body.getAll('files') as File[];

  if (files.length === 0) {
    set.status = 400;
    return { error: 'No files provided' };
  }

  // Process each file
  const uploaded_files = [];

  for (const file of files) {
    const filename = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;
    const filepath = join('./uploads', filename);

    // Save file to disk
    await Bun.write(filepath, file);

    uploaded_files.push({
      filename,
      original_name: file.name,
      size: file.size,
      type: file.type,
      url: `/uploads/${filename}`
    });
  }

  set.status = 201;
  return {
    success: true,
    files: uploaded_files,
    count: uploaded_files.length
  };
});
```

### Testing Multiple Uploads

```bash
# Upload multiple files
curl -X POST http://localhost:3000/upload/multiple \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "files=@document.pdf"
```

## File Validation

Validate file uploads before saving:

```typescript
// Configuration for file validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// Upload with comprehensive validation
app.post('/upload/validated', async ({ body, set }) => {
  if (!(body instanceof FormData)) {
    set.status = 400;
    return { error: 'Request must be multipart/form-data' };
  }

  const file = body.get('file') as File;

  if (!file) {
    set.status = 400;
    return { error: 'No file provided' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    set.status = 400;
    return {
      error: 'File too large',
      details: {
        max_size: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
        file_size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      }
    };
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    set.status = 400;
    return {
      error: 'Invalid file type',
      details: {
        allowed_types: ALLOWED_TYPES,
        file_type: file.type
      }
    };
  }

  // Validate filename (prevent directory traversal)
  const safe_filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  if (safe_filename !== file.name) {
    set.status = 400;
    return {
      error: 'Invalid filename',
      details: {
        reason: 'Filename contains invalid characters'
      }
    };
  }

  // Additional validation: Check file content (magic numbers)
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Validate JPEG magic number
  if (file.type === 'image/jpeg') {
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
      set.status = 400;
      return { error: 'File is not a valid JPEG' };
    }
  }

  // Validate PNG magic number
  if (file.type === 'image/png') {
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
      set.status = 400;
      return { error: 'File is not a valid PNG' };
    }
  }

  // Generate secure filename
  const filename = `${Date.now()}-${crypto.randomUUID()}.${get_file_extension(file.name)}`;
  const filepath = join('./uploads', filename);

  // Save validated file
  await Bun.write(filepath, file);

  set.status = 201;
  return {
    success: true,
    filename,
    size: file.size,
    type: file.type,
    url: `/uploads/${filename}`
  };
});

// Helper function to get file extension
function get_file_extension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}
```

## Large File Handling

Handle large files efficiently without loading them entirely into memory:

```typescript
// Handle large files with streaming
app.post('/upload/large', async ({ body, set }) => {
  if (!(body instanceof FormData)) {
    set.status = 400;
    return { error: 'Request must be multipart/form-data' };
  }

  const file = body.get('file') as File;

  if (!file) {
    set.status = 400;
    return { error: 'No file provided' };
  }

  // Validate file size before processing
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB

  if (file.size > MAX_SIZE) {
    set.status = 413; // Payload Too Large
    return {
      error: 'File exceeds maximum size',
      max_size: `${MAX_SIZE / 1024 / 1024}MB`
    };
  }

  const filename = `${Date.now()}-${file.name}`;
  const filepath = join('./uploads', filename);

  // Bun handles large files efficiently
  await Bun.write(filepath, file);

  set.status = 201;
  return {
    success: true,
    filename,
    size: file.size,
    type: file.type
  };
});
```

## Image Processing

Process uploaded images using Bun's image manipulation capabilities:

```typescript
// Image upload with thumbnail generation
app.post('/upload/image', async ({ body, set }) => {
  if (!(body instanceof FormData)) {
    set.status = 400;
    return { error: 'Request must be multipart/form-data' };
  }

  const file = body.get('image') as File;

  if (!file) {
    set.status = 400;
    return { error: 'No image provided' };
  }

  // Validate image type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    set.status = 400;
    return { error: 'Invalid image type' };
  }

  // Generate filenames
  const base_filename = `${Date.now()}-${crypto.randomUUID()}`;
  const ext = get_file_extension(file.name);
  const original_filename = `${base_filename}.${ext}`;
  const thumbnail_filename = `${base_filename}_thumb.${ext}`;

  // Save original image
  const original_path = join('./uploads', original_filename);
  await Bun.write(original_path, file);

  // Note: For actual image resizing, use a library like 'sharp' or external service
  // This is a placeholder for the concept
  const thumbnail_path = join('./uploads/thumbnails', thumbnail_filename);
  // await create_thumbnail(original_path, thumbnail_path, { width: 200, height: 200 });

  set.status = 201;
  return {
    success: true,
    original: {
      filename: original_filename,
      url: `/uploads/${original_filename}`,
      size: file.size
    },
    thumbnail: {
      filename: thumbnail_filename,
      url: `/uploads/thumbnails/${thumbnail_filename}`
    }
  };
});
```

## Security Best Practices

### 1. Validate File Content (Magic Numbers)

```typescript
// Validate file signature (magic numbers) to prevent MIME type spoofing
async function validate_file_signature(file: File): Promise<boolean> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer).slice(0, 4);

  const signatures: Record<string, number[]> = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
    'application/zip': [0x50, 0x4B, 0x03, 0x04]
  };

  const expected = signatures[file.type];
  if (!expected) return false;

  return expected.every((byte, index) => bytes[index] === byte);
}

// Usage
app.post('/upload/secure', async ({ body, set }) => {
  const file = body.get('file') as File;

  if (!file || !(await validate_file_signature(file))) {
    set.status = 400;
    return { error: 'Invalid or corrupted file' };
  }

  // Continue with upload...
});
```

### 2. Sanitize Filenames

```typescript
// Prevent directory traversal and special characters
function sanitize_filename(filename: string): string {
  // Remove path separators
  const name_only = filename.split(/[/\\]/).pop() || 'unknown';

  // Replace special characters with underscore
  const sanitized = name_only.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit filename length
  const max_length = 255;
  if (sanitized.length > max_length) {
    const ext = get_file_extension(sanitized);
    const name = sanitized.slice(0, max_length - ext.length - 1);
    return `${name}.${ext}`;
  }

  return sanitized;
}

// Usage
const safe_filename = sanitize_filename(file.name);
const unique_filename = `${Date.now()}-${crypto.randomUUID()}-${safe_filename}`;
```

### 3. Store Files Outside Web Root

```typescript
// Store uploads outside the public directory
const UPLOAD_DIR = '/var/app/uploads'; // Outside web root

// Serve files through controlled endpoint
app.get('/files/:id', async ({ params, set }) => {
  // Verify user has permission to access file
  const file_record = await get_file_by_id(params.id);

  if (!file_record) {
    set.status = 404;
    return { error: 'File not found' };
  }

  // Check authorization
  const { user_id } = Context.get<{ user_id: string }>();
  if (file_record.owner_id !== user_id) {
    set.status = 403;
    return { error: 'Access denied' };
  }

  // Serve file
  const filepath = join(UPLOAD_DIR, file_record.filename);
  return new Response(Bun.file(filepath));
});
```

### 4. Scan for Malware

```typescript
// Integrate virus scanning for uploaded files
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const exec_async = promisify(exec);

async function scan_file_for_viruses(filepath: string): Promise<boolean> {
  try {
    // Using ClamAV as example (install: apt-get install clamav)
    await exec_async(`clamscan --no-summary ${filepath}`);
    return true; // File is clean
  } catch (error) {
    return false; // File contains malware
  }
}

// Usage
app.post('/upload/scanned', async ({ body, set }) => {
  const file = body.get('file') as File;
  const temp_path = `/tmp/${crypto.randomUUID()}`;

  // Save to temp location
  await Bun.write(temp_path, file);

  // Scan for viruses
  const is_safe = await scan_file_for_viruses(temp_path);

  if (!is_safe) {
    // Delete infected file
    await Bun.write(temp_path, ''); // Overwrite
    set.status = 400;
    return { error: 'File contains malware' };
  }

  // Move to permanent location if safe
  const final_path = join('./uploads', `${Date.now()}-${file.name}`);
  await Bun.write(final_path, await Bun.file(temp_path).arrayBuffer());

  return { success: true };
});
```

## Storage Options

### Local File System

```typescript
// Save to local disk (development/small-scale)
const local_storage = {
  async save(file: File, filename: string): Promise<string> {
    const filepath = join('./uploads', filename);
    await Bun.write(filepath, file);
    return filepath;
  },

  async delete(filename: string): Promise<void> {
    const filepath = join('./uploads', filename);
    await Bun.write(filepath, ''); // Secure delete
  },

  get_url(filename: string): string {
    return `/uploads/${filename}`;
  }
};
```

### S3-Compatible Storage

```typescript
// Upload to S3 or compatible service (Backblaze B2, DigitalOcean Spaces, etc.)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3_client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const s3_storage = {
  async save(file: File, filename: string): Promise<string> {
    const buffer = await file.arrayBuffer();

    await s3_client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: filename,
      Body: new Uint8Array(buffer),
      ContentType: file.type
    }));

    return filename;
  },

  get_url(filename: string): string {
    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${filename}`;
  }
};

// Usage
app.post('/upload/s3', async ({ body, set }) => {
  const file = body.get('file') as File;
  const filename = `${Date.now()}-${file.name}`;

  await s3_storage.save(file, filename);

  set.status = 201;
  return {
    success: true,
    url: s3_storage.get_url(filename)
  };
});
```

## Progress Tracking

Track upload progress for large files (client-side implementation):

### Server-Side

```typescript
// Server doesn't need special handling - Bun handles streaming automatically
app.post('/upload/tracked', async ({ body, set }) => {
  if (!(body instanceof FormData)) {
    set.status = 400;
    return { error: 'Request must be multipart/form-data' };
  }

  const file = body.get('file') as File;
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join('./uploads', filename);

  // Bun efficiently handles large file uploads
  await Bun.write(filepath, file);

  set.status = 201;
  return { success: true, filename };
});
```

### Client-Side (HTML + JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
  <title>File Upload with Progress</title>
</head>
<body>
  <input type="file" id="fileInput" />
  <button onclick="uploadFile()">Upload</button>
  <div id="progress"></div>

  <script>
    async function uploadFile() {
      const file = document.getElementById('fileInput').files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          document.getElementById('progress').textContent =
            `Upload progress: ${percentComplete.toFixed(2)}%`;
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          document.getElementById('progress').textContent =
            `Upload complete! File: ${response.filename}`;
        }
      });

      // Send request
      xhr.open('POST', '/upload/tracked');
      xhr.send(formData);
    }
  </script>
</body>
</html>
```

## Complete Example

Full-featured file upload endpoint:

```typescript
import { bunserve, error_handler } from 'bunserve';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const app = bunserve();
app.use(error_handler());

// Configuration
const UPLOAD_DIR = './uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

// Ensure upload directory exists
await mkdir(UPLOAD_DIR, { recursive: true });

// File upload endpoint with all validations
app.post('/api/upload', async ({ body, set }) => {
  // Validate Content-Type
  if (!(body instanceof FormData)) {
    set.status = 400;
    return { error: 'Content-Type must be multipart/form-data' };
  }

  // Get file from FormData
  const file = body.get('file') as File;

  if (!file) {
    set.status = 400;
    return { error: 'No file provided in request' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    set.status = 413;
    return {
      error: 'File too large',
      max_size: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
      file_size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    set.status = 415;
    return {
      error: 'Unsupported file type',
      allowed_types: ALLOWED_TYPES,
      received_type: file.type
    };
  }

  // Validate file signature
  if (!(await validate_file_signature(file))) {
    set.status = 400;
    return { error: 'File signature validation failed' };
  }

  // Generate secure filename
  const ext = get_file_extension(file.name);
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  // Save file
  await Bun.write(filepath, file);

  // Return success response
  set.status = 201;
  return {
    success: true,
    file: {
      filename,
      original_name: file.name,
      size: file.size,
      type: file.type,
      url: `/uploads/${filename}`,
      uploaded_at: new Date().toISOString()
    }
  };
});

// Serve uploaded files
app.get('/uploads/:filename', ({ params, set }) => {
  const filepath = join(UPLOAD_DIR, params.filename);

  // Security: Prevent directory traversal
  if (params.filename.includes('..') || params.filename.includes('/')) {
    set.status = 400;
    return { error: 'Invalid filename' };
  }

  return new Response(Bun.file(filepath));
});

// Helper functions
function get_file_extension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

async function validate_file_signature(file: File): Promise<boolean> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer).slice(0, 4);

  const signatures: Record<string, number[]> = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46]
  };

  const expected = signatures[file.type];
  if (!expected) return false;

  return expected.every((byte, index) => bytes[index] === byte);
}

app.listen(3000);
```

## Next Steps

- **[Best Practices](./10-best-practices.md)** - Production best practices
- **[Deployment](./11-deployment.md)** - Deploy to production
- **[Response Handling](./09-responses.md)** - Different response types
- **[Security](./04-middleware.md#security-headers-middleware)** - Security middleware
