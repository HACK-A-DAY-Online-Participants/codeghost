# Changelog

All notable changes to the "CodeGhost" extension will be documented in this file.

## [0.0.1] - 2025-11-22

### Added
- Initial release of CodeGhost MVP
- Commit parsing and bug detection from GitHub
- Pattern extraction from bug-fix commits
- Real-time code scanning as you type
- Ghost highlight UI with risk scoring
- Hover tooltips with commit references
- Commands:
  - `CodeGhost: Initialize` - Scan repository
  - `CodeGhost: Refresh Patterns` - Update patterns
  - `CodeGhost: Toggle Highlights` - Enable/disable
  - `CodeGhost: Show Statistics` - View stats
- Configuration options:
  - Max commits to scan
  - Sensitivity levels (low/medium/high)
  - Scan on save only mode
- Bug categories:
  - Null check missing
  - Off-by-one loop errors
  - Missing await keywords
  - Undefined access patterns
  - Type errors
- Secure GitHub token storage
- Local pattern storage in `.codeghost/bug_memory.json`

### Supported Languages
- TypeScript
- JavaScript
- Python
- Java
- C/C++
- Go
- Rust
- Ruby
- PHP

## [Unreleased]

### Planned for V1
- Inline fix suggestions
- AST-level pattern matching
- Project-wide bug heatmap
- Team dashboard
- GPT-powered explanations
- Multi-language improvements
