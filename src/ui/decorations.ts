/**
 * UI Decorations Module
 * Handles visual highlighting in VS Code editor
 */

import * as vscode from 'vscode';

export class DecorationManager {
  private decorationTypes: Map<number, vscode.TextEditorDecorationType> = new Map();

  constructor() {
    this.initializeDecorationTypes();
  }

  /**
   * Initialize decoration types for different risk levels
   */
  private initializeDecorationTypes(): void {
    // High risk (8-10)
    this.decorationTypes.set(
      3,
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 100, 100, 0.15)',
        border: '1px solid rgba(255, 100, 100, 0.4)',
        borderRadius: '3px',
        overviewRulerColor: 'rgba(255, 100, 100, 0.8)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        after: {
          contentText: ' 👻',
          color: 'rgba(255, 100, 100, 0.8)',
        },
      })
    );

    // Medium risk (5-7)
    this.decorationTypes.set(
      2,
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 200, 100, 0.12)',
        border: '1px solid rgba(255, 200, 100, 0.3)',
        borderRadius: '3px',
        overviewRulerColor: 'rgba(255, 200, 100, 0.7)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        after: {
          contentText: ' 👻',
          color: 'rgba(255, 200, 100, 0.7)',
        },
      })
    );

    // Low risk (1-4)
    this.decorationTypes.set(
      1,
      vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(100, 150, 255, 0.1)',
        border: '1px solid rgba(100, 150, 255, 0.25)',
        borderRadius: '3px',
        overviewRulerColor: 'rgba(100, 150, 255, 0.6)',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        after: {
          contentText: ' 👻',
          color: 'rgba(100, 150, 255, 0.6)',
        },
      })
    );
  }

  /**
   * Apply decorations to an editor
   */
  applyDecorations(
    editor: vscode.TextEditor,
    decorations: Array<{
      line: number;
      riskLevel: 1 | 2 | 3;
      hoverMessage: vscode.MarkdownString;
    }>
  ): void {
    // Group decorations by risk level
    const decorationsByLevel = new Map<number, vscode.DecorationOptions[]>();

    for (const dec of decorations) {
      if (!decorationsByLevel.has(dec.riskLevel)) {
        decorationsByLevel.set(dec.riskLevel, []);
      }

      const range = editor.document.lineAt(dec.line).range;
      decorationsByLevel.get(dec.riskLevel)!.push({
        range,
        hoverMessage: dec.hoverMessage,
      });
    }

    // Apply decorations for each risk level
    for (const [level, decs] of decorationsByLevel) {
      const decorationType = this.decorationTypes.get(level);
      if (decorationType) {
        editor.setDecorations(decorationType, decs);
      }
    }
  }

  /**
   * Clear all decorations from an editor
   */
  clearDecorations(editor: vscode.TextEditor): void {
    for (const decorationType of this.decorationTypes.values()) {
      editor.setDecorations(decorationType, []);
    }
  }

  /**
   * Map risk score to risk level (1-3)
   */
  getRiskLevel(score: number): 1 | 2 | 3 {
    if (score >= 8) return 3; // High
    if (score >= 5) return 2; // Medium
    return 1; // Low
  }

  /**
   * Create hover message for a scan result
   */
  createHoverMessage(
    riskScore: number,
    category: string,
    reason: string,
    commitShas: string[],
    patternDetails?: any
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.supportHtml = true;
    md.isTrusted = true;

    // Header with ghost emoji and risk score
    md.appendMarkdown(`### 👻 CodeGhost Alert\n\n`);
    
    // Risk meter with proper visual
    const riskMeter = this.generateRiskMeter(riskScore);
    md.appendMarkdown(`**Risk Score:** ${riskScore}/10 ${riskMeter}\n\n`);

    // Category with better formatting
    const categoryDisplay = category.replace(/_/g, ' ').toUpperCase();
    md.appendMarkdown(`**Category:** ${categoryDisplay}\n\n`);

    // Detailed issue description
    md.appendMarkdown(`**Issue:** ${reason}\n\n`);

    // Show code examples if available
    if (patternDetails?.buggyExample && patternDetails?.fixedExample) {
      md.appendMarkdown(`---\n\n`);
      md.appendMarkdown(`**❌ Previous Bug:**\n\`\`\`\n${patternDetails.buggyExample.trim()}\n\`\`\`\n\n`);
      md.appendMarkdown(`**✅ How it was fixed:**\n\`\`\`\n${patternDetails.fixedExample.trim()}\n\`\`\`\n\n`);
      md.appendMarkdown(`---\n\n`);
    }

    // Commit references with better formatting
    if (commitShas.length > 0 && patternDetails?.commits) {
      md.appendMarkdown(`**📝 Found in commits:**\n\n`);
      
      // Deduplicate commits by SHA
      const uniqueCommits = new Map();
      for (const commit of patternDetails.commits) {
        const sha = commit.sha;
        if (!uniqueCommits.has(sha)) {
          uniqueCommits.set(sha, commit);
        }
      }
      
      const commits = Array.from(uniqueCommits.values());
      const totalOccurrences = patternDetails.commits.length;
      
      for (let i = 0; i < Math.min(3, commits.length); i++) {
        const commit = commits[i];
        const shortSha = commit.sha.substring(0, 7);
        const message = commit.message || 'Bug fix';
        md.appendMarkdown(`- \`${shortSha}\` ${message}\n`);
      }
      
      if (commits.length > 3) {
        md.appendMarkdown(`\n*...and ${commits.length - 3} more unique commit(s)*\n`);
      }
      
      if (totalOccurrences > commits.length) {
        md.appendMarkdown(`\n*Total: ${totalOccurrences} occurrences across ${commits.length} commit(s)*\n`);
      }
    }

    return md;
  }

  /**
   * Generate visual risk meter
   */
  private generateRiskMeter(score: number): string {
    const filled = Math.round((score / 10) * 5);
    const empty = 5 - filled;
    return '🔴'.repeat(filled) + '⚪'.repeat(empty);
  }

  /**
   * Dispose all decoration types
   */
  dispose(): void {
    for (const decorationType of this.decorationTypes.values()) {
      decorationType.dispose();
    }
    this.decorationTypes.clear();
  }
}
