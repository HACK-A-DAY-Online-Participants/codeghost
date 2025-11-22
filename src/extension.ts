/**
 * CodeGhost VS Code Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { CommitFetcher } from './engine/commitFetcher';
import { LocalGitFetcher } from './engine/localGitFetcher';
import { PatternExtractor } from './engine/patternExtractor';
import { PatternStore } from './engine/patternStore';
import { CodeScanner } from './engine/scanner';
import { DecorationManager } from './ui/decorations';
import { RiskScorer } from './engine/riskScorer';
import { CodeGhostCodeActionProvider } from './ui/codeActions';
import { StatsPanel } from './ui/statsPanel';
import { ExtensionConfig } from './types';

let patternStore: PatternStore | undefined;
let codeScanner: CodeScanner | undefined;
let decorationManager: DecorationManager | undefined;
let isEnabled = true;
let scanTimeout: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('CodeGhost is now active!');

  decorationManager = new DecorationManager();

  // Initialize if workspace is open
  if (vscode.workspace.workspaceFolders) {
    initializeExtension(context);
  }

  // Register code actions provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      {
        provideCodeActions: (document, range, context, token) => {
          if (patternStore) {
            const provider = new CodeGhostCodeActionProvider(patternStore);
            return provider.provideCodeActions(document, range, context, token);
          }
          return [];
        },
      },
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      }
    )
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codeghost.initialize', () =>
      handleInitialize(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeghost.refreshPatterns', () =>
      handleRefreshPatterns(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeghost.toggleHighlights', () =>
      handleToggleHighlights()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeghost.showStats', () =>
      handleShowStats()
    )
  );

  // Register document change listener (real-time scanning)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const config = getConfig();
      // Only scan on change if not in "scan on save only" mode
      if (isEnabled && codeScanner && decorationManager && !config.scanOnSaveOnly) {
        handleDocumentChange(event);
      }
    })
  );

  // Register document save listener (for scan on save mode)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      const config = getConfig();
      if (isEnabled && codeScanner && decorationManager && config.scanOnSaveOnly) {
        const editor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.toString() === document.uri.toString()
        );
        if (editor) {
          scanDocument(editor);
        }
      }
    })
  );

  // Register active editor change listener
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (isEnabled && editor && codeScanner && decorationManager) {
        scanDocument(editor);
      }
    })
  );

  // Show welcome message
  showWelcomeMessage(context);
}

/**
 * Initialize the extension
 */
async function initializeExtension(context: vscode.ExtensionContext) {
  const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspacePath) {
    return;
  }

  try {
    patternStore = new PatternStore(workspacePath);
    codeScanner = new CodeScanner(patternStore);

    const config = getConfig();
    isEnabled = config.enabled;

    // Scan active editor if available
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && decorationManager) {
      scanDocument(activeEditor);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`CodeGhost initialization failed: ${error}`);
  }
}

/**
 * Handle initialize command
 */
