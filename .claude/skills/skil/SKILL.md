---
name: skil
description: Use skil to scan a repo's AI skill folders, file them onto SDLC commands, toggle skills/commands on and off, run doctor, get suggestions, and install market skills. Use when the user asks about their .agents/.claude skill setup, wants to organize skills into commands, or mentions skil, skil scan, skil skills, skil doctor, skil suggest, or skil install.
---

# skil

skil maps this project's AI skill folders onto named SDLC commands (`/build`) and mirrors them into two **live trees**: `.agents/skills` and `.claude/skills`. On/off is a path, not a flag.

CLI = current working directory. `skil --help` is source of truth for flags. Leftovers (old folders like `.cursor/skills`) — clean those in the app. No `show`.

On = a copy in both `.agents/skills` and `.claude/skills` (the live pair). Off = parked under `.skil/parked`, not deleted.

## Find

```bash
skil search
skil search --trending
skil search react
skil suggest
skil install obra/react-patterns
```

- `search` — top 10 by installs
- `search --trending` — what’s hot
- `search react` — lookup by name
- `suggest` — picks for this repo (doesn’t install). Editorial with no key; LLM-rerank with `SKIL_LLM_PROVIDER` + `SKIL_LLM_API_KEY`
- `install …` — drop that skill into the live pair. Use the name in the left column from search.

## Organize

### Skills

```bash
skil scan
skil skills
skil skills enable tdd
skil skills disable tdd
```

- `scan` — find `SKILL.md` folders in this repo. Read only.
- `skills` — what’s in the catalog (on / off)
- `skills enable` / `disable` — turn one skill on or off. Not `skil enable` — that one’s for commands.

### Commands

A command is a workflow (`build` → `/build`). Adding a skill to it doesn’t turn that skill on.

```bash
skil create build --skills tdd
skil list
skil add build design
skil remove build design
skil enable build
skil disable build
skil delete build
```

- `create` — make a command (starts off)
- `list` — what’s on the map
- `add` / `remove` — put a skill on a command, or take it off
- `enable` — turn the command on (writes a human-only skill into both live trees)
- `disable` — park it
- `delete` — drop the command

`skil enable` / `skil disable` take a **command** name. For a skill id use `skil skills enable|disable`.

### Rules

```bash
skil rules
skil rules enable pair-programming/behavior
skil rules disable pair-programming/behavior
```

- `rules` — list shared `AGENTS.md` sections and other rule files
- `enable` — turn a shared section on
- `disable` — turn it off

skil keeps its map in `.skil/state.json`.

## Eval

```bash
skil doctor
skil doctor build
skil usage
```

- `doctor` — checkup per command. Math + regex with no key; conflict / vague-trigger with a key
- `doctor build` — that command’s findings
- `usage` — how often Claude actually read a skill

## The whole loop

```bash
skil scan
skil skills
skil suggest
skil install obra/react-patterns
skil skills enable tdd
skil create build --skills tdd
skil add build obra/react-patterns
skil enable build
skil doctor build
```
