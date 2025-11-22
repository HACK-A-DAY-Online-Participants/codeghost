/**
 * Local Git Fetcher Module
 * Fetches commits from local git repository
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { GitHubCommit, GitHubFile } from '../types';

const execAsync = promisify(exec);

export class LocalGitFetcher {
  constructor(private workspacePath: string) {}

  /**
   * Fetch commits from local git repository
   */
  async fetchCommits(maxCommits: number = 100): Promise<GitHubCommit[]> {
    try {
      const { stdout } = await execAsync(
        `git log -${maxCommits} --pretty=format:"%H|%s|%an|%ad" --date=iso`,
        { cwd: this.workspacePath }
      );

      const lines = stdout.trim().split('\n');
      const commits: GitHubCommit[] = [];

      for (const line of lines) {
        const [sha, message, author, date] = line.split('|');
        if (sha && message) {
          commits.push({
            sha,
            commit: {
              message,
              author: {
                name: author || 'Unknown',
                date: date || new Date().toISOString(),
              },
            },
          });
        }
      }

      return commits;
    } catch (error: any) {
      throw new Error(`Failed to fetch local commits: ${error.message}`);
    }
  }

  /**
   * Filter commits that are likely bug fixes
   */
  filterBugCommits(commits: GitHubCommit[]): GitHubCommit[] {
    const bugKeywords = ['fix', 'bug', 'error', 'crash', 'hotfix', 'issue', 'patch'];
    return commits.filter((commit) => {
      const message = commit.commit.message.toLowerCase();
      return bugKeywords.some((keyword) => message.includes(keyword));
    });
  }

  /**
   * Fetch detailed commit info with diffs
   */
  async fetchCommitDetails(sha: string): Promise<GitHubCommit> {
    try {
      // Get commit message
      const { stdout: commitMsg } = await execAsync(
        `git log --format=%s -n 1 ${sha}`,
        { cwd: this.workspacePath }
      );

      // Get commit author and date
      const { stdout: authorInfo } = await execAsync(
        `git log --format="%an|%ad" --date=iso -n 1 ${sha}`,
        { cwd: this.workspacePath }
      );

      const [author, date] = authorInfo.trim().split('|');

      // Get diff for each file
      const { stdout: diffOutput } = await execAsync(
        `git show --unified=3 --format="" ${sha}`,
        { cwd: this.workspacePath }
      );

      const files = this.parseDiff(diffOutput);

      return {
        sha,
        commit: {
          message: commitMsg.trim(),
          author: {
            name: author || 'Unknown',
            date: date || new Date().toISOString(),
          },
        },
        files,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch commit details for ${sha}: ${error.message}`);
    }
  }

  /**
   * Parse git diff output into file changes
   */
  private parseDiff(diffOutput: string): GitHubFile[] {
    const files: GitHubFile[] = [];
    
    // Split by "diff --git" but keep the delimiter
    const fileDiffs = diffOutput.split(/(?=diff --git)/);

    for (const fileDiff of fileDiffs) {
      if (!fileDiff.trim() || !fileDiff.includes('diff --git')) continue;

      // Extract filename from "diff --git a/file.ts b/file.ts"
      const filenameMatch = fileDiff.match(/diff --git a\/(.+?)\s+b\/(.+?)(?:\n|$)/);
      if (!filenameMatch) continue;

      const filename = filenameMatch[2].trim();

      // Extract the patch - everything from @@ onwards
      const patchMatch = fileDiff.match(/@@ [^\n]+[\s\S]*$/);
      if (!patchMatch) continue;

      const patch = patchMatch[0];

      // Count additions and deletions
      const lines = patch.split('\n');
      let additions = 0;
      let deletions = 0;

      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++;
        if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      }

      files.push({
        filename,
        status: 'modified',
        additions,
        deletions,
        changes: additions + deletions,
        patch,
      });
    }

    return files;
  }

  /**
   * Check if directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.workspacePath });
      return true;
    } catch {
      return false;
    }
  }
}
