# Contributing to OmniBrowser

Thank you for your interest in contributing to OmniBrowser! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/nrbns/Omnibrowser.git
   cd Omnibrowser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   npm run test:e2e
   ```

## Code Style

- Follow the existing code style
- Use TypeScript for type safety
- Run `npm run lint` before committing
- Run `npm run build:types` to check for type errors

## Pull Request Process

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, concise code
   - Add tests for new features
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   Use conventional commit messages (feat:, fix:, docs:, etc.)

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use the PR template
   - Link to related issues
   - Describe your changes clearly
   - Ensure all CI checks pass

## Issue Reporting

- Use the issue templates (bug, feature, task)
- Provide clear steps to reproduce (for bugs)
- Include environment information
- Add screenshots/logs when relevant

## Project Structure

```
Omnibrowser/
├── electron/          # Main process code
├── src/              # Renderer process code
├── tests/            # Test files
├── docs/             # Documentation
└── .github/          # GitHub workflows and templates
```

## Testing

- Write unit tests for new features
- Add E2E tests for critical flows
- Ensure tests pass before submitting PR
- Aim for >70% test coverage

## Documentation

- Update README.md for user-facing changes
- Update PROJECT_STATUS.md for feature additions
- Add inline comments for complex code
- Update CHANGELOG.md for notable changes

## Questions?

Feel free to open an issue for questions or discussions about contributions.

