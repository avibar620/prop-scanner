# /evolve — Self-Evolution Command

> Trigger the system's self-improvement cycle. Analyzes usage, discovers improvements, and applies safe changes.

## Quick Evolve (default: `/evolve`)
1. Run `/insights` → analyze recent usage patterns and pain points
2. Run **self-improver** agent → audit current setup (informed by insights)
3. Apply safe improvements (prompt tweaks, rule updates)
4. Update CLAUDE.md Self-Correction Rules if patterns found
5. Report changes

## Full Evolve (`/evolve --full`)
1. Run `/insights` → analyze recent usage patterns and pain points
2. Run **scout** agent → search for new tools, patterns, skills, plugins
3. Run **self-improver** agent → audit current setup (informed by insights + scout)
4. Run **evolution-engine** agent → plan and execute evolution
5. Validate all changes (tests must still pass)
6. Git commit with "evolution:" prefix
7. Generate evolution report in docs/evolution-reports/

## Safety Rules
- NEVER modify security hooks or deny rules automatically
- NEVER modify .claude/settings.json permissions without human approval
- NEVER remove existing agents or commands
- All changes must be reversible (git revert)
- Run tests after every change — revert if tests break
- Report ALL changes for human review

## What Gets Checked
- Agent prompts: clarity, accuracy, model tier assignment
- Commands: workflow efficiency, missing steps
- Hooks: coverage gaps, false positives/negatives
- Skills: relevance, token efficiency, progressive disclosure
- Plugins: outdated versions, security advisories, unused plugins
- CLAUDE.md: bloat (>200 lines?), outdated info, missing patterns
- Environment variables: unnecessary or missing configs
- MCP servers: unused servers consuming context tokens

## Evolution Report Format
```markdown
# Evolution Report — [DATE]
## Changes Applied
- [change 1]: [what and why]
## Changes Proposed (needs human approval)
- [change 1]: [what, why, and risk level]
## Metrics
- Before: [relevant stats]
- After: [relevant stats]
## Next Recommended Evolution
- [what to focus on next time]
```
