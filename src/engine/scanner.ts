/**
 * Real-Time Code Scanner
 * Scans code as user types and matches against patterns
 */

import { BugPattern, ScanResult } from '../types';
import { PatternStore } from './patternStore';
import { RiskScorer } from './riskScorer';

export class CodeScanner {
  private riskScorer: RiskScorer;

  constructor(private patternStore: PatternStore) {
    this.riskScorer = new RiskScorer();
  }

  /**
   * Scan a single line of code
   */
  scanLine(
    line: string,
    lineNumber: number,
    language: string,
    filePath: string
  ): ScanResult[] {
    const results: ScanResult[] = [];
    const patterns = this.patternStore.getPatternsByLanguage(language);

    // Only log on first line to avoid spam
    if (lineNumber === 0) {
      console.log(`[CodeGhost Scanner] Starting scan with ${patterns.length} patterns for language: ${language}`);
    }

    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern.regex, 'gi');
        const matches = line.match(regex);

        if (matches) {
          const riskScore = this.riskScorer.calculateRiskScore(
            pattern,
            filePath,
            this.patternStore
          );

          results.push({
            lineNumber,
            riskScore,
            patternId: pattern.id,
            commitShas: pattern.commits.map((c) => c.sha),
            shortReason: this.generateReason(pattern),
            category: pattern.category,
          });
        }
      } catch (error) {
        // Invalid regex pattern, skip it
        console.error(`[CodeGhost Scanner] Invalid regex pattern: ${pattern.regex}`, error);
      }
    }

    return results;
  }

  /**
   * Scan multiple lines (e.g., entire function or file)
   */
  scanLines(
    lines: string[],
    startLineNumber: number,
    language: string,
    filePath: string
  ): ScanResult[] {
    const results: ScanResult[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineResults = this.scanLine(
        lines[i],
        startLineNumber + i,
        language,
        filePath
      );
      results.push(...lineResults);
    }

    return results;
  }

  /**
   * Generate human-readable reason for a pattern match
   */
  private generateReason(pattern: BugPattern): string {
    const baseTemplates: Record<string, string> = {
      null_check_missing:
        'Missing null/undefined check',
      off_by_one_loop:
        'Off-by-one error in loop boundary',
      missing_await:
        'Missing await keyword for async operation',
      undefined_access:
        'Unsafe array/object access',
      race_condition:
        'Potential race condition',
      memory_leak:
        'Possible memory leak',
      type_error:
        'Type mismatch error',
      logic_error:
        'Logic error',
      other:
        'Suspicious pattern',
    };

    const baseReason = baseTemplates[pattern.category] || baseTemplates.other;
    
    // Add specific context from the pattern
    if (pattern.commits.length > 0) {
      const firstCommit = pattern.commits[0];
      const fileName = firstCommit.file.split(/[\\/]/).pop() || firstCommit.file;
      
      if (pattern.occurrence_count > 1) {
        return `${baseReason} (found ${pattern.occurrence_count}x in history)`;
      } else {
        return `${baseReason} in ${fileName}`;
      }
    }
    
    return baseReason;
  }

  /**
   * Get pattern details by ID
   */
  getPatternDetails(patternId: string): BugPattern | undefined {
    return this.patternStore.getPatterns().find((p) => p.id === patternId);
  }
}
