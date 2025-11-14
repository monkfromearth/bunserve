import { expect, test } from 'bun:test';
import { bunserve } from '../src';

test('File upload with multipart/form-data', async () => {
  const app = bunserve();

  app.post('/upload', async ({ body }) => {
    // body should be FormData for multipart/form-data
    const file = body.get('file');
    const name = body.get('name');

    return {
      hasFile: file !== null,
      fileName: file?.name,
      fileSize: file?.size,
      name
    };
  });

  // Create a simple file
  const fileContent = 'Hello, this is a test file!';
  const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', 'test-upload');

  const response = await app.fetch(
    new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.hasFile).toBe(true);
  expect(data.fileName).toBe('test.txt');
  expect(data.fileSize).toBe(fileContent.length);
  expect(data.name).toBe('test-upload');
});

test('Multiple file uploads', async () => {
  const app = bunserve();

  app.post('/upload-multiple', async ({ body }) => {
    const files = body.getAll('files');

    return {
      fileCount: files.length,
      fileNames: files.map((f: File) => f.name),
      totalSize: files.reduce((sum: number, f: File) => sum + f.size, 0)
    };
  });

  const file1 = new File(['File 1 content'], 'file1.txt', {
    type: 'text/plain'
  });
  const file2 = new File(['File 2 content here'], 'file2.txt', {
    type: 'text/plain'
  });

  const formData = new FormData();
  formData.append('files', file1);
  formData.append('files', file2);

  const response = await app.fetch(
    new Request('http://localhost/upload-multiple', {
      method: 'POST',
      body: formData
    })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.fileCount).toBe(2);
  expect(data.fileNames).toEqual(['file1.txt', 'file2.txt']);
  expect(data.totalSize).toBe('File 1 content'.length + 'File 2 content here'.length);
});

test('Large file upload (1MB)', async () => {
  const app = bunserve();

  app.post('/upload-large', async ({ body }) => {
    const file = body.get('file');

    return {
      fileName: file?.name,
      fileSize: file?.size,
      fileSizeMB: (file?.size / 1024 / 1024).toFixed(2)
    };
  });

  // Create a 1MB file
  const largeContent = 'x'.repeat(1024 * 1024); // 1MB
  const file = new File([largeContent], 'large.txt', { type: 'text/plain' });

  const formData = new FormData();
  formData.append('file', file);

  const response = await app.fetch(
    new Request('http://localhost/upload-large', {
      method: 'POST',
      body: formData
    })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.fileName).toBe('large.txt');
  expect(data.fileSize).toBe(1024 * 1024);
  expect(data.fileSizeMB).toBe('1.00');
});

test('File upload with Bun.file() processing', async () => {
  const app = bunserve();

  app.post('/process-file', async ({ body }) => {
    const file = body.get('file');

    if (!file) {
      return { error: 'No file provided' };
    }

    // Read file content as text
    const content = await file.text();

    return {
      fileName: file.name,
      fileSize: file.size,
      contentLength: content.length,
      firstChars: content.substring(0, 20)
    };
  });

  const fileContent = 'This is a test file with some content!';
  const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

  const formData = new FormData();
  formData.append('file', file);

  const response = await app.fetch(
    new Request('http://localhost/process-file', {
      method: 'POST',
      body: formData
    })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.fileName).toBe('test.txt');
  expect(data.contentLength).toBe(fileContent.length);
  expect(data.firstChars).toBe('This is a test file ');
});

test('Image file upload', async () => {
  const app = bunserve();

  app.post('/upload-image', async ({ body }) => {
    const file = body.get('image');

    return {
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size
    };
  });

  // Create a fake PNG (just headers for testing)
  const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const file = new File([pngHeader], 'test.png', { type: 'image/png' });

  const formData = new FormData();
  formData.append('image', file);

  const response = await app.fetch(
    new Request('http://localhost/upload-image', {
      method: 'POST',
      body: formData
    })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.fileName).toBe('test.png');
  expect(data.fileType).toBe('image/png');
  expect(data.fileSize).toBe(pngHeader.length);
});

test('Empty file upload', async () => {
  const app = bunserve();

  app.post('/upload-empty', async ({ body }) => {
    const file = body.get('file');

    return {
      hasFile: file !== null,
      fileName: file?.name,
      fileSize: file?.size,
      isEmpty: file?.size === 0
    };
  });

  const file = new File([], 'empty.txt', { type: 'text/plain' });

  const formData = new FormData();
  formData.append('file', file);

  const response = await app.fetch(
    new Request('http://localhost/upload-empty', {
      method: 'POST',
      body: formData
    })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.hasFile).toBe(true);
  expect(data.isEmpty).toBe(true);
  expect(data.fileSize).toBe(0);
});

test('Mixed form data with files and text fields', async () => {
  const app = bunserve();

  app.post('/upload-mixed', async ({ body }) => {
    const file = body.get('document');
    const title = body.get('title');
    const description = body.get('description');

    return {
      hasFile: file !== null,
      fileName: file?.name,
      title,
      description
    };
  });

  const file = new File(['Document content'], 'doc.txt', {
    type: 'text/plain'
  });

  const formData = new FormData();
  formData.append('document', file);
  formData.append('title', 'My Document');
  formData.append('description', 'A test document upload');

  const response = await app.fetch(
    new Request('http://localhost/upload-mixed', {
      method: 'POST',
      body: formData
    })
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.hasFile).toBe(true);
  expect(data.fileName).toBe('doc.txt');
  expect(data.title).toBe('My Document');
  expect(data.description).toBe('A test document upload');
});
