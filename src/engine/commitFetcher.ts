/**
 * Commit Fetcher Module
 * Fetches commits from GitHub and identifies bug-related ones
 */

import axios, { AxiosInstance } from 'axios';
import { GitHubCommit } from '../types';

export class CommitFetcher {
  private axiosInstance: AxiosInstance;
  private bugKeywords = ['fix', 'bug', 'error', 'crash', 'hotfix', 'issue', 'patch'];

  constructor(private token: string) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  /**
   * Fetch commits from a GitHub repository
   */
  async fetchCommits(
    owner: string,
    repo: string,
    maxCommits: number = 100
  ): Promise<GitHubCommit[]> {
    try {
      const perPage = Math.min(maxCommits, 100);
      const pages = Math.ceil(maxCommits / perPage);
      const allCommits: GitHubCommit[] = [];

      for (let page = 1; page <= pages; page++) {
        const response = await this.axiosInstance.get<GitHubCommit[]>(
          `/repos/${owner}/${repo}/commits`,
          {
            params: {
              per_page: perPage,
              page,
            },
          }
        );

        allCommits.push(...response.data);

        if (response.data.length < perPage) {
          break; // No more commits
        }
      }

      return allCommits.slice(0, maxCommits);
    } catch (error: any) {
      throw new Error(`Failed to fetch commits: ${error.message}`);
    }
  }

  /**
   * Filter commits that are likely bug fixes
   */
  filterBugCommits(commits: GitHubCommit[]): GitHubCommit[] {
    return commits.filter((commit) => {
      const message = commit.commit.message.toLowerCase();
      return this.bugKeywords.some((keyword) => message.includes(keyword));
    });
  }

  /**
   * Fetch detailed commit info including file diffs
   */
  async fetchCommitDetails(
    owner: string,
    repo: string,
    sha: string
  ): Promise<GitHubCommit> {
    try {
      const response = await this.axiosInstance.get<GitHubCommit>(
        `/repos/${owner}/${repo}/commits/${sha}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch commit details for ${sha}: ${error.message}`);
    }
  }

  /**
   * Parse GitHub repository URL to extract owner and repo
   */
  static parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const patterns = [
      /github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/,
      /github\.com\/([^/]+)\/([^/]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', ''),
        };
      }
    }

    return null;
  }

  /**
   * Get remote URL from git config
   */
  static async getRemoteUrl(workspacePath: string): Promise<string | null> {
    const fs = require('fs');
    const path = require('path');

    try {
      const gitConfigPath = path.join(workspacePath, '.git', 'config');
      if (!fs.existsSync(gitConfigPath)) {
        return null;
      }

      const config = fs.readFileSync(gitConfigPath, 'utf-8');
      const match = config.match(/url\s*=\s*(.+)/);
      return match ? match[1].trim() : null;
    } catch {
      return null;
    }
  }
}
