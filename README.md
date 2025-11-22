# 👻 CodeGhost

**AI-Powered Bug Prevention using Repository History**

CodeGhost is a VS Code extension that predicts potentially buggy code in real-time by learning from your repository's own historical mistakes. It scans commit history to detect recurring bug patterns, highlights risky lines as you type, and offers contextual explanations referencing past commits.

![CodeGhost Demo](https://via.placeholder.com/800x400?text=CodeGhost+Demo)

## 🎯 Key Features

- **🔍 Real-Time Bug Detection**: Highlights suspicious code patterns as you type
- **📚 Repository-Specific Learning**: Learns from your project's unique bug history
- **🎯 Risk Scoring**: Assigns risk scores (1-10) to suspicious lines
- **💡 Contextual Explanations**: Shows which past commits had similar bugs
- **⚡ Lightning Fast**: <50ms response time, non-intrusive UI
- **🎨 Beautiful UI**: Ghost-like highlights with hover tooltips

## 🚀 Quick Start

### Installation

1. Install from VS Code Marketplace (coming soon) or build from source
2. Open a GitHub repository in VS Code
3. Run command: `CodeGhost: Initialize`
4. Enter your GitHub Personal Access Token
5. Wait for CodeGhost to scan your repository history

### Usage

Once initialized, CodeGhost automatically scans your code as you type and highlights potentially buggy lines with a soft ghost-like glow 👻.

**Hover over highlighted lines** to see:
- Risk score (1-10)
- Bug category
- Explanation of the issue
- References to similar bugs in past commits

## 📋 Requirements

- VS Code 1.85.0 or higher
- Git repository with GitHub remote
- GitHub Personal Access Token ([Create one here](https://github.com/settings/tokens))
  - Required scope: `repo` (for reading commit history)

## ⚙️ Configuration

Access settings via `File > Preferences > Settings > CodeGhost`

| Setting | Default | Description |
|---------|---------|-------------|
| `codeghost.maxCommits` | 100 | Number of commits to analyze |
| `codeghost.sensitivity` | medium | Detection sensitivity (low/medium/high) |
| `codeghost.scanOnSaveOnly` | false | Only scan on file save |
| `codeghost.enabled` | true | Enable/disable highlights |

### Sensitivity Levels

- **Low**: Only show high-risk items (score ≥ 7)
- **Medium**: Show medium and high risk (score ≥ 5)
- **High**: Show all risks (score ≥ 3)

## 🎮 Commands

- `CodeGhost: Initialize` - Scan repository and build bug pattern database
- `CodeGhost: Refresh Patterns` - Re-scan repository for new commits
- `CodeGhost: Toggle Highlights` - Enable/disable ghost highlights
- `CodeGhost: Show Statistics` - View bug pattern statistics

## 🧠 How It Works

1. **Commit Scanning**: Fetches recent commits from GitHub
2. **Bug Detection**: Identifies bug-fix commits using keywords (fix, bug, error, etc.)
3. **Pattern Extraction**: Analyzes diffs to extract recurring bug patterns
4. **Local Storage**: Stores patterns in `.codeghost/bug_memory.json`
5. **Real-Time Analysis**: Matches your code against known patterns
6. **Risk Scoring**: Calculates risk based on frequency and severity
7. **Visual Feedback**: Highlights suspicious lines with hover explanations

## 🐛 Bug Categories Detected

- **Null Check Missing**: Missing null/undefined guards
- **Off-by-One Loop**: Array index boundary errors
- **Missing Await**: Forgotten await keywords
- **Undefined Access**: Unsafe object/array access
- **Type Error**: Type mismatches
- **Race Condition**: Concurrency issues
- **And more...**

## 📊 Example

```typescript
// ⚠️ Risk 8/10 - Similar to bug in commit #abc123
const name = user.name; // 👻 Missing null check

// ✅ Better:
const name = user?.name ?? 'Unknown';
```

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/yourusername/codeghost.git
cd codeghost

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run extension in development mode
# Press F5 in VS Code to launch Extension Development Host
```

### Project Structure

```
codeghost/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── types.ts               # TypeScript type definitions
│   ├── engine/
│   │   ├── commitFetcher.ts   # GitHub API integration
│   │   ├── patternExtractor.ts # Bug pattern detection
│   │   ├── patternStore.ts    # Local pattern storage
│   │   ├── scanner.ts         # Real-time code scanner
│   │   └── riskScorer.ts      # Risk calculation engine
│   └── ui/
│       └── decorations.ts     # VS Code UI decorations
├── package.json               # Extension manifest
└── tsconfig.json             # TypeScript config
```

## 🔒 Privacy & Security

- **Local-First**: All pattern analysis happens on your machine
- **No Data Collection**: CodeGhost doesn't send your code anywhere
- **Secure Token Storage**: GitHub tokens stored in VS Code SecretStorage
- **Optional Features**: GPT integration is opt-in only

## 🗺️ Roadmap

### MVP (Current)
- ✅ Commit parsing and pattern extraction
- ✅ Real-time code scanning
- ✅ Ghost highlight UI
- ✅ Risk scoring
- ✅ Hover explanations

### V1 (Planned)
- [ ] Inline fix suggestions
- [ ] AST-level pattern matching
- [ ] Project-wide bug heatmap
- [ ] Team dashboard
- [ ] Sensitivity settings UI

### Future
- [ ] ML-based prediction
- [ ] Security vulnerability detection
- [ ] JetBrains IDE support
- [ ] CI/CD integration
- [ ] Team analytics dashboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built for the Hack-a-Day Hackathon
- Inspired by the need to learn from our mistakes
- Powered by VS Code Extension API and GitHub API

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/codeghost/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/codeghost/discussions)
- **Email**: support@codeghost.dev

---

**Made with 👻 by the CodeGhost Team**
