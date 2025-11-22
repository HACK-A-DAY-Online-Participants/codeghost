# Contributing to CodeGhost

Thank you for your interest in contributing to CodeGhost! 👻

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/codeghost.git
   cd codeghost
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running in Development

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Make changes to TypeScript files
4. Reload extension window (`Ctrl+R`) to test changes

### Compiling

```bash
# One-time compile
npm run compile

# Watch mode (auto-compile on save)
npm run watch
```

### Code Style

- Use TypeScript
- Follow existing code style
- Add comments for complex logic
- Use meaningful variable names

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add inline fix suggestions
fix: resolve null pointer in pattern extraction
docs: update README with new examples
refactor: simplify risk scoring logic
test: add unit tests for pattern detector
```

## What to Contribute

### Good First Issues

- Add new bug pattern detectors
- Improve documentation
- Add language support
- Fix reported bugs
- Improve error messages

### Feature Requests

Check [Issues](https://github.com/yourusername/codeghost/issues) for requested features.

Popular requests:
- Inline fix suggestions
- AST-based pattern matching
- More language support
- Performance improvements

### Bug Reports

Include:
- VS Code version
- Extension version
- Repository size
- Steps to reproduce
- Error messages

## Code Structure

```
src/
├── extension.ts           # Main entry point
├── types.ts               # Type definitions
├── engine/
│   ├── commitFetcher.ts   # GitHub integration
│   ├── patternExtractor.ts # Pattern detection
│   ├── patternStore.ts    # Storage layer
│   ├── scanner.ts         # Code scanning
│   └── riskScorer.ts      # Risk calculation
└── ui/
    └── decorations.ts     # VS Code UI
```

## Adding a New Bug Detector

Example: Detecting missing error handling

```typescript
// In patternExtractor.ts

private detectMissingErrorHandling(
  buggyLine: string,
  fixedLine: string,
  language: string
): { regex: string; category: BugCategory; riskBase: number } | null {
  // Check if try-catch was added
  if (fixedLine.includes('try') && !buggyLine.includes('try')) {
    return {
      regex: String.raw`\w+\s*\([^)]*\)(?!\s*catch)`,
      category: 'missing_error_handling',
      riskBase: 6,
    };
  }
  return null;
}
```

Then add to detector list:
```typescript
const detectors = [
  this.detectNullCheck,
  this.detectOffByOneLoop,
  this.detectMissingAwait,
  this.detectMissingErrorHandling, // Add here
];
```

## Testing

### Manual Testing

1. Create a test repository with known bugs
2. Initialize CodeGhost
3. Verify patterns are detected
4. Check highlights appear correctly

### Test Checklist

- [ ] Extension activates without errors
- [ ] GitHub API integration works
- [ ] Patterns are extracted correctly
- [ ] Highlights appear in editor
- [ ] Hover messages display properly
- [ ] Settings work as expected
- [ ] Commands execute successfully

## Documentation

Update documentation when:
- Adding new features
- Changing behavior
- Adding configuration options
- Fixing bugs

Files to update:
- `README.md` - User-facing docs
- `CHANGELOG.md` - Version history
- `docs/architecture.md` - Technical details

## Pull Request Process

1. **Ensure your code compiles**
   ```bash
   npm run compile
   ```

2. **Test thoroughly**
   - Test in Extension Development Host
   - Try different repositories
   - Check edge cases

3. **Update documentation**
   - README if user-facing change
   - CHANGELOG with your changes
   - Code comments for complex logic

4. **Submit PR**
   - Clear title and description
   - Reference related issues
   - Include screenshots/videos if UI change

5. **Respond to feedback**
   - Address review comments
   - Make requested changes
   - Re-test after modifications

## Code Review Guidelines

### What Reviewers Look For

- Code quality and style
- Performance impact
- Security considerations
- Documentation completeness
- Testing coverage
- Breaking changes

### Review Process

1. Automated checks (compile, lint)
2. Manual code review
3. Testing in development
4. Feedback and iteration
5. Approval and merge

## Community Guidelines

- Be respectful and constructive
- Help others learn
- Share knowledge
- Celebrate contributions
- Follow [Code of Conduct](./CODE_OF_CONDUCT.md)

## Getting Help

- **Questions**: [GitHub Discussions](https://github.com/yourusername/codeghost/discussions)
- **Bugs**: [GitHub Issues](https://github.com/yourusername/codeghost/issues)
- **Chat**: [Discord Server](#) (coming soon)

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for making CodeGhost better! 👻**