async function handleInitialize(context: vscode.ExtensionContext) {
  const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspacePath) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  try {
    // Check if it's a local git repository
    const localGitFetcher = new LocalGitFetcher(workspacePath);
    const isLocalGit = await localGitFetcher.isGitRepository();

    if (!isLocalGit) {
      vscode.window.showErrorMessage('This is not a Git repository.');
      return;
    }

    // Ask user if they want to use local git or GitHub API
    const choice = await vscode.window.showQuickPick(
      ['Use Local Git History (Faster)', 'Use GitHub API (For remote repos)'],
      {
        placeHolder: 'Choose commit source',
        ignoreFocusOut: true,
      }
    );

    if (!choice) {
      return;
    }

    const useLocalGit = choice.startsWith('Use Local');

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'CodeGhost',
        cancellable: false,
      },
      async (progress) => {
        const config = getConfig();
        let commits;
        let bugCommits;
        let detailedCommits = [];

        if (useLocalGit) {
          // Use local git history
          progress.report({ message: 'Fetching local commits...' });
          commits = await localGitFetcher.fetchCommits(config.maxCommits);

          progress.report({ message: 'Filtering bug-related commits...' });
          bugCommits = localGitFetcher.filterBugCommits(commits);

          progress.report({ message: 'Analyzing commit diffs...' });
          for (const commit of bugCommits) {
            const detailed = await localGitFetcher.fetchCommitDetails(commit.sha);
            detailedCommits.push(detailed);
          }
        } else {
          // Use GitHub API
          let token = await context.secrets.get('codeghost.githubToken');
          if (!token) {
            token = await vscode.window.showInputBox({
              prompt: 'Enter your GitHub Personal Access Token',
              password: true,
              ignoreFocusOut: true,
            });

            if (!token) {
              vscode.window.showWarningMessage('GitHub token is required');
              return;
            }

            await context.secrets.store('codeghost.githubToken', token);
          }

          const remoteUrl = await CommitFetcher.getRemoteUrl(workspacePath);
          if (!remoteUrl) {
            vscode.window.showErrorMessage('Could not find Git remote URL');
            return;
          }

          const repoInfo = CommitFetcher.parseGitHubUrl(remoteUrl);
          if (!repoInfo) {
            vscode.window.showErrorMessage('Could not parse GitHub repository URL');
            return;
          }

          progress.report({ message: 'Fetching commits from GitHub...' });
          const commitFetcher = new CommitFetcher(token!);
          commits = await commitFetcher.fetchCommits(
            repoInfo.owner,
            repoInfo.repo,
            config.maxCommits
          );

          progress.report({ message: 'Filtering bug-related commits...' });
          bugCommits = commitFetcher.filterBugCommits(commits);

          progress.report({ message: 'Fetching commit details...' });
          for (const commit of bugCommits.slice(0, 50)) {
            const detailed = await commitFetcher.fetchCommitDetails(
              repoInfo.owner,
              repoInfo.repo,
              commit.sha
            );
            detailedCommits.push(detailed);
          }
        }

        progress.report({ message: 'Extracting bug patterns...' });
        const patternExtractor = new PatternExtractor();
        const patterns = patternExtractor.extractPatterns(detailedCommits);

        progress.report({ message: 'Saving patterns...' });
        patternStore = new PatternStore(workspacePath);
        patternStore.addPatterns(patterns);

        if (commits && commits.length > 0) {
          patternStore.updateLastScannedSha(commits[0].sha);
        }

        codeScanner = new CodeScanner(patternStore);

        vscode.window.showInformationMessage(
          `CodeGhost: Found ${patterns.length} bug patterns from ${bugCommits.length} bug-fix commits`
        );

        // Scan current editor
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && decorationManager) {
          scanDocument(activeEditor);
        }
      }
    );
  } catch (error: any) {
    vscode.window.showErrorMessage(`CodeGhost scan failed: ${error.message}`);
    console.error('CodeGhost error:', error);
  }
}

/**
 * Handle refresh patterns command
 */
async function handleRefreshPatterns(context: vscode.ExtensionContext) {
  await handleInitialize(context);
}

/**
 * Handle toggle highlights command
 */
function handleToggleHighlights() {
  isEnabled = !isEnabled;

  if (!isEnabled && decorationManager) {
    // Clear all decorations
    vscode.window.visibleTextEditors.forEach((editor) => {
      decorationManager!.clearDecorations(editor);
    });
  } else if (isEnabled && codeScanner && decorationManager) {
    // Re-scan active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      scanDocument(activeEditor);
    }
  }

  vscode.window.showInformationMessage(
    `CodeGhost highlights ${isEnabled ? 'enabled' : 'disabled'}`
  );
}

/**
 * Handle show stats command
 */
function handleShowStats() {
  if (!patternStore) {
    vscode.window.showInformationMessage('CodeGhost not initialized. Run "CodeGhost: Initialize" first.');
    return;
  }

  // Show stats in webview panel
  StatsPanel.show(patternStore);

}

/**
 * Handle document change event
 */
function handleDocumentChange(event: vscode.TextDocumentChangeEvent) {
  console.log(`[CodeGhost] Document changed: ${event.document.fileName}`);
  
  const config = getConfig();

  // If scan on save only, skip real-time scanning
  if (config.scanOnSaveOnly) {
    console.log('[CodeGhost] Scan on save only mode - skipping real-time scan');
    return;
  }

  // Debounce scanning
  if (scanTimeout) {
    clearTimeout(scanTimeout);
  }

  console.log('[CodeGhost] Scheduling scan (200ms debounce)');
  scanTimeout = setTimeout(() => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === event.document) {
      console.log('[CodeGhost] Debounce complete - triggering scan');
      scanDocument(editor);
    }
  }, 200); // 200ms debounce
}

