---
name: skil
description: Use skil to scan a repo's AI skill folders, file them onto SDLC commands, toggle skills/commands on and off, run doctor, get suggestions, and install market skills. Use when the user asks about their .agents/.claude skill setup, wants to organize skills into commands, or mentions skil, skil scan, skil doctor, skil suggest, or skil install.
---

# skil

skil is a CLI (and desktop GUI) that keeps a project's AI skill folders mapped onto named SDLC commands (`/build`, `/tdd`, ...) and mirrored into two **live trees**: `.agents/skills` and `.claude/skills`. On/off is a path, not a flag — this skill teaches the six verbs that make up the whole loop: `scan`, `file` (`add`/`remove`), `enable`/`disable`, `doctor`, `suggest`, and `install`.

Everything below is scoped to the project skil is already bound to (CLI = current working directory). Run `skil --help` or `skil <command> --help` if a flag looks stale against this doc — the CLI is the source of truth for exact flags.

## 1. Scan — see what's on disk

```bash
skil scan
```

Unions the live pair (`.agents/skills`, `.claude/skills`), every leftover skill root (`.cursor/skills`, `.codex/skills`, `.github/skills`, `.windsurf/skills`), and the parked root into one catalog. Read-only pull — it never writes a folder, never invents a command from a skill folder, and never moves anything live↔parked. Run this first in an unfamiliar repo, and again any time skill folders changed outside skil.

## 2. File a skill onto a command

```bash
skil create build --skills tdd,ui         # empty or seeded command; starts off
skil add build design                     # file 'design' onto /build
skil remove build design                  # unfile it
skil list                                 # print the project map
skil delete build                         # drop the command (+ its live/parked folders)
```

Filing edits `/build`'s `## Skills` list only — it does **not** turn the filed skill on and does not install anything. A command name never keeps its leading slash in storage (`/build` → `build`); the CLI accepts either form.

## 3. Enable / disable — the only write

```bash
skil enable build     # writes /build as a human-only skill into BOTH live trees
skil disable build    # parks both copies under .skil/parked/commands/build
```

On means "the live pair exists"; off means "only the parked copy exists." There is no separate push/export step — toggling **is** the write, immediately, into `.agents/skills/<name>` and `.claude/skills/<name>` at once. Turning a command on refuses with a clear error (no auto-prefix) if a live folder with that name already exists and isn't skil's own command file.

Per-skill enable/disable (`setSkillEnabled`, park/restore a single catalog skill rather than a command) is GUI-only today — the CLI's `enable`/`disable` verbs take a command name, not a skill id.

## 4. Doctor — find problems before you add a key

```bash
skil doctor          # one row per command: token-ish cost + warning count
skil doctor build    # that command's findings, one line why each
```

Runs entirely on math + regex, no API key required: **idle-cost** (long always-loaded descriptions), **fat-body** (oversized `SKILL.md`), **unused** (filed skill with no reads — only after this project has usage history and a 14-day grace), **hash-split** (a skill's live/leftover/parked copies disagree), **secret** (a vendor-key-shaped string in the body). Read-only — nothing is persisted or rewritten.

Set `SKIL_LLM_PROVIDER` (`anthropic` | `openai` | `openrouter`) and `SKIL_LLM_API_KEY` in the environment (or save a key on the GUI Settings tab) to unlock two more finding types automatically: **conflict** (two filed skills whose triggers overlap or contradict) and **vague-trigger** (a description too generic to reliably fire). No key means `skil doctor`'s output is unchanged — never a smaller/crippled report, just missing those two types.

## 5. Suggest — what to add next

```bash
skil suggest
```

Without a key, prints editorial picks for a role (`--role`, default `swe`) plus a note pointing at the same two env vars `doctor` uses. With a key, fingerprints this project's `package.json` and reranks into ~15-20 ids most likely to match this stack. Never prints a stack trace. `suggest` only prints a shortlist — it never installs anything itself.

## 6. Install — bring a market skill in

```bash
skil install obra/react-patterns
```

Installs straight into the live pair (`.agents/skills/<id>` **and** `.claude/skills/<id>`) in one step — no staging area, no dock argument. This is the same write path `skil suggest`'s shortlist and the GUI Discover's `+` both feed into; file the installed id onto a command afterward with `skil add <command> <skillId>` if you want it grouped.

## The whole loop, start to finish

```bash
skil scan                       # 1. see what's already here
skil suggest                    # 2. editorial picks (LLM-reranks when a key is set)
skil install obra/react-patterns
skil create build --skills tdd  # 3. group into a command
skil add build obra/react-patterns
skil enable build               # 4. turn it on — both live trees now have it
skil doctor build               # 5. sanity-check what you just filed
```

Re-run `skil scan` any time skill folders change outside this loop — it's pull, so nothing is lost by scanning often.
