---
name: token-optimization
description: Token and cost optimization strategies for Claude Code. Use when discussing costs, token usage, context management, or when the user wants to reduce spending.
version: 1.0.0
---

# Token Optimization Skill

## Top 5 Token Savers (in order of impact)

### 1. `/clear` Between Tasks
Stale context gets resent with EVERY message. A 10K-token history = 200K tokens after 20 messages.
```
/rename current-task    # Save for later
/clear                  # Fresh start
```

### 2. OpusPlan Model Selection
```
/model opusplan         # Opus plans, Sonnet executes
```
Result: 60% cost reduction vs pure Opus, higher quality than pure Sonnet.

For simple tasks: `/model sonnet` or `/model haiku`

### 3. Lean CLAUDE.md (under 200 lines)
Move details to `.claude/skills/` — only metadata loaded at startup.
Challenge each line: "Does Claude need this on EVERY message?"

### 4. `/compact` Proactively
Don't wait for auto-compact at 85%.
```
/compact preserve API signatures and test patterns
```

### 5. Disable Unused MCP Servers
Each MCP server adds tool definitions to context. Use `/mcp` or `/context` to check.

## Advanced Techniques

### Effort Level
```bash
export CLAUDE_CODE_EFFORT_LEVEL=medium  # Default for most work
# Low for simple tasks, High for architecture
```

### Disable Non-Essential Calls
```bash
export DISABLE_NON_ESSENTIAL_MODEL_CALLS=1  # Saves background tokens
```

### Background Tasks
Ctrl+B runs tasks in separate context — doesn't bloat main session.

### Session-Start Hooks
Load only relevant context per session type (see tiered documentation pattern).

## Cost Reference
- Average: ~$6/dev/day, 90% under $12/day
- Sonnet: $3/$15 per M input/output tokens
- Opus: $15/$75 per M tokens (or $5/$25 for Opus 4.5)
- Haiku: cheapest for classification tasks
- Prompt caching: 50-90% savings on repeated context (automatic)
