# Skills Directory

Place SKILL.md files here to teach Claude domain-specific expertise.

## How Skills Work (Progressive Disclosure)
1. **At startup**: Only skill metadata (name + description from frontmatter) is loaded
2. **When relevant**: Full SKILL.md content is loaded into context
3. **On demand**: Reference files (references/, scripts/, assets/) loaded as needed

This means skills DON'T consume tokens until Claude actually needs them.

## SKILL.md Format
```yaml
---
name: my-skill-name        # lowercase, hyphens only
description: What this skill does and when to use it.
allowed-tools: "Bash, Read, Edit"  # optional: restrict tools
model: sonnet               # optional: preferred model
version: 1.0.0              # optional
---

# Skill Content
Instructions, examples, and rules go here.
Keep it concise — every token competes with conversation history.

## References
Point Claude to files in references/ for detailed docs.
```

## Best Practices
- **Write descriptions for discovery**: Claude uses the description to choose skills from 100+ options
- **Keep SKILL.md concise**: Overview + navigation, not full documentation
- **Use references/ for details**: Loaded only when needed
- **One domain per skill**: Don't mix unrelated topics
- **Test token impact**: Check with `/context` before and after

## Sources
- **OpenClaw community**: 3,000+ ready-made skills
- **Vercel Agent Skills**: `npx vercel-agent-skills` (React/Next.js performance + UI/UX)
- **Anthropic official**: Built-in skills (skill-creator, etc.)
- **Custom**: Write your own for your specific stack and workflows

## Installation
```bash
# Community skills from OpenClaw
# Browse: https://github.com/openclaw

# Vercel Agent Skills
npx vercel-agent-skills

# Manual: just drop a SKILL.md file in this directory
```

## Auto-Discovery
Skills are automatically discovered from:
- This directory (.claude/skills/)
- Nested subdirectories
- User settings (~/.config/claude/skills/)
- Installed plugins
