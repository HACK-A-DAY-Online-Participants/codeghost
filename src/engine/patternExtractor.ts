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
        continue;
      }

      console.log(`[CodeGhost] Processing commit ${commit.sha.substring(0, 7)} with ${commit.files.length} files`);

      for (const file of commit.files) {
        if (!file.patch) {
          continue;
        }

        const filePatterns = this.extractPatternsFromDiff(file, commit);
        
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
          const buggyLine = removedLines[removedLines.length - 1];
          const fixedLine = line.substring(1).trim();
          
          // Analyze the bug pattern
          const pattern = this.analyzeBugPattern(
            buggyLine,
            fixedLine,
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

    // Skip comment-only changes
    if (buggyLine.trim().startsWith('//') && fixedLine.trim().startsWith('//')) {
      return null;
    }

    // Pattern detection rules
    const detectors = [
      this.detectNullCheck,
      this.detectOffByOneLoop,
      this.detectMissingAwait,
      this.detectUndefinedAccess,
      this.detectTypeError,
      this.detectLooseEquality,
      this.detectMissingErrorHandling,
      this.detectMemoryLeak,
      this.detectUnhandledPromise,
      this.detectVarScoping,
      this.detectRaceCondition,
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
      // Extract the specific variable/object being accessed
      const match = buggyLine.match(/(\w+)\.(\w+)/);
      if (match) {
        const varName = match[1];
        const propName = match[2];
        // Create specific pattern that matches this exact property chain without optional chaining
        // Only match when the property is accessed directly (not already safe)
        return {
          regex: String.raw`\b${varName}\.${propName}\b(?!\?)`,
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
      // Check for any .length or other boundary patterns
      if (buggyLine.match(/for\s*\([^;]*;\s*\w+\s*<=\s*.*\.length/) ||
          buggyLine.match(/for\s*\([^;]*;\s*\w+\s*<=\s*\w+/)) {
        return {
          regex: String.raw`for\s*\([^;]*;\s*\w+\s*<=\s*\w+\.length`,
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
      (language === 'typescript' || language === 'javascript') &&
      fixedLine.includes('await') &&
      !buggyLine.includes('await')
    ) {
      // Extract the specific function being called
      const match = buggyLine.match(/(\w+)\s*\(/); 
      if (match) {
        const funcName = match[1];
        // Only match this specific function call without await
        return {
          regex: String.raw`(?<!await\s+)\b${funcName}\s*\(`,
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
      (language === 'typescript' || language === 'javascript') &&
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
   * Detect loose equality operators
   */
  private detectLooseEquality(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check if == or != was changed to === or !==
    if (
      (buggyLine.includes('==') && !buggyLine.includes('===') && fixedLine.includes('===')) ||
      (buggyLine.includes('!=') && !buggyLine.includes('!==') && fixedLine.includes('!=='))
    ) {
      // Extract what's being compared
      const eqMatch = buggyLine.match(/(\w+)\s*==\s*(\w+)/);
      const neMatch = buggyLine.match(/(\w+)\s*!=\s*(\w+)/);
      
      if (eqMatch) {
        return {
          regex: String.raw`\b${eqMatch[1]}\s*==\s*${eqMatch[2]}\b`,
          category: 'loose_equality',
          riskBase: 5,
        };
      } else if (neMatch) {
        return {
          regex: String.raw`\b${neMatch[1]}\s*!=\s*${neMatch[2]}\b`,
          category: 'loose_equality',
          riskBase: 5,
        };
      }
    }

    return null;
  }

  /**
   * Detect missing error handling
   */
  private detectMissingErrorHandling(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check if try-catch was added
    if (
      (fixedLine.includes('try') || fixedLine.includes('catch')) &&
      !buggyLine.includes('try') &&
      !buggyLine.includes('catch')
    ) {
      // Extract the specific risky operation
      const parseMatch = buggyLine.match(/JSON\.parse\s*\([^)]*\)/);
      const fetchMatch = buggyLine.match(/fetch\s*\([^)]*\)/);
      const jsonMatch = buggyLine.match(/\.json\s*\(/);
      
      if (parseMatch) {
        return {
          regex: String.raw`JSON\.parse\s*\([^)]*\)`,
          category: 'missing_error_handling',
          riskBase: 7,
        };
      } else if (jsonMatch) {
        return {
          regex: String.raw`\.json\s*\(\s*\)`,
          category: 'missing_error_handling',
          riskBase: 7,
        };
      } else if (fetchMatch) {
        return {
          regex: String.raw`fetch\s*\([^)]+\)`,
          category: 'missing_error_handling',
          riskBase: 7,
        };
      }
    }

    return null;
  }

  /**
   * Detect memory leaks
   */
  private detectMemoryLeak(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check if cleanup was added (return cleanup function, clearInterval, close, unsubscribe)
    if (
      (fixedLine.includes('return') && fixedLine.includes('()')) ||
      fixedLine.includes('clearInterval') ||
      fixedLine.includes('clearTimeout') ||
      fixedLine.includes('.close()') ||
      fixedLine.includes('unsubscribe')
    ) {
      // Only flag if the buggy line actually creates a resource without cleanup
      if (buggyLine.includes('setInterval') && !buggyLine.includes('const') && !buggyLine.includes('let')) {
        return {
          regex: String.raw`setInterval\s*\([^)]+\)[^;]*;(?!.*const|.*let)`,
          category: 'memory_leak',
          riskBase: 6,
        };
      } else if (buggyLine.includes('.watch(') && !buggyLine.includes('const') && !buggyLine.includes('let')) {
        return {
          regex: String.raw`\.watch\s*\([^)]+\)[^;]*;(?!.*const|.*let)`,
          category: 'memory_leak',
          riskBase: 6,
        };
      } else if (buggyLine.includes('.push(') && buggyLine.includes('listeners')) {
        // Specific pattern for event subscription without return
        return {
          regex: String.raw`\.push\s*\(\s*callback\s*\)\s*;(?!.*return)`,
          category: 'memory_leak',
          riskBase: 6,
        };
      }
    }

    return null;
  }

  /**
   * Detect unhandled promise rejections
   */
  private detectUnhandledPromise(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check if .catch() was added to promise chain
    if (
      fixedLine.includes('.catch') &&
      !buggyLine.includes('.catch')
    ) {
      return {
        regex: String.raw`\.\s*then\s*\([^)]*\)(?!\s*\.\s*catch)`,
        category: 'unhandled_promise',
        riskBase: 6,
      };
    }

    return null;
  }

  /**
   * Detect var scoping issues
   */
  private detectVarScoping(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check if var was changed to let or const
    if (buggyLine.includes('var ') && (fixedLine.includes('let ') || fixedLine.includes('const '))) {
      return {
        regex: String.raw`\bvar\s+\w+`,
        category: 'var_scoping',
        riskBase: 4,
      };
    }

    return null;
  }

  /**
   * Detect race conditions
   */
  private detectRaceCondition(
    buggyLine: string,
    fixedLine: string,
    language: string
  ): { regex: string; category: BugCategory; riskBase: number } | null {
    // Check if locking/mutex/synchronization was added
    if (
      (fixedLine.includes('lock') || fixedLine.includes('mutex') || fixedLine.includes('while')) &&
      (!buggyLine.includes('lock') && !buggyLine.includes('mutex') && !buggyLine.includes('while'))
    ) {
      // Look for specific state mutations with comments about race conditions
      if (buggyLine.includes('this.state[') && buggyLine.includes('=')) {
        const match = buggyLine.match(/this\.state\[(\w+)\]/);
        if (match) {
          return {
            regex: String.raw`this\.state\[${match[1]}\]\s*=`,
            category: 'race_condition',
            riskBase: 7,
          };
        }
      } else if (buggyLine.includes('this.') && buggyLine.includes('=') && buggyLine.includes('//')) {
        // Generic this.property = value with race condition comment
        const match = buggyLine.match(/this\.(\w+)\s*=/);
        if (match) {
          return {
            regex: String.raw`this\.${match[1]}\s*=\s*[^;]+;\s*\/\/.*(?:race|concurrent|update)`,
            category: 'race_condition',
            riskBase: 7,
          };
        }
      }
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
