/**
 * Core type definitions for CodeGhost
 */

export interface BugPattern {
  id: string;
  language: string;
  regex: string;
  category: BugCategory;
  risk_base: number;
  commits: CommitReference[];
  occurrence_count: number;
  buggyExample?: string;
  fixedExample?: string;
}

export interface CommitReference {
  sha: string;
  file: string;
  line: number;
  message: string;
}

export interface BugMemory {
  version: number;
  generated_at: string;
  last_scanned_sha?: string;
  patterns: BugPattern[];
}

export interface ScanResult {
  lineNumber: number;
  riskScore: number;
  patternId: string;
  commitShas: string[];
  shortReason: string;
  category: BugCategory;
}

export type BugCategory =
  | 'null_check_missing'
  | 'off_by_one_loop'
  | 'missing_await'
  | 'undefined_access'
  | 'race_condition'
  | 'memory_leak'
  | 'type_error'
  | 'logic_error'
  | 'loose_equality'
  | 'missing_error_handling'
  | 'unhandled_promise'
  | 'var_scoping'
  | 'other';

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  files?: GitHubFile[];
}

export interface GitHubFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface ExtensionConfig {
  maxCommits: number;
  sensitivity: 'low' | 'medium' | 'high';
  githubToken: string;
  enableGPT: boolean;
  scanOnSaveOnly: boolean;
  enabled: boolean;
}
