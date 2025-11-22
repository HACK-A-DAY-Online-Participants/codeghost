# CodeGhost Architecture

This document provides a deep dive into CodeGhost's system architecture and design decisions.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code Extension                        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Commands    │  │  Settings    │  │  Event Listeners   │    │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘    │
│         │                  │                    │               │
│         └──────────────────┴────────────────────┘               │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Extension Orchestrator                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
   ┌────────────────┐  ┌──────────┐  ┌───────────────┐
   │  GitHub API    │  │  Local   │  │  VS Code UI   │
   │  Integration   │  │  Engine  │  │  Components   │
   └────────────────┘  └──────────┘  └───────────────┘
```

## Core Components

### 1. Commit Fetcher (`commitFetcher.ts`)

**Responsibility:** Fetch and filter bug-related commits from GitHub

**Key Functions:**
- `fetchCommits()`: Retrieves last N commits using GitHub REST API
- `filterBugCommits()`: Identifies bug-fix commits using keywords
- `fetchCommitDetails()`: Gets detailed diff information
- `parseGitHubUrl()`: Extracts owner/repo from Git remote URL

**Data Flow:**
```
GitHub API → Raw Commits → Filter by Keywords → Bug Commits → Fetch Diffs
```

### 2. Pattern Extractor (`patternExtractor.ts`)

**Responsibility:** Extract bug patterns from commit diffs

**Key Functions:**
- `extractPatterns()`: Main extraction pipeline
- `extractPatternsFromDiff()`: Parse individual file diffs
- `analyzeBugPattern()`: Compare buggy vs fixed code
- Specialized detectors:
  - `detectNullCheck()`
  - `detectOffByOneLoop()`
  - `detectMissingAwait()`
  - `detectUndefinedAccess()`
  - `detectTypeError()`

**Pattern Detection Strategy:**

1. Parse diff hunks
2. Identify removed lines (buggy code)
3. Compare with added lines (fixed code)
4. Extract difference as regex pattern
5. Categorize based on fix type

**Example:**
```
Buggy:  for (let i = 0; i <= arr.length; i++)
Fixed:  for (let i = 0; i < arr.length; i++)
Pattern: /for\s*\([^)]*<=\s*\w+\.length/
Category: off_by_one_loop
```

### 3. Pattern Store (`patternStore.ts`)

**Responsibility:** Local storage and management of bug patterns

**Storage Format:** JSON file at `.codeghost/bug_memory.json`

**Schema:**
```typescript
{
  version: 1,
  generated_at: "2025-11-22T12:00:00Z",
  last_scanned_sha: "abc123...",
  patterns: [
    {
      id: "pattern_001",
      language: "typescript",
      regex: "\\w+\\.\\w+(?!\\?)",
      category: "null_check_missing",
      risk_base: 8,
      commits: [...],
      occurrence_count: 3
    }
  ]
}
```

**Key Functions:**
- `load()`: Read from disk
- `save()`: Write to disk
- `getPatternsByLanguage()`: Filter patterns
- `addPatterns()`: Merge new patterns
- `getStats()`: Analytics

### 4. Code Scanner (`scanner.ts`)

**Responsibility:** Real-time code analysis

**Scanning Strategy:**
```
User Types → Debounce (200ms) → Extract Line → Match Regex → Calculate Risk
```

**Key Functions:**
- `scanLine()`: Analyze single line
- `scanLines()`: Analyze multiple lines
- `generateReason()`: Create human-readable explanation

**Performance Optimizations:**
- Language-based pattern filtering
- Regex caching
- Debounced scanning
- Line-by-line (not file-by-file)

### 5. Risk Scorer (`riskScorer.ts`)

**Responsibility:** Calculate risk scores for matched patterns

**Scoring Formula:**
```typescript
score = base_risk 
      + log2(occurrence_count + 1) 
      + file_history_factor
      + recency_factor

// Clamped to 1-10
```

**Factors:**
- **Base Risk**: Pattern-specific (set during extraction)
- **Occurrence Count**: More frequent = higher risk
- **File History**: Files with more bugs = higher risk
- **Recency**: Newer bugs = higher risk (V1 feature)

**Sensitivity Adjustment:**
- Low: Show only risk ≥ 7
- Medium: Show risk ≥ 5
- High: Show risk ≥ 3

### 6. Decoration Manager (`decorations.ts`)

**Responsibility:** Visual highlighting in VS Code

**Decoration Types:**

| Risk Level | Score Range | Color | Icon |
|------------|-------------|-------|------|
| High | 8-10 | Red | 👻 |
| Medium | 5-7 | Orange | 👻 |
| Low | 1-4 | Blue | 👻 |

**Key Functions:**
- `applyDecorations()`: Add highlights to editor
- `clearDecorations()`: Remove highlights
- `createHoverMessage()`: Generate markdown tooltip
- `generateRiskMeter()`: Visual risk indicator (🔴🔴🔴⚪⚪)

### 7. Extension Orchestrator (`extension.ts`)

**Responsibility:** Main extension lifecycle and coordination

**Activation Flow:**
```
Extension Activated
  → Initialize Pattern Store
  → Initialize Code Scanner
  → Register Commands
  → Register Event Listeners
  → Show Welcome Message
