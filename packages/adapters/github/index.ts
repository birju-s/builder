// packages/adapters/github/index.ts
import { Octokit } from "@octokit/rest";

export interface GitHubCredential {
  accessToken: string;
}

export class GitHubAdapter {
  private octokit: Octokit;
  constructor(private cred: GitHubCredential) {
    this.octokit = new Octokit({ auth: cred.accessToken });
  }

  async createRepo(name: string, isPrivate = true): Promise<string> {
    const res = await this.octokit.repos.createForAuthenticatedUser({
      name,
      private: isPrivate,
    });
    return res.data.html_url;
  }

  async pushFiles(params: {
    owner: string;
    repo: string;
    branch: string;
    files: Record<string, string>; // path -> content
    commitMessage: string;
  }) {
    const { owner, repo, branch, files, commitMessage } = params;

    // 1. Get current head SHA (or create branch from default)
    const { data: repoData } = await this.octokit.repos.get({ owner, repo });
    const base = repoData.default_branch;

    const { data: latestCommit } = await this.octokit.repos.getCommit({
      owner,
      repo,
      ref: branch === base ? base : `heads/${base}`,
    });

    const baseTree = latestCommit.commit.tree.sha;

    // 2. Create blobs for each file
    const blobs = await Promise.all(
      Object.entries(files).map(async ([path, content]) => {
        const { data } = await this.octokit.git.createBlob({
          owner,
          repo,
          content,
          encoding: "utf-8",
        });
        return { path, sha: data.sha };
      }),
    );

    // 3. Create tree
    const { data: tree } = await this.octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTree,
      tree: blobs.map((b) => ({
        path: b.path,
        mode: "100644",
        type: "blob",
        sha: b.sha,
      })),
    });

    // 4. Create commit
    const { data: commit } = await this.octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: tree.sha,
      parents: [latestCommit.sha],
    });

    // 5. Update ref
    await this.octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
      force: true,
    });
  }
}

/**
 * Utility: extract `{ owner, repo }` from any GitHub URL formats:
 *  - https://github.com/owner/repo
 *  - git@github.com:owner/repo.git
 *  - https://github.com/owner/repo.git
 */
function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  // Remove trailing ".git"
  const sanitized = repoUrl.replace(/\.git$/, "");

  // SSH style: git@github.com:owner/repo
  const sshMatch = sanitized.match(/github\\.com[:/](?<owner>[^/]+)\\/(?<repo>[^/]+)$/);
  if (sshMatch?.groups) {
    return { owner: sshMatch.groups.owner, repo: sshMatch.groups.repo };
  }

  // HTTPS style: https://github.com/owner/repo
  try {
    const url = new URL(sanitized);
    const [owner, repo] = url.pathname.replace(/^\\//, "").split("/");
    if (owner && repo) return { owner, repo };
  } catch {
    /* fall through */
  }

  throw new Error(`Unable to parse owner/repo from URL: ${repoUrl}`);
}

export interface PushFilesParams {
  repoUrl: string;
  branch: string;
  files: Record<string, string>;
  commitMessage: string;
  accessToken: string;
}

/**
 * Convenience wrapper so callers can simply provide a repo URL and token.
 *
 * Example:
 *   await pushFiles({
 *     repoUrl: "https://github.com/acme/my-app",
 *     branch: "main",
 *     files: { "README.md": "# Hello" },
 *     commitMessage: "chore: auto-sync",
 *     accessToken
 *   })
 */
export async function pushFiles(params: PushFilesParams) {
  const { repoUrl, accessToken, ...rest } = params;
  const { owner, repo } = parseRepoUrl(repoUrl);

  const gh = new GitHubAdapter({ accessToken });
  await gh.pushFiles({ owner, repo, ...rest });
}

// Re-export for backwards compatibility with earlier imports
export { parseRepoUrl };
