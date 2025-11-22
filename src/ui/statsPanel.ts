/**
 * Stats Panel Module
 * Displays CodeGhost statistics in a webview
 */

import * as vscode from 'vscode';
import { PatternStore } from '../engine/patternStore';

export class StatsPanel {
  public static currentPanel: StatsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private patternStore: PatternStore
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.update();
  }

  public static show(patternStore: PatternStore) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (StatsPanel.currentPanel) {
      StatsPanel.currentPanel.panel.reveal(column);
      StatsPanel.currentPanel.update();
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'codeghostStats',
      '👻 CodeGhost Statistics',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    StatsPanel.currentPanel = new StatsPanel(panel, patternStore);
  }

  public update() {
    this.panel.webview.html = this.getWebviewContent();
  }

  private getWebviewContent(): string {
    const stats = this.patternStore.getStats();
    const patterns = this.patternStore.getAllPatterns();

    // Sort patterns by occurrence count
    const sortedPatterns = patterns.sort(
      (a, b) => b.occurrence_count - a.occurrence_count
    );

    // Generate pattern list HTML
    const patternListHtml = sortedPatterns
      .map((pattern) => {
        const categoryDisplay = pattern.category.replace(/_/g, ' ').toUpperCase();
        const riskColor = pattern.risk_base >= 8 ? '#ff4444' : pattern.risk_base >= 6 ? '#ffaa00' : '#44ff44';
        
        return `
          <div class="pattern-card">
            <div class="pattern-header">
              <span class="pattern-category">${categoryDisplay}</span>
              <span class="pattern-risk" style="background-color: ${riskColor}">${pattern.risk_base}/10</span>
            </div>
            <div class="pattern-details">
              <div class="pattern-stat">
                <span class="stat-label">Occurrences:</span>
                <span class="stat-value">${pattern.occurrence_count}</span>
              </div>
              <div class="pattern-stat">
                <span class="stat-label">Language:</span>
                <span class="stat-value">${pattern.language}</span>
              </div>
              <div class="pattern-stat">
                <span class="stat-label">Commits:</span>
                <span class="stat-value">${pattern.commits.length}</span>
              </div>
            </div>
            ${pattern.buggyExample ? `
            <details class="pattern-examples">
              <summary>View Examples</summary>
              <div class="code-examples">
                <div class="code-example">
                  <div class="example-label">❌ Buggy Code:</div>
                  <pre><code>${this.escapeHtml(pattern.buggyExample)}</code></pre>
                </div>
                <div class="code-example">
                  <div class="example-label">✅ Fixed Code:</div>
                  <pre><code>${this.escapeHtml(pattern.fixedExample || 'N/A')}</code></pre>
                </div>
              </div>
            </details>
            ` : ''}
          </div>
        `;
      })
      .join('');

    // Generate category breakdown
    const categoryBreakdown = Object.entries(stats.categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => {
        const percent = ((count / stats.totalPatterns) * 100).toFixed(1);
        return `
          <div class="category-item">
            <span class="category-name">${cat.replace(/_/g, ' ')}</span>
            <span class="category-count">${count} (${percent}%)</span>
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            color: var(--vscode-foreground);
          }
          .header .emoji {
            font-size: 48px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-box {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          .stat-box .value {
            font-size: 36px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            margin: 10px 0;
          }
          .stat-box .label {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
          }
          .section {
            margin: 30px 0;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-foreground);
          }
          .pattern-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
          }
          .pattern-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
          }
          .pattern-category {
            font-size: 16px;
            font-weight: bold;
            color: var(--vscode-foreground);
          }
          .pattern-risk {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            color: white;
          }
          .pattern-details {
            display: flex;
            gap: 20px;
            margin: 10px 0;
          }
          .pattern-stat {
            display: flex;
            gap: 5px;
          }
          .stat-label {
            color: var(--vscode-descriptionForeground);
          }
          .stat-value {
            font-weight: bold;
            color: var(--vscode-foreground);
          }
          .pattern-examples {
            margin-top: 10px;
          }
          .pattern-examples summary {
            cursor: pointer;
            color: var(--vscode-textLink-foreground);
            user-select: none;
          }
          .pattern-examples summary:hover {
            text-decoration: underline;
          }
          .code-examples {
            margin-top: 10px;
          }
          .code-example {
            margin: 10px 0;
          }
          .example-label {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 5px;
            color: var(--vscode-descriptionForeground);
          }
          pre {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
            overflow-x: auto;
            margin: 5px 0;
          }
          code {
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
          }
          .category-item {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .category-name {
            text-transform: capitalize;
          }
          .category-count {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
          }
          .last-updated {
            text-align: center;
            margin-top: 30px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="emoji">👻</div>
          <h1>CodeGhost Statistics</h1>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="value">${stats.totalPatterns}</div>
            <div class="label">Bug Patterns</div>
          </div>
          <div class="stat-box">
            <div class="value">${stats.totalOccurrences}</div>
            <div class="label">Total Occurrences</div>
          </div>
          <div class="stat-box">
            <div class="value">${Object.keys(stats.categoryCounts).length}</div>
            <div class="label">Categories</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📊 Category Breakdown</div>
          ${categoryBreakdown}
        </div>

        <div class="section">
          <div class="section-title">🔍 Detected Patterns</div>
          ${patternListHtml}
        </div>

        <div class="last-updated">
          Last updated: ${new Date(stats.lastUpdated).toLocaleString()}
        </div>
      </body>
      </html>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public dispose() {
    StatsPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