```

**Event Handlers:**
- `onDidChangeTextDocument`: Trigger scanning
- `onDidChangeActiveTextEditor`: Scan new file
- `onDidSaveTextDocument`: Optional save-only mode

## Data Flow Diagrams

### Initialization Flow

```
User triggers "Initialize"
  ↓
Request GitHub Token
  ↓
Fetch Commits (GitHub API)
  ↓
Filter Bug Commits
  ↓
Fetch Detailed Diffs
  ↓
Extract Patterns
  ↓
Save to bug_memory.json
  ↓
Initialize Scanner
  ↓
Scan Active Document
```

### Real-Time Scanning Flow

```
User Types
  ↓
Document Change Event
  ↓
Debounce (200ms)
  ↓
Extract Changed Line
  ↓
Match Against Patterns
  ↓
Calculate Risk Score
  ↓
Apply Sensitivity Filter
  ↓
Create Decorations
  ↓
Render in Editor
```

## Performance Considerations

### Optimization Strategies

1. **Debouncing**: Wait 200ms after typing stops
2. **Incremental Scanning**: Only scan changed lines
3. **Pattern Caching**: Load patterns once, reuse
4. **Language Filtering**: Only check relevant patterns
5. **Async Operations**: Non-blocking GitHub API calls
6. **Local Storage**: Avoid repeated API calls

### Performance Targets

- **Scan Latency**: < 50ms per line
- **Memory Usage**: < 50MB for 1000 patterns
- **API Calls**: < 200 per initialization
- **Startup Time**: < 1s for extension activation

## Security Considerations

### Token Storage

- GitHub tokens stored in VS Code `SecretStorage`
- Never logged or transmitted (except to GitHub)
- Alternative: Workspace settings (less secure)

### Data Privacy

- All analysis done locally
- No telemetry or data collection
- No code sent to external servers
- GPT integration is opt-in (V1 feature)

### Pattern Storage

- Patterns stored in `.codeghost/` (local workspace)
- Added to `.gitignore` by default
- Can be shared for team-wide learning (future)

## Scalability

### Current Limitations (MVP)

- Regex-based matching (not AST)
- Single repository only
- No cross-project learning
- Limited language support

### Future Improvements (V1+)

- AST-level pattern matching
- Multi-repository analysis
- Team-wide pattern sharing
- ML-based prediction models
- Cloud-based pattern database

## Extension Points

### Adding New Bug Detectors

```typescript
// In patternExtractor.ts
private detectNewPattern(
  buggyLine: string,
  fixedLine: string,
  language: string
): { regex: string; category: BugCategory; riskBase: number } | null {
  // Your detection logic here
  return {
    regex: '...',
    category: 'new_category',
    riskBase: 7
  };
}
```

### Adding New Languages

```typescript
// In patternExtractor.ts
private detectLanguage(filename: string): string {
  const languageMap = {
    // Add new extension mapping
    'kt': 'kotlin',
    'swift': 'swift'
  };
  // ...
}
```

## Testing Strategy

### Unit Tests (Future)

- Pattern extraction logic
- Risk calculation formulas
- Regex pattern matching

### Integration Tests (Future)

- GitHub API mocking
- Full initialization flow
- Multi-file scanning

### Manual Testing

- Use test repositories with known bugs
- Verify highlights appear correctly
- Check hover messages
- Test sensitivity settings

## Monitoring & Debugging

### Logging

- Console logs in Extension Development Host
- VS Code Output Channel (future)
- Error reporting to user

### Debugging

- Breakpoints in TypeScript source
- VS Code Developer Tools
- Network tab for API calls

## Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Language | TypeScript | Type safety, VS Code standard |
| Runtime | Node.js | VS Code extension requirement |
| API Client | Axios | Reliable HTTP client |
| UI | VS Code API | Native editor integration |
| Storage | JSON Files | Simple, portable, version-controllable |

## Future Architecture Changes

### V1 Planned

- AST parser integration (babel/typescript)
- SQLite for pattern storage
- WebView UI for dashboard
- Diff viewer for commit references

### V2+ Ideas

- Language Server Protocol integration
- Machine learning model training
- Cloud sync for team patterns
- CI/CD integration hooks

---

**Last Updated:** November 22, 2025
