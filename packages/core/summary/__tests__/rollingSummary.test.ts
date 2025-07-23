import { describe, it, expect } from 'vitest';
import { updateRollingSummary } from '../rollingSummary';

describe('rollingSummary', () => {
  it('adds new files and generates digest', async () => {
    const { manifest, digest } = await updateRollingSummary(null, [
      { path: 'src/app/page.tsx', content: '<div />' },
    ]);
    expect(Object.keys(manifest.files)).toHaveLength(1);
    expect(digest.length).toBeGreaterThan(0);
  });
});
