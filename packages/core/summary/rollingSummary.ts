// packages/core/summary/rollingSummary.ts
// Utility for maintaining rolling manifest and digest.

import crypto from 'crypto';

export interface FileMeta {
  path: string;
  hash: string;
  size: number;
  kind: 'code' | 'asset' | 'doc';
}

export interface ProjectManifest {
  files: Record<string, FileMeta>;
  routes: string[];
  models: string[];
  env: string[];
  lastUpdated: string;
}

export interface RollingSummaryOptions {
  maxDigestBytes?: number;
  summariseFn?: (manifest: ProjectManifest) => Promise<string>;
}

export function sha1(buf: Buffer | string) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function defaultSummarise(manifest: ProjectManifest): string {
  return [
    `# Project Digest`,
    `Files: ${Object.keys(manifest.files).length}`,
    `Routes: ${manifest.routes.join(', ') || '-'}`,
    `Models: ${manifest.models.join(', ') || '-'}`,
    `Env: ${manifest.env.join(', ') || '-'}`,
  ].join('\n');
}

export async function updateRollingSummary(
  prev: ProjectManifest | null,
  changedFiles: Array<{ path: string; content: string }>,
  opts: RollingSummaryOptions = {},
): Promise<{ manifest: ProjectManifest; digest: string }> {
  const manifest: ProjectManifest = prev ?? {
    files: {},
    routes: [],
    models: [],
    env: [],
    lastUpdated: new Date().toISOString(),
  };

  changedFiles.forEach(({ path, content }) => {
    manifest.files[path] = {
      path,
      hash: sha1(content),
      size: Buffer.byteLength(content),
      kind: inferKind(path),
    };
  });

  manifest.lastUpdated = new Date().toISOString();
  manifest.routes = Object.keys(manifest.files).filter((p) => p.startsWith('app/') && p.match(/(page|route)\.[jt]sx?$/));
  manifest.models = Object.keys(manifest.files).filter((p) => p.endsWith('.prisma'));
  manifest.env = guessEnvVars(manifest.files);

  const summariseFn = opts.summariseFn ?? ((m) => Promise.resolve(defaultSummarise(m)));
  let digest = await summariseFn(manifest);

  const maxBytes = opts.maxDigestBytes ?? 3000;
  if (Buffer.byteLength(digest, 'utf8') > maxBytes) {
    digest = digest.slice(0, maxBytes - 3) + '...';
  }

  return { manifest, digest };
}

function inferKind(path: string): FileMeta['kind'] {
  if (path.match(/\.(png|jpe?g|gif|svg)$/)) return 'asset';
  if (path.match(/\.(md|txt)$/)) return 'doc';
  return 'code';
}

function guessEnvVars(files: Record<string, FileMeta>): string[] {
  const vars = new Set<string>();
  Object.keys(files).forEach((p) => {
    if (p.includes('.env')) vars.add('DATABASE_URL');
  });
  return Array.from(vars);
}
