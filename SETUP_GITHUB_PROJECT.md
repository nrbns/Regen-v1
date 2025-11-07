# GitHub Project Setup Guide

This guide helps you set up GitHub Projects and Issues to track OmniBrowser development.

## Step 1: Create GitHub Project

1. Go to https://github.com/nrbns/Omnibrowser/projects
2. Click "New project"
3. Choose "Board" template
4. Name it "OmniBrowser 90-Day Build Plan"

## Step 2: Add Columns

Add these columns to your project board:
- **Backlog** - Items to be prioritized
- **Todo** - Prioritized, ready to work on
- **In Progress** - Actively being worked on
- **In Review** - PR created, awaiting review
- **Done** - Completed and merged
- **Blocked** - Blocked by dependencies

## Step 3: Create Milestones

Create these milestones:
1. **M1: Core Browser GA** (Phase 1) - Target: Week 3 - Status: ✅ Complete
2. **M2: Research Mode v1** (Phase 2) - Target: Week 6 - Status: ✅ Complete
3. **M3: Document Review v1** (Phase 3) - Target: Week 9 - Status: ✅ Complete
4. **M4: Pre-Launch Hardening** (Phase 4) - Target: Week 12 - Status: 🟡 In Progress

## Step 4: Create Issues from Roadmap

Convert roadmap items from [ISSUES.md](./ISSUES.md) into GitHub Issues:

### Critical Issues (M4)
1. **Setup CI/CD workflows** - [Template: Task](./.github/ISSUE_TEMPLATE/task.md)
2. **Create v0.1.0-alpha release with installers** - [Template: Task](./.github/ISSUE_TEMPLATE/task.md)
3. **Code signing setup (Windows/macOS/Linux)** - [Template: Task](./.github/ISSUE_TEMPLATE/task.md)
4. **Auto-update mechanism** - [Template: Feature](./.github/ISSUE_TEMPLATE/feature_request.md)
5. **Performance optimization (cold start <1000ms)** - [Template: Task](./.github/ISSUE_TEMPLATE/task.md)

### High Priority Issues (M4)
6. **Settings UI completion** - [Template: Feature](./.github/ISSUE_TEMPLATE/feature_request.md)
7. **Accessibility improvements (ARIA, keyboard nav)** - [Template: Task](./.github/ISSUE_TEMPLATE/task.md)
8. **Test coverage improvement (>70%)** - [Template: Task](./.github/ISSUE_TEMPLATE/task.md)
9. **Error reporting (Sentry integration)** - [Template: Feature](./.github/ISSUE_TEMPLATE/feature_request.md)
10. **Documentation site** - [Template: Task](./.github/ISSUE_TEMPLATE/task.md)

## Step 5: Label Issues

Create and apply labels:
- `bug` - Bug reports
- `enhancement` - Feature requests
- `task` - Work items
- `critical` - Blocking release
- `high-priority` - High priority
- `medium-priority` - Medium priority
- `low-priority` - Low priority
- `phase-1` - Phase 1 items
- `phase-2` - Phase 2 items
- `phase-3` - Phase 3 items
- `phase-4` - Phase 4 items
- `security` - Security-related
- `performance` - Performance-related
- `accessibility` - Accessibility-related

## Step 6: Link Issues to Project

1. Open each issue
2. Add to "OmniBrowser 90-Day Build Plan" project
3. Assign to appropriate milestone
4. Add relevant labels
5. Move to appropriate column (Backlog/Todo)

## Step 7: Create First Release

1. Create a tag: `git tag -a v0.1.0-alpha -m "First alpha release"`
2. Push tag: `git push origin v0.1.0-alpha`
3. GitHub Actions will automatically create a release
4. Upload installers manually if CI fails (first time setup)

## Quick Commands

```bash
# Create and push tag for release
git tag -a v0.1.0-alpha -m "First alpha release"
git push origin v0.1.0-alpha

# Create issue from command line (requires GitHub CLI)
gh issue create --title "Setup CI/CD workflows" --body-file .github/ISSUE_TEMPLATE/task.md --label task,critical,phase-4 --milestone "M4: Pre-Launch Hardening"
```

## Next Steps

1. ✅ Create GitHub Project board
2. ✅ Create Milestones
3. ⬜ Create Issues from roadmap
4. ⬜ Link Issues to Project
5. ⬜ Create v0.1.0-alpha release
6. ⬜ Verify CI/CD workflows run
7. ⬜ Upload installers to Releases

## Resources

- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub Issues Documentation](https://docs.github.com/en/issues)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

