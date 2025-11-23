/**
 * Pattern Store Module
 * Manages local storage of bug patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { BugMemory, BugPattern } from '../types';

export class PatternStore {
  private storePath: string;
  private memory: BugMemory;

  constructor(workspacePath: string) {
    const codeghostDir = path.join(workspacePath, '.codeghost');
    
    // Create .codeghost directory if it doesn't exist
    if (!fs.existsSync(codeghostDir)) {
      fs.mkdirSync(codeghostDir, { recursive: true });
    }

    this.storePath = path.join(codeghostDir, 'bug_memory.json');
    this.memory = this.load();
  }

  /**
   * Load bug memory from disk
   */
  private load(): BugMemory {
    try {
      if (fs.existsSync(this.storePath)) {
        const data = fs.readFileSync(this.storePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load bug memory:', error);
    }

    // Return empty memory if file doesn't exist or is corrupted
    return {
      version: 1,
      generated_at: new Date().toISOString(),
      patterns: [],
    };
  }

  /**
   * Save bug memory to disk
   */
  save(): void {
    try {
      this.memory.generated_at = new Date().toISOString();
      const data = JSON.stringify(this.memory, null, 2);
      fs.writeFileSync(this.storePath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save bug memory:', error);
      throw error;
    }
  }

  /**
   * Get all patterns
   */
  getPatterns(): BugPattern[] {
    return this.memory.patterns;
  }

  /**
   * Get all patterns (alias)
   */
  getAllPatterns(): BugPattern[] {
    return this.memory.patterns;
  }

  /**
   * Get patterns filtered by language
   */
  getPatternsByLanguage(language: string): BugPattern[] {
    const filtered = this.memory.patterns.filter(
      (p) => p.language === language || p.language === 'unknown'
    );
    
    return filtered;
  }

  /**
   * Add new patterns
   */
  addPatterns(patterns: BugPattern[]): void {
    for (const newPattern of patterns) {
      // Check if similar pattern already exists
      const existingIndex = this.memory.patterns.findIndex(
        (p) => p.regex === newPattern.regex && p.category === newPattern.category
      );

      if (existingIndex >= 0) {
        // Merge with existing pattern
        const existing = this.memory.patterns[existingIndex];
        existing.occurrence_count += newPattern.occurrence_count;
        existing.commits.push(...newPattern.commits);
        
        // Update risk base (weighted average)
        existing.risk_base = Math.round(
          (existing.risk_base + newPattern.risk_base) / 2
        );
      } else {
        // Add new pattern
        this.memory.patterns.push(newPattern);
      }
    }

    this.save();
  }

  /**
   * Update last scanned commit SHA
   */
  updateLastScannedSha(sha: string): void {
    this.memory.last_scanned_sha = sha;
    this.save();
  }

  /**
   * Get last scanned commit SHA
   */
  getLastScannedSha(): string | undefined {
    return this.memory.last_scanned_sha;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalPatterns: number;
    totalOccurrences: number;
    categoryCounts: Record<string, number>;
    lastUpdated: string;
  } {
    const categoryCounts: Record<string, number> = {};
    let totalOccurrences = 0;

    for (const pattern of this.memory.patterns) {
      categoryCounts[pattern.category] = (categoryCounts[pattern.category] || 0) + 1;
      totalOccurrences += pattern.occurrence_count;
    }

    return {
      totalPatterns: this.memory.patterns.length,
      totalOccurrences,
      categoryCounts,
      lastUpdated: this.memory.generated_at,
    };
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.memory.patterns = [];
    this.memory.last_scanned_sha = undefined;
    this.save();
  }
}
