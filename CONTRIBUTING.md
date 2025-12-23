# Contributing to RegenBrowser

Thank you for your interest in contributing to RegenBrowser! 🎉

**Before starting** — Please read [DEVELOPERS.md](DEVELOPERS.md) for architecture overview.

---

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/Regenbrowser.git`
3. **Create branch**: `git checkout -b feature/your-feature-name`
4. **Set up**: `npm install && cp example.env .env.local`
5. **Make changes** (follow guidelines below)
6. **Test**: `npm run test:unit && npm run build:types:renderer`
7. **Commit**: `git commit -m "feat: your feature description"`
8. **Push**: `git push origin feature/your-feature-name`
9. **Open Pull Request**: Add description + link to issue

---

## ✅ PR Checklist

Before submitting:

- [ ] Branched from `main` or `develop`
- [ ] Code follows project style (ESLint clean)
- [ ] TypeScript types: `npm run build:types:renderer` passes
- [ ] Tests pass: `npm run test:unit`
- [ ] No console errors
- [ ] Docs updated if needed
- [ ] Commit messages are descriptive
- [ ] Linked to GitHub issue

---

## 🛠️ Development Guidelines

### Code Style

```typescript
// ✅ DO:
- Use TypeScript strict mode
- camelCase for functions/variables
- PascalCase for components/classes
- JSDoc for public APIs
- Const where possible

// ❌ DON'T:
- Hardcode API keys
- Use `any` type
- Ignore TypeScript errors
- Break offline mode
```

### Testing

```bash
# Add tests for:
npm run test:unit        # Critical path
npm run test:realtime    # Socket.IO integration
npm run test:smoke       # E2E with Playwright

# Example:
// tests/unit/my-feature.test.ts
describe('MyFeature', () => {
  it('should work', async () => {
    const result = await myFeature();
    expect(result).toBe(true);
  });
});
```

### Commit Messages

```
# Format:
type: description

# Types: feat, fix, docs, test, refactor, perf, chore

✅ Good:
feat: Add stock price tool to agent workflow
fix: Handle missing search results in research agent
docs: Update streaming architecture guide
test: Add unit tests for session restore

❌ Avoid:
update stuff
fix
changes
```

---

## 🎯 Areas for Contribution

### 🐛 Bug Fixes
- Check [Issues](https://github.com/nrbns/Regenbrowser/issues) for bugs
- Link PR to issue
- Add test to prevent regression

### ✨ New Features
- **Discuss in issue first** (avoid wasted work)
- Follow 3-layer architecture (see DEVELOPERS.md)
- Add tests for critical paths
- Update docs

### 📚 Documentation
- Fix typos, clarify guides
- Add architecture diagrams
- Document new features

### 🌍 Translations
- Add language support in WISPR
- Translate docs

### ⚡ Performance
- Profile before/after
- Optimize render bottlenecks
- Reduce bundle size

---

## 🧠 Adding a New Feature (Example)

Let's say you want to **add a news feed tool**.

### Step 1: Backend - Create Tool

```typescript
// server/langchain-agents.ts

static createNewsTool() {
  return new DynamicStructuredTool({
    name: 'fetch_news',
    description: 'Fetch latest news by topic',
    schema: z.object({
      topic: z.string().describe('Topic to search'),
      count: z.number().default(5),
    }),
    func: async ({ topic, count }) => {
      const news = await fetchNews(topic, count);
      return JSON.stringify(news, null, 2);
    },
  });
}
```

### Step 2: Add to Workflow

```typescript
// In researchWorkflow()
const tools = [
  AgentTools.createSearchTool(),
  AgentTools.createNewsTool(),  // ← Add
];
```

### Step 3: Test

```typescript
// tests/unit/news-tool.test.ts
describe('News Tool', () => {
  it('should fetch news', async () => {
    const result = await AgentTools.createNewsTool().func({
      topic: 'AI',
      count: 5,
    });
    expect(result).toContain('title');
  });
});
```

### Step 4: Verify End-to-End

```bash
npm run test:unit
npm run dev:desktop
# Try: "What's in the news about AI?"
```

Done! News tool now works in Research mode.

---

## 🔍 Code Review Process

Maintainers will review on:

1. **Architecture**: Fits our design?
2. **Quality**: Well-tested?
3. **Performance**: No degradation?
4. **Security**: Auth/data safe?
5. **UX**: User-friendly?

**All feedback is collaborative.** We ask questions to improve the code.

---

## 📞 Questions?

- **Architecture unclear?** → Read [DEVELOPERS.md](DEVELOPERS.md)
- **Specific issue?** → Ask in issue comment
- **General question?** → Open [Discussion](https://github.com/nrbns/Regenbrowser/discussions)

---

## 🎁 Recognition

Contributors are recognized in:

1. [CONTRIBUTORS.md](CONTRIBUTORS.md)
2. GitHub contribution graph
3. Major contributors get committer access

---

## 📚 Useful Links

- **Architecture**: [DEVELOPERS.md](DEVELOPERS.md)
- **Issues**: [github.com/nrbns/Regenbrowser/issues](https://github.com/nrbns/Regenbrowser/issues)
- **Discussions**: [github.com/nrbns/Regenbrowser/discussions](https://github.com/nrbns/Regenbrowser/discussions)

---

## Development Guidelines

### Code Style
- Follow existing code style
- Use TypeScript for type safety
- Add JSDoc comments for public APIs
- Run `npm run lint` before committing

### Testing
- Add tests for new features
- Ensure all tests pass: `npm run test`
- Test on multiple platforms if possible
- ✨ **Features**: Discuss in Issues first
- 📝 **Documentation**: Improve docs, add examples
- 🎨 **UI/UX**: Design improvements, accessibility
- 🌍 **Translations**: Add support for more languages
- ⚡ **Performance**: Optimize code, reduce bundle size

## Questions?

Open a [Discussion](https://github.com/nrbns/Regenbrowser/discussions) or check existing issues.

Thank you for contributing! 🙏
