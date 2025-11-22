/**
 * Risk Scoring Engine
 * Calculates risk scores for pattern matches
 */

import { BugPattern } from '../types';
import { PatternStore } from './patternStore';

export class RiskScorer {
  /**
   * Calculate risk score for a matched pattern
   */
  calculateRiskScore(
    pattern: BugPattern,
    filePath: string,
    patternStore: PatternStore
  ): number {
    // Start with base risk from pattern category
    let score = pattern.risk_base;

    // Factor 1: Occurrence count (diminishing returns)
    // 1 occurrence: +0, 2: +0.5, 3: +1, 5: +1.5, 10: +2
    const occurrenceBonus = Math.min(
      2,
      Math.log(pattern.occurrence_count + 1) / Math.log(2)
    );
    score += occurrenceBonus;

    // Factor 2: File-specific bug history (max +1.5)
    const fileHistoryBonus = this.calculateFileHistoryFactor(filePath, patternStore);
    score += fileHistoryBonus;

    // Factor 3: Pattern specificity - more specific patterns are lower risk
    // Generic patterns get -1, specific patterns stay neutral
    if (pattern.regex.includes('\\w+') && pattern.regex.length < 30) {
      score -= 0.5; // Slightly reduce score for very generic patterns
    }

    // Clamp score to 1-10 range and ensure variety
    const finalScore = Math.max(1, Math.min(10, Math.round(score)));
    
    // Add some variance based on pattern category to prevent all patterns having same score
    // Use category name to generate a consistent but varied offset
    let variance = 0;
    if (pattern.category) {
      const hash = pattern.category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      variance = (hash % 3) - 1; // -1, 0, or 1
    }
    
    const result = Math.max(1, Math.min(10, finalScore + variance));
    
    return result;
  }

  /**
   * Calculate bonus based on file's bug history
   */
  private calculateFileHistoryFactor(
    filePath: string,
    patternStore: PatternStore
  ): number {
    const fileName = filePath.split(/[\\/]/).pop() || '';
    const patterns = patternStore.getPatterns();

    let fileOccurrences = 0;
    for (const pattern of patterns) {
      for (const commit of pattern.commits) {
        if (commit.file.includes(fileName)) {
          fileOccurrences++;
        }
      }
    }

    // Files with more historical bugs get higher scores
    if (fileOccurrences >= 5) return 1.5;
    if (fileOccurrences >= 3) return 1.0;
    if (fileOccurrences >= 1) return 0.5;
    return 0;
  }

  /**
   * Calculate bonus based on how recent the bugs are
   */
  private calculateRecencyFactor(pattern: BugPattern): number {
    // For MVP, we don't have commit dates easily accessible
    // In V1, we could parse dates and give higher scores to recent bugs
    // For now, return a small constant bonus
    return 0.5;
  }

  /**
   * Adjust score based on sensitivity setting
   */
  adjustForSensitivity(
    score: number,
    sensitivity: 'low' | 'medium' | 'high'
  ): number {
    switch (sensitivity) {
      case 'low':
        // Only show high-risk items (7+)
        return score >= 7 ? score : 0;
      case 'medium':
        // Show medium and high risk (5+)
        return score >= 5 ? score : 0;
      case 'high':
        // Show all risks (3+)
        return score >= 3 ? score : 0;
      default:
        return score;
    }
  }
}
