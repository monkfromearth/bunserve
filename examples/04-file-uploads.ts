/**
 * 04. File Uploads Example
 *
 * This example demonstrates handling file uploads:
 * - Single file upload
 * - Multiple file uploads
 * - File validation
 * - Saving files to disk
 *
 * Run: bun 04-file-uploads.ts
 */

import { bunserve, error_handler } from '../src/index';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const app = bunserve();
app.use(error_handler());

// Ensure uploads directory exists
const uploads_dir = join(import.meta.dir, 'uploads');
await mkdir(uploads_dir, { recursive: true });

// Single file upload
app.post('/upload/single', async ({ body }) => {
  if (!body || !(body instanceof FormData)) {
    const error: any = new Error('Expected multipart/form-data');
    error.status = 400;
    throw error;
  }

  const file = body.get('file') as File;

  if (!file) {
    const error: any = new Error('No file provided');
    error.status = 400;
    throw error;
  }

  // Validate file type
  const allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowed_types.includes(file.type)) {
    const error: any = new Error('Invalid file type. Allowed: JPEG, PNG, GIF');
    error.status = 400;
    throw error;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    const error: any = new Error('File too large. Max size: 5MB');
    error.status = 400;
    throw error;
  }

  // Save file
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join(uploads_dir, filename);
  await writeFile(filepath, await file.arrayBuffer());

  return {
    message: 'File uploaded successfully',
    file: {
      name: filename,
      original_name: file.name,
      type: file.type,
      size: file.size
    }
  };
});

// Multiple files upload
app.post('/upload/multiple', async ({ body }) => {
  if (!body || !(body instanceof FormData)) {
    const error: any = new Error('Expected multipart/form-data');
    error.status = 400;
    throw error;
  }

  const files = body.getAll('files') as File[];

  if (!files || files.length === 0) {
    const error: any = new Error('No files provided');
    error.status = 400;
    throw error;
  }

  const uploaded_files = [];

  for (const file of files) {
    // Validate each file
    if (file.size > 5 * 1024 * 1024) {
      continue; // Skip files that are too large
    }

    // Save file
    const filename = `${Date.now()}-${file.name}`;
    const filepath = join(uploads_dir, filename);
    await writeFile(filepath, await file.arrayBuffer());

    uploaded_files.push({
      name: filename,
      original_name: file.name,
      type: file.type,
      size: file.size
    });
  }

  return {
    message: `${uploaded_files.length} files uploaded successfully`,
    files: uploaded_files
  };
});

// File upload with metadata
app.post('/upload/with-metadata', async ({ body }) => {
  if (!body || !(body instanceof FormData)) {
    const error: any = new Error('Expected multipart/form-data');
    error.status = 400;
    throw error;
  }

  const file = body.get('file') as File;
  const title = body.get('title') as string;
  const description = body.get('description') as string;

  if (!file) {
    const error: any = new Error('No file provided');
    error.status = 400;
    throw error;
  }

  // Save file
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join(uploads_dir, filename);
  await writeFile(filepath, await file.arrayBuffer());

  return {
    message: 'File and metadata uploaded successfully',
    file: {
      name: filename,
      original_name: file.name,
      type: file.type,
      size: file.size
    },
    metadata: {
      title,
      description
    }
  };
});

// Start server
console.log('Starting file upload server...');
app.listen(3000);
console.log('Server running at http://localhost:3000');
console.log(`Uploads will be saved to: ${uploads_dir}`);
console.log('');
console.log('Try:');
console.log('  curl -X POST http://localhost:3000/upload/single \\');
console.log('       -F "file=@path/to/image.jpg"');
console.log('');
console.log('  curl -X POST http://localhost:3000/upload/multiple \\');
console.log('       -F "files=@image1.jpg" -F "files=@image2.png"');