/**
 * Scan a document and apply decorations
 */
function scanDocument(editor: vscode.TextEditor) {
  if (!codeScanner || !decorationManager) {
    console.log('[CodeGhost] Cannot scan: scanner or decoration manager not initialized');
    return;
  }

  const document = editor.document;
  const language = getLanguageForDocument(document);
  const config = getConfig();
  
  console.log(`[CodeGhost] Scanning document: ${document.fileName}`);
  console.log(`[CodeGhost] Detected language: ${language}`);
  console.log(`[CodeGhost] VS Code languageId: ${document.languageId}`);

  // Clear existing decorations
  decorationManager.clearDecorations(editor);

  // Scan all lines
  const lines = [];
  for (let i = 0; i < document.lineCount; i++) {
    lines.push(document.lineAt(i).text);
  }

  const results = codeScanner.scanLines(lines, 0, language, document.fileName);
  
  console.log(`[CodeGhost] Scan complete: found ${results.length} potential issues`);

  // Apply sensitivity filter
  const riskScorer = new RiskScorer();
  const filteredResults = results.filter((r) => {
    console.log(`[CodeGhost] Risk score for ${r.category}: ${r.riskScore}, sensitivity: ${config.sensitivity}`);
    const adjustedScore = riskScorer.adjustForSensitivity(r.riskScore, config.sensitivity);
    console.log(`[CodeGhost] Adjusted score: ${adjustedScore} (${adjustedScore > 0 ? 'PASS' : 'FILTERED OUT'})`);
    return adjustedScore > 0;
  });

  // Create decorations
  const decorations = filteredResults.map((result) => {
    // Get pattern details for hover message
    const patternDetails = codeScanner!.getPatternDetails(result.patternId);
    
    return {
      line: result.lineNumber,
      riskLevel: decorationManager!.getRiskLevel(result.riskScore),
      hoverMessage: decorationManager!.createHoverMessage(
        result.riskScore,
        result.category,
        result.shortReason,
        result.commitShas,
        patternDetails
      ),
    };
  });

  console.log(`[CodeGhost] Applying ${decorations.length} decorations`);
  decorationManager.applyDecorations(editor, decorations);
}

/**
 * Get language identifier for a document
 */
function getLanguageForDocument(document: vscode.TextDocument): string {
  const languageMap: Record<string, string> = {
    typescript: 'typescript',
    javascript: 'javascript',
    typescriptreact: 'typescript',
    javascriptreact: 'javascript',
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    go: 'go',
    rust: 'rust',
    ruby: 'ruby',
    php: 'php',
  };

  return languageMap[document.languageId] || 'unknown';
}

/**
 * Get extension configuration
 */
function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('codeghost');
  return {
    maxCommits: config.get('maxCommits', 100),
    sensitivity: config.get('sensitivity', 'medium'),
    githubToken: config.get('githubToken', ''),
    enableGPT: config.get('enableGPT', false),
    scanOnSaveOnly: config.get('scanOnSaveOnly', false),
    enabled: config.get('enabled', true),
  };
}

/**
 * Show welcome message
 */
function showWelcomeMessage(context: vscode.ExtensionContext) {
  const hasShownWelcome = context.globalState.get('codeghost.hasShownWelcome', false);

  if (!hasShownWelcome && vscode.workspace.workspaceFolders) {
    vscode.window
      .showInformationMessage(
        '👻 Welcome to CodeGhost! Would you like to scan this repository for bug patterns?',
        'Scan Now',
        'Later'
      )
      .then((choice) => {
        if (choice === 'Scan Now') {
          vscode.commands.executeCommand('codeghost.initialize');
        }
        context.globalState.update('codeghost.hasShownWelcome', true);
      });
  }
}

export function deactivate() {
  if (decorationManager) {
    decorationManager.dispose();
  }

  if (scanTimeout) {
    clearTimeout(scanTimeout);
  }
}
