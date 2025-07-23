import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubAdapter, parseRepoUrl, pushFiles } from '../index';

// Mock Octokit
const mockOctokit = {
  repos: {
    createForAuthenticatedUser: vi.fn(),
    get: vi.fn(),
    getCommit: vi.fn(),
  },
  git: {
    createBlob: vi.fn(),
    createTree: vi.fn(),
    createCommit: vi.fn(),
    updateRef: vi.fn(),
  },
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GitHubAdapter({ accessToken: 'test-token' });
  });

  describe('createRepo', () => {
    it('should create a private repository by default', async () => {
      mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({
        data: { html_url: 'https://github.com/test/repo' },
      });

      const url = await adapter.createRepo('test-repo');

      expect(mockOctokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'test-repo',
        private: true,
      });
      expect(url).toBe('https://github.com/test/repo');
    });

    it('should create a public repository when specified', async () => {
      mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({
        data: { html_url: 'https://github.com/test/public-repo' },
      });

      await adapter.createRepo('public-repo', false);

      expect(mockOctokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'public-repo',
        private: false,
      });
    });
  });

  describe('pushFiles', () => {
    const mockRepoData = {
      data: { default_branch: 'main' },
    };

    const mockCommitData = {
      sha: 'abc123',
      commit: { tree: { sha: 'tree-sha' } },
    };

    beforeEach(() => {
      mockOctokit.repos.get.mockResolvedValue(mockRepoData);
      mockOctokit.repos.getCommit.mockResolvedValue(mockCommitData);
      mockOctokit.git.createBlob.mockResolvedValue({
        data: { sha: 'blob-sha' },
      });
      mockOctokit.git.createTree.mockResolvedValue({
        data: { sha: 'new-tree-sha' },
      });
      mockOctokit.git.createCommit.mockResolvedValue({
        data: { sha: 'new-commit-sha' },
      });
      mockOctokit.git.updateRef.mockResolvedValue({});
    });

    it('should push files to repository', async () => {
      const files = {
        'src/index.ts': 'console.log("Hello");',
        'README.md': '# Test Project',
      };

      await adapter.pushFiles({
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        files,
        commitMessage: 'Initial commit',
      });

      expect(mockOctokit.git.createBlob).toHaveBeenCalledTimes(2);
      expect(mockOctokit.git.createTree).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        base_tree: 'tree-sha',
        tree: [
          { path: 'src/index.ts', mode: '100644', type: 'blob', sha: 'blob-sha' },
          { path: 'README.md', mode: '100644', type: 'blob', sha: 'blob-sha' },
        ],
      });
      expect(mockOctokit.git.createCommit).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        message: 'Initial commit',
        tree: 'new-tree-sha',
        parents: ['abc123'],
      });
      expect(mockOctokit.git.updateRef).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        ref: 'heads/main',
        sha: 'new-commit-sha',
        force: true,
      });
    });
  });
});

describe('parseRepoUrl', () => {
  it('should parse HTTPS GitHub URLs', () => {
    const result = parseRepoUrl('https://github.com/owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should parse HTTPS GitHub URLs with .git suffix', () => {
    const result = parseRepoUrl('https://github.com/owner/repo.git');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should parse SSH GitHub URLs', () => {
    const result = parseRepoUrl('git@github.com:owner/repo.git');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should throw error for invalid URLs', () => {
    expect(() => parseRepoUrl('invalid-url')).toThrow('Unable to parse owner/repo from URL');
  });
});

describe('pushFiles convenience function', () => {
  it('should parse repo URL and call adapter', async () => {
    const mockPushFiles = vi.fn();
    vi.mocked(GitHubAdapter).mockImplementation(() => ({
      pushFiles: mockPushFiles,
    } as any));

    await pushFiles({
      repoUrl: 'https://github.com/owner/repo',
      branch: 'main',
      files: { 'test.js': 'console.log("test");' },
      commitMessage: 'Test commit',
      accessToken: 'test-token',
    });

    expect(mockPushFiles).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      files: { 'test.js': 'console.log("test");' },
      commitMessage: 'Test commit',
    });
  });
});
