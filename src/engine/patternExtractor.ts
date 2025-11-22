/**
 * Pattern Extractor Module
 * Extracts bug patterns from commit diffs
 */

import { BugPattern, GitHubCommit, GitHubFile, BugCategory } from '../types';

export class PatternExtractor {
  /**
   * Extract bug patterns from a list of bug commits
   */
  extractPatterns(commits: GitHubCommit[]): BugPattern[] {
    const patterns: BugPattern[] = [];
    const patternMap = new Map<string, BugPattern>();

    console.log(`[CodeGhost] Extracting patterns from ${commits.length} commits`);

    for (const commit of commits) {
      if (!commit.files) {
        console.log(`[CodeGhost] Commit ${commit.sha} has no files`);
        continue;
      }

      console.log(`[CodeGhost] Processing commit ${commit.sha.substring(0, 7)} with ${commit.files.length} files`);

      for (const file of commit.files) {
        if (!file.patch) {
          console.log(`[CodeGhost] File ${file.filename} has no patch`);
          continue;
        }

        console.log(`[CodeGhost] Extracting patterns from ${file.filename}`);
        const filePatterns = this.extractPatternsFromDiff(file, commit);
        console.log(`[CodeGhost] Found ${filePatterns.length} patterns in ${file.filename}`);
        
        for (const pattern of filePatterns) {
          const key = `${pattern.regex}_${pattern.category}`;
          
          if (patternMap.has(key)) {
            // Update existing pattern
            const existing = patternMap.get(key)!;
            existing.occurrence_count++;
            existing.commits.push(...pattern.commits);
          } else {
            // Add new pattern
            patternMap.set(key, pattern);
          }
        }
      }
    }

    const result = Array.from(patternMap.values());
    console.log(`[CodeGhost] Total patterns extracted: ${result.length}`);
    return result;
  }

  /**
   * Extract patterns from a single file diff
   */
  private extractPatternsFromDiff(file: GitHubFile, commit: GitHubCommit): BugPattern[] {
    const patterns: BugPattern[] = [];
    const language = this.detectLanguage(file.filename);
    const lines = file.patch!.split('\n');

    let lineNumber = 0;
    let inRemovalBlock = false;
    const removedLines: string[] = [];

    for (const line of lines) {
      // Track line numbers
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+)/);
        if (match) {
          lineNumber = parseInt(match[1], 10);
        }
        continue;
      }

      if (line.startsWith('-') && !line.startsWith('---')) {
        // Line that was removed (buggy code)
        inRemovalBlock = true;
        removedLines.push(line.substring(1).trim());
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        // Line that was added (fixed code)
        if (inRemovalBlock && removedLines.length > 0) {
          // Analyze the bug pattern
          const pattern = this.analyzeBugPattern(
            removedLines[removedLines.length - 1],
            line.substring(1).trim(),
            language,
            commit,
            file.filename,
            lineNumber
          );

          if (pattern) {
            patterns.push(pattern);
          }
        }
        inRemovalBlock = false;
        lineNumber++;
      } else {
        inRemovalBlock = false;
        if (!line.startsWith('\\')) {
          lineNumber++;
        }
      }
    }

    return patterns;
  }

  /**
   * Analyze a bug pattern by comparing buggy and fixed lines
   */
  private analyzeBugPattern(
    buggyLine: string,
    fixedLine: string,
    language: string,
    commit: GitHubCommit,
    filename: string,
    lineNumber: number
  ): BugPattern | null {
    // Skip empty lines
    if (!buggyLine.trim() || !fixedLine.trim()) {
      return null;
    }

    // Pattern detection rules
    const detectors = [
      this.detectNullCheck,
      this.detectOffByOneLoop,
      this.detectMissingAwait,
      this.detectUndefinedAccess,
      this.detectTypeError,
    ];

    for (const detector of detectors) {
      const result = detector.call(this, buggyLine, fixedLine, language);
      if (result) {
        return {
          id: this.generatePatternId(),
          language,
          regex: result.regex,
          category: result.category,
          risk_base: result.riskBase,
          commits: [
            {
              sha: commit.sha,
              file: filename,
              line: lineNumber,
              message: commit.commit.message.split('\n')[0],
            },
          ],
          occurrence_count: 1,
          buggyExample: buggyLine,
          fixedExample: fixedLine,
        };
      }
    }

    return null;
  }

  /**
   * Detect missing null/undefined checks
   */
  private detectNullCheck(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check if fixed line adds optional chaining, null check, or similar
    const hasNullCheckAdded =
      (fixedLine.includes('?.') && !buggyLine.includes('?.')) ||
      (fixedLine.includes('&&') && !buggyLine.includes('&&')) ||
      (fixedLine.includes('if') && fixedLine.includes('null')) ||
      (fixedLine.includes('if') && fixedLine.includes('undefined'));

    if (hasNullCheckAdded && buggyLine.includes('.')) {
      // Extract the actual variable name being accessed
      const match = buggyLine.match(/(\w+)\.(\w+)/);
      if (match) {
        const varName = match[1];
        // Create specific pattern for this variable access
        return {
          regex: String.raw`\b${varName}\.\w+(?!\?)`,
          category: 'null_check_missing',
          riskBase: 8,
        };
      }
    }

    return null;
  }

  /**
   * Detect off-by-one errors in loops
   */
  private detectOffByOneLoop(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check if loop boundary was changed from <= to <
    if (buggyLine.includes('<=') && fixedLine.includes('<') && !fixedLine.includes('<=')) {
      const loopMatch = buggyLine.match(/for\s*\([^;]*;\s*\w+\s*<=\s*(\w+)\.length/);
      if (loopMatch) {
        const arrayName = loopMatch[1];
        return {
          regex: String.raw`for\s*\([^;]*;\s*\w+\s*<=\s*${arrayName}\.length`,
          category: 'off_by_one_loop',
          riskBase: 9, // High risk - causes array index errors
        };
      }
    }

    return null;
  }

  /**
   * Detect missing await keywords
   */
  private detectMissingAwait(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    if (
      (language === 'ts' || language === 'js') &&
      fixedLine.includes('await') &&
      !buggyLine.includes('await')
    ) {
      // Extract the actual function name
      const match = buggyLine.match(/(\w+)\s*\(/);
      if (match) {
        const funcName = match[1];
        return {
          regex: String.raw`(?<!await\s+)${funcName}\s*\(`,
          category: 'missing_await',
          riskBase: 7, // Medium-high risk - causes race conditions
        };
      }
    }

    return null;
  }

  /**
   * Detect undefined access patterns
   */
  private detectUndefinedAccess(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check for array/object access without guards
    if (
      buggyLine.match(/\[\w+\]/) &&
      (fixedLine.includes('?.[') || fixedLine.includes('&&'))
    ) {
      return {
        regex: String.raw`\w+\[\w+\](?!\?)`,
        category: 'undefined_access',
        riskBase: 7,
      };
    }

    return null;
  }

  /**
   * Detect type errors
   */
  private detectTypeError(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check for type casting or type guards added
    if (
      (language === 'ts' || language === 'js') &&
      (fixedLine.includes(' as ') || fixedLine.includes('typeof'))
    ) {
      return {
        regex: String.raw`\w+\s*=\s*\w+(?!\s+as\s+)`,
        category: 'type_error',
        riskBase: 5,
      };
    }

    return null;
  }

  /**
   * Detect programming language from filename
   */
  private detectLanguage(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      tsx: 'typescript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
    };

    return languageMap[extension || ''] || 'unknown';
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
