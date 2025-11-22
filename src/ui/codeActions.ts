/**
 * Code Actions Module
 * Provides inline fix suggestions for detected bugs
 */

import * as vscode from 'vscode';
import { PatternStore } from '../engine/patternStore';

export class CodeGhostCodeActionProvider implements vscode.CodeActionProvider {
  private patternStore: PatternStore;

  constructor(patternStore: PatternStore) {
    this.patternStore = patternStore;
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    // Get the line of code
    const line = document.lineAt(range.start.line);
    const lineText = line.text;

    // Check for patterns
    const patterns = this.patternStore.getPatternsByLanguage(document.languageId);

    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern.regex, 'gi');
        if (regex.test(lineText)) {
          // Create fix action based on pattern
          const fix = this.generateFix(pattern, lineText);
          if (fix) {
            const action = new vscode.CodeAction(
              `🔧 Fix: ${fix.title}`,
              vscode.CodeActionKind.QuickFix
            );
            action.isPreferred = true;

            // Create edit
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, line.range, fix.newCode);
            action.edit = edit;

            actions.push(action);
          }
        }
      } catch (error) {
        // Skip invalid regex
      }
    }

    return actions;
  }

  /**
   * Generate fix suggestion based on pattern
   */
  private generateFix(
    pattern: any,
    lineText: string
  ): { title: string; newCode: string } | null {
    if (!pattern.fixedExample) {
      return null;
    }

    // Use the fixed example as a template
    switch (pattern.category) {
      case 'off_by_one_loop':
        // Replace <= with <
        const fixed = lineText.replace(/<=\s*(\w+)\.length/, '< $1.length');
        if (fixed !== lineText) {
          return {
            title: 'Change <= to < for array length',
            newCode: fixed,
          };
        }
        break;

      case 'null_check_missing':
        // Add optional chaining
        const fixedNull = lineText.replace(/(\w+)\.(\w+)/, '$1?.$2');
        if (fixedNull !== lineText) {
          return {
            title: 'Add optional chaining (?.) to prevent null access',
            newCode: fixedNull,
          };
        }
        break;

      case 'missing_await':
        // Add await keyword
        const fixedAwait = lineText.replace(/=\s*(\w+\()/, '= await $1');
        if (fixedAwait !== lineText) {
          return {
            title: 'Add await keyword to async call',
            newCode: fixedAwait,
          };
        }
        break;

      default:
        // Generic fix: show the fixed example
        if (pattern.fixedExample && pattern.buggyExample) {
          // Try to apply the same transformation
          const buggyPattern = pattern.buggyExample.trim();
          const fixedPattern = pattern.fixedExample.trim();
          
          // Simple string replacement (can be improved with AST)
          const newCode = lineText.replace(buggyPattern, fixedPattern);
          if (newCode !== lineText) {
            return {
              title: 'Apply fix from commit history',
              newCode: newCode,
            };
          }
        }
    }

    return null;
  }
}
