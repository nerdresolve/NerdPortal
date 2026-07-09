'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

describe('services/uploads :: isPathWithinUploads', () => {
  let uploadsDir;
  let isPathWithinUploads;
  let resolveUploadPath;

  beforeAll(() => {
    uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'itportal-uploads-unit-'));
    process.env.UPLOADS_DIR = uploadsDir;
    jest.resetModules();
    ({ isPathWithinUploads, resolveUploadPath } = require('../../services/uploads'));
  });

  afterAll(() => {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  });

  test('accepts a file directly inside the uploads dir', () => {
    const target = path.join(uploadsDir, 'document.pdf');
    expect(isPathWithinUploads(target)).toBe(true);
  });

  test('accepts a file in a nested subdirectory of the uploads dir', () => {
    const target = path.join(uploadsDir, 'team', 'photo.png');
    expect(isPathWithinUploads(target)).toBe(true);
  });

  test('accepts the uploads dir itself', () => {
    expect(isPathWithinUploads(uploadsDir)).toBe(true);
  });

  test('rejects classic ../ traversal out of the uploads dir', () => {
    const target = path.join(uploadsDir, '..', 'etc', 'passwd');
    expect(isPathWithinUploads(target)).toBe(false);
  });

  test('rejects a resolved stored_name that walks out via resolveUploadPath', () => {
    const target = resolveUploadPath('../../etc/passwd');
    expect(isPathWithinUploads(target)).toBe(false);
  });

  test('rejects an absolute path elsewhere on disk', () => {
    const target = os.platform() === 'win32' ? 'C:\\Windows\\System32\\config' : '/etc/passwd';
    expect(isPathWithinUploads(target)).toBe(false);
  });

  test('rejects a sibling directory that merely shares the uploads dir as a string prefix', () => {
    // Um startsWith(UPLOADS_DIR) sem separador aceitaria "<uploadsDir>-evil/x" por engano.
    const siblingDir = `${uploadsDir}-evil`;
    const target = path.join(siblingDir, 'x.txt');
    expect(isPathWithinUploads(target)).toBe(false);
  });

  test('resolveUploadPath joins segments under the uploads dir', () => {
    const target = resolveUploadPath('sub', 'file.txt');
    expect(target).toBe(path.resolve(uploadsDir, 'sub', 'file.txt'));
    expect(isPathWithinUploads(target)).toBe(true);
  });
});
