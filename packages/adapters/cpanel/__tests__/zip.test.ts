import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { mkdir, writeFile, rm, stat } from 'fs/promises';
import { createZip } from '../zip';

describe('createZip', () => {
  const tmpRoot = path.join(tmpdir(), 'zip-test-' + Date.now());
  const filePath = path.join(tmpRoot, 'index.html');
  let zipPath: string;

  beforeAll(async () => {
    await mkdir(tmpRoot, { recursive: true });
    await writeFile(filePath, '<h1>Hello</h1>', 'utf8');
    zipPath = await createZip(tmpRoot);
  });

  afterAll(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
    if (zipPath) await rm(zipPath, { force: true });
  });

  it('creates a zip file on disk', async () => {
    const stats = await stat(zipPath);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(100); // small but non-zero
  });
});
