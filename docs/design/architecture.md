# skil Architecture

**skil** (one L) scans the messy world of skill/command/rule folders and keeps exactly two **live trees** in sync: `.agents` and `.claude`. On or off is a path, not a flag. No dock picker, no Export step, no login. It is a thin CLI + GUI over a connected project folder — work vs side project = two folders = two maps. Companion docs: decision history in `docs/design/decisions.md`, Discover backend in `docs/design/market-index.md`, product spec and user flow in `docs/requirements/prd.md`.

## Vocabulary

| Term | Means | On disk |
|---|---|---|
| **Skill** | folder containing `SKILL.md` (nested ok). Disk owns the body. | one catalog row, many `paths` |
| **Live pair** | on. A constant, not a picker. | `.agents/skills/<id>` **and** `.claude/skills/<id>` |
| **Parked** | off-but-yours. Toggling on restores from here. | `.skil/parked/{skills,commands,rules}/<id>` |
| **Leftover** | any other root we still scan. Catalogued, previewable, never written to. | `.cursor/skills`, `.codex/skills`, `.github/skills`, `.windsurf/skills`, stray always-on rule files |
| **Deprecated** | a leftover retired via adopt-and-deprecate. Recoverable, never scanned. | `.skil/deprecated/<original-path>` |
| **Command** | named SDLC knob (`/build`), **one list per project**. A live command is a human-only skill folder in both live trees. | `.agents/skills/<name>` + `.claude/skills/<name>` |
| **Rule** | shared law = `AGENTS.md` sections (togglable). Glob rules stay on disk, read-only. | `AGENTS.md`; `.cursor/rules/*.mdc`, `.claude/rules/**` |

We are **not** SoT for skill or rule file contents. We **are** SoT for: which skills/commands/rules exist in this project, their on/off state (inferred from path), and which skills sit on which command (**one list**).

**Scan** unions every root — live, leftover, parked — into one catalog and writes nothing. **Toggle** is the only write: on → live pair, off → parked. Market `+` already means "on," so it writes the live pair directly, once. One `.skil/state.json`; no per-tree state file.

Filing a skill onto a command edits that command's `## Skills` list — it does not install or enable the filed skill. `CLAUDE.md` is `@AGENTS.md` plus real Claude-only notes. We do not scan or own unstamped `commands/` trees, and we do not model runtime overlap (Cursor may also load `.agents`). The class in the tree is still `CollectionEngine` — that is the deep module; this doc says **Command** for the map grouping (today's `Collection` type alias). Rename the class when it stops lying; do not split the module.

## Stack

Node 20+, TypeScript (strict), Vitest. CLI: Commander + chalk + cli-table3. GUI: Electron + React. HTTP: axios (nock in tests). Subprocess: execa. YAML: js-yaml. TypeScript because the ecosystem we wrap (`npx skills add`, skills.sh tooling) is npm/TS, users already have Node, and Electron shares the engine with the CLI.

## Design Principles

**One deep module: the engine.** Callers learn a small interface. The implementation hides catalog merge, hashing, gone-id cleanup, the one command list, live/parked/leftover/deprecated path classification, human-only-skill command writes, rule-file discovery, and usage aggregation. No caller passes a dock or a dest — there is nowhere left to pick. **Deletion test:** delete the engine and that complexity reappears in both the CLI and the GUI.

Do **not** split into Scanner + Map + Deployer; those are three shallow modules that always change together. Do not add a `SkillScanner` adapter — one implementation would be a fake seam. **Supporting adapters:** `FileSystemAdapter` (local-substitutable — real + in-memory), `SkillsAdapter` (true-external — nock / in-memory), `UsageCollector` (Claude logs in prod, in-memory in tests). Two adapters each = a real seam, not a second deep module.

**Testability:** accept dependencies, don't create them; tests and callers cross the same seam. Primary seams are engine public methods, adapter interfaces, CLI handlers, the GUI bridge, and DiskWatch debounce/mute. Not seams: persist helpers, `createEngine` forwarding a path, one-line search/browse pass-throughs.

## Module Boundaries

### 1. Engine (deep module)

```typescript
interface SkilEngine {
  scan(): Result<ScanResult>                            // union live + leftover + parked; writes nothing
  skills(): SkillRecord[]
  create(name: string, skillIds: string[]): Result<Command>
  delete(name: string): Result<void>                    // drops the row + live/parked copies
  list(): Command[]                                     // the project map, one skills[] each
  addSkill(name: string, skillId: string): Result<Command>   // filing: write-through `## Skills` when live
  removeSkill(name: string, skillId: string): Result<Command>
  install(skillId: string, opts?: { dest?: string; replace?: boolean }): Promise<Result<SkillRecord>>
  deleteSkill(skillId: string): Result<void>            // hard delete: live + parked only
  readSkillMd(skillId: string): Result<string>          // first readable SKILL.md; missing → error
  setSkillEnabled(skillId: string, enabled: boolean): Promise<Result<SkillRecord>>
  setCommandEnabled(name: string, enabled: boolean): Promise<Result<Command>>
  setSharedRuleEnabled(id: string, enabled: boolean): Result<RuleRecord>
  leftovers(): Result<LeftoverRecord[]>                 // neither live nor parked nor deprecated
  adoptLeftovers(ids?: string[]): Promise<Result<AdoptResult>>  // copy into live if missing, then deprecate
  usage(): Promise<Result<UsageRow[]>>                  // Claude-first counts; missing logs → []
  lastWrittenPaths(): string[]                          // DiskWatch mute list
  originChecks(): Promise<Result<OriginCheck[]>>
  updateFromMarket(skillId: string, opts?: { replaceEdited?: boolean }): Promise<Result<SkillRecord>>
  search(query: string): Promise<Result<Skill[]>>
  browse(view: BrowseView): Promise<Result<Skill[]>>
  rules(): RuleRecord[]
  readRule(id: string): Result<string>
  health(): Promise<Result<HealthReport>>
  suggest(shelves: ShelfRole[]): Promise<Result<SuggestResult>>
}
```

**Doctor (`health()`).** A read-only pass over `commands[].skills` — never a folder walk, never persisted (same as `originChecks()`). One `CommandHealth` row per command: `{ name, tokenEstimate, warnCount, findings[], usedLlm }`. Math + regex findings always populate, no API key required: **idle-cost** (long filed-skill descriptions, always loaded), **fat-body** (oversized `SKILL.md`), **unused** (`usage()` is 0 for that filed skill), **hash-split** (a catalog id's live/leftover/parked copies disagree on disk), **secret** (vendor-key-shaped regex hit in the body). When an `LlmChat` is injected (BYOK — see below) and a command has at least one filed skill, one extra LLM call runs per command over that command's filed-skill descriptions + short body excerpts, adding **conflict** (overlapping/contradictory skill pairs — one finding per side of the pair) and **vague-trigger** (a description too generic to reliably fire) findings; `usedLlm` flips to `true` only when that call actually succeeds. A failed call (bad key, network) degrades silently — the row keeps its math+regex-only shape and `usedLlm` stays `false`; `pingLlm` is where a bad key surfaces clearly, not every doctor run. Pure scoring (`computeSkillFindings`, `computeLlmFindings`) lives in `src/core/health-checks.ts`, same shallow-helper pattern as `project-rules.ts`; the engine method itself just wires state, `usage()`, disk reads, and the optional LLM call into it. `skil doctor` and the Commands health strip both call this one method.

**Suggest (`suggest(shelves)`).** A read-only fingerprint + rank pass, never persisted, that requires an `LlmChat` — no key means `Err('NEED_KEY')` immediately and no shelves are touched. Fingerprint v1 reads this project's `package.json` (`dependencies` + `devDependencies` names, via `parsePackageDeps` in `src/core/suggest.ts`) and ranks every shelf skill not already on the catalog by how many dep name fragments show up in its id/name, then by installs (`rankByFingerprint`). The top candidates (capped at 40 to keep the prompt small) go to one LLM call (`rerankWithLlm`) that reorders them into 15-20 final ids; a failed/unparseable LLM response falls back to the fingerprint-only order instead of erroring the whole call. The caller always supplies `shelves` — the engine never fetches the market index itself (`SuggestResult` is `{ ids: string[] }`, ids only; the caller already has shelf name/installs data to render a row). `skil suggest` and the GUI's Suggested tab both call this one method.

**BYOK (`LlmChat` / `LlmSettings`).** `LlmChat` (`src/llm/llm-chat.ts`) is one OpenAI-chat-completions-shaped client with three hardcoded presets — `anthropic` (`https://api.anthropic.com/v1`, which now speaks the same OpenAI-compatible shape), `openai` (default), `openrouter` — each with a hardcoded cheap model id. `complete({ system, user, maxTokens? })` is its only method; `pingLlmChat(chat)` is a 1-token call for Settings' Save button. This is a **user-owned key, direct to the provider** — never through skil's Vercel backend or AI Gateway, and never confused with `LlmSkillClassifier` (that one is our key, for the weekly market-shelf classify job only). `CollectionEngine` / `createEngine` take an optional `LlmChat` (default none), same pattern as `UsageCollector`; without one, `health()`'s LLM slice never runs. `LlmSettings` is two implementations, not one shared interface: the CLI reads `SKIL_LLM_PROVIDER` + `SKIL_LLM_API_KEY` env vars (`src/llm/env-llm-settings.ts`, stateless, nothing to save); the GUI persists provider + key to `llm-settings.json` under Electron `userData` (`gui/src/main/llm-settings.ts`), the key itself run through `safeStorage.encryptString` before it ever touches disk. The renderer never receives the raw key back — only `hasLlmKey()`'s boolean, `saveLlmSettings()`'s `Result<void>`, and `pingLlm()`'s `Result<void>`. Saving settings rebuilds the session's engine in place (`rebindLlmChat`) so the next `health()` call picks it up without reconnecting the folder. Settings UI is a header gear icon (no Settings tab) — provider select, key field, one "Save + Test" button that saves then pings.

**Invariants**

- **On/off is a path.** Both live paths present → on. Only `.skil/parked/…` → off. Leftover-only → catalogued but neither, and a toggle never touches it. `enabled` is never persisted.
- Scan roots = the live pair, every leftover skill root, and the parked skill/command roots. `.skil/deprecated/` is never scanned.
- Scan never creates a command from a skill folder, never moves a folder, never writes a leftover root, and never moves live↔parked. Only `setSkillEnabled` / `setCommandEnabled` / `setSharedRuleEnabled` / `adoptLeftovers` / market install write.
- Same hash at a new path is a rename (keep the id, update `paths`), not gone + added. When every path for an id is gone, drop the id and report it.
- Scan does not mint a second id for an npx leftover short folder (`.agents/skills/<slug>`) when a `source: 'skills.sh'` row already owns that slug — it attaches the path to the market id.
- One catalog, **one command list**. No per-tree argument because there is no per-tree list. Market and Project rows are the same catalog, just on/off.
- Command names store without a leading slash (`create('/build')` → `build`); UI may show `/build`. `create` on an existing name is "already exists". No reserved names — there is no Inbox left to protect.
- **Name collision is an error.** `setCommandEnabled('build', true)` refuses if a non-command skill already owns that folder name. No auto-prefix.
- Filing never enables: `addSkill` edits the command's `## Skills` (and frontmatter `skills:`) only, and an off skill can be filed. A parked command is not rewritten until toggled back on.
- `deleteSkill(id)` removes the live pair and the parked copy of that id. Leftover, deprecated, and nested skills are untouched.
- Glob rules (`.cursor/rules/*.mdc`, `.claude/rules/**/*.md`) stay exactly as found — never folded into `AGENTS.md`, never toggled. `rules()` lists both kinds; only shared-law rows are togglable.

**Implementation responsibilities**

- Persist the catalog and the one command list in `.skil/state.json`. Missing file → empty state. A leftover `.contextkit/state.json` with no `.skil/` file is an error (move it), not a fallback.
- Walk the scan roots, hash `SKILL.md`, reconcile gone/changed/new/rename.
- `rules()` walks disk fresh (not persisted): `AGENTS.md` sections plus every glob file and leftover always-on file (`copilot-instructions.md`, a `CLAUDE.md` that is not `@AGENTS.md`, `.codex/rules`, `.github/instructions/**`, `.windsurf/rules/**`).
- `setSkillEnabled(id, false)` moves the live folders to `.skil/parked/skills/<id>`. `true` copies parked back to both trees; if parked is gone, re-fetch when `source` is `skills.sh`, error when it is `local`. `readSkillMd(id)` returns the first readable body on that row's `paths` (live, then leftover, then parked) and is display-only.
- `setCommandEnabled(name, false)` moves both `…/skills/<name>` folders to `.skil/parked/commands/<name>`; `true` copies back, refusing on a name collision.
- `setSharedRuleEnabled(id, true)` upserts one stamped `AGENTS.md` section; `false` removes it and parks the body under `.skil/parked/rules/<id>`.
- Market install: one `npx skills add` into `.agents`, then `copyDir` into `.claude`. Stamps `originHash`; `originChecks` / `updateFromMarket` compare it against disk and the live market body. Update is always explicit.
- `adoptLeftovers(ids)` copies each id into the live pair if missing there, then moves the old path to `.skil/deprecated/…` and drops it from `paths[]`. `lastWrittenPaths()` is the mute list DiskWatch reads after any write.

**Gone from the product surface:** `copyTo`, `copyAll`, `importFrom`, `install(skillId, dock)`, `exportCommand`, `exportAll`, `exportRules`, the `Dock`/`IDE` picker argument, `Inbox`, and CLI `--to <dock>` / `copy` / `export`. See `decisions.md`.

### 2. FileSystemAdapter

```typescript
interface FileSystemAdapter {
  readJSON<T>(path: string): Result<T>              // + writeJSON<T>(path, data)
  findSkillFolders(root: string): Result<string[]>  // dirs containing SKILL.md; missing root → ok([])
  readFile(path: string): Result<string>            // + writeFile(path, data)
  copyDir(from: string, to: string): Result<void>
  listFiles(dir: string): Result<string[]>          // missing → ok([]); file-at-path → error
  listAllFiles(dir: string): Result<string[]>       // recursive
  removeFile(path: string): Result<void>            // missing is ok; + removeDir(path)
}
```

The adapter only answers "which folders under `root` contain a `SKILL.md`" and reads/writes bytes; a parent is a skill only if it has its own `SKILL.md`. Ids, hashes, membership, and reconcile rules stay in the engine. `copyDir` does live↔parked and `.agents`→`.claude`; `removeFile` / `removeDir` back the park, deprecate, and delete moves.

### 3. SkillsAdapter

```typescript
interface SkillsAdapter {
  search(query: string): Promise<Result<Skill[]>>
  browse(view: BrowseView): Promise<Result<Skill[]>>
  install(skillId: string, opts?: { cwd?: string }): Promise<Result<void>>  // universal agent, into .agents
  getInstalled(): Skill[]                                                   // leftover; real adapter returns []
}
```

- `search` / `browse` go through our Vercel backend with OIDC — no user API key, no skil registry. Browse is CDN-cached on 200. Origin: `SKIL_API_URL`, then `CONTEXTKIT_API_URL`, then `website.json`.
- `install` runs `npx skills add <source> --agent universal --copy -y` with `cwd` = project root. `universal` is the only agent name we ever pass; `.claude` is a `copyDir` the engine does afterward, not a second network install. 3-part skills.sh ids become `owner/repo@skill` via `src/backend/skills-add-source.ts`.
- Listing fields (`name`, `repo`, `installs`, …) stay in memory. Never persisted on catalog records.

### 4. CLI (thin)

Commander routes to the engine; no catalog logic here. Bin is `skil`, with `contextkit` as an alias. Help and errors say **command**, not collection.

```
skil scan                                     union live + leftover + parked into the catalog
skil create <name> [--skills <ids>]           empty or seeded command
skil delete <name>                            drop the command + its live/parked folders
skil list                                     the project map
skil add|remove <command> <skillId>           write-through `## Skills` on a live command
skil enable|disable <command>                 write the command as a human-only skill, or park it
skil rules | rules show|enable|disable <id>   list, read, toggle a shared-law section
skil usage                                    use counts (Claude first)
skil doctor [name]                            findings table, or one command's findings — no key required
skil suggest                                  shortlist ~15-20 market ids matching this project's stack — needs a key, never installs
skil search [query] [--trending]              all-time leaderboard when query is omitted
skil install <skillId>                        market install straight to the live pair
```

No verb takes `--to <dock>`, `--from`, `copy`, or `export`. **Not implemented yet** (GUI-only for now): per-skill `enable`/`disable` (`setSkillEnabled`) and `leftovers` / `adopt` (`leftovers`, `adoptLeftovers`). BYOK has no CLI verb — `SKIL_LLM_PROVIDER` + `SKIL_LLM_API_KEY` env vars are the whole surface (`src/llm/env-llm-settings.ts`); `skil doctor` picks up `conflict`/`vague-trigger` findings automatically when both are set, and `skil suggest` prints a clear "no LLM key" message (pointing at the same two env vars) instead of a stack trace when neither is set.

### 5. GUI (thin)

Same engine, no business logic in React. Window, brand, and renderer bridge say **skil** (`window.skil`).

**Bind:** `projectRoot` is session-only. `pickProjectFolder` = dialog + `bindProjectFolder`, which is `createEngine(path, loadLlmChat())` + DiskWatch. No login, no last-folder file. Discover / Skills / Commands / Rules work with no folder; scan needs one. The header shows the bound path and a Re-scan icon only after connect. Pick calls `scan()` once.

**Tabs**

- **Skills** — the whole catalog, paged and searchable, grouped Market (`source: 'skills.sh'`) vs Project (`source: 'local'`) as a display filter. Toggle per row. Row click opens `SkillPreviewDialog` (catalog ids read `readSkillMd` and list every path; Discover-only ids call `marketPreview`). Market-origin rows show Synced / Edited / New copy; Update appears only when disk still matches `originHash` and the market moved, Reset only in preview. Delete is preview-only. A row whose id appears in any `health()` finding shows a small "Finding" badge. Listens to `onScan`; no Scan control.
- **Commands** — one list. Create, file from Skills, remove skill, delete command, toggle per row. Filed skills show Claude read counts. Each row and the detail panel show a `health()` strip (token-ish number + warn count, no key required); clicking into a command lists its findings, and Disable/Remove on a finding reuse the existing `setSkillEnabled(false)` / `removeSkill` calls behind a confirm dialog. No dock chips, no Export.
- **Rules** — shared-law rows get a toggle; glob rows are read-only. Click to preview. Does not create rules. Same finding badge as Skills, keyed off `Finding.skillId` matching the rule's id.
- **Discover** — one nest shared with Landing: live Top / Trending, then market index role → category, plus search and preview. Empty or failed shelves stay on this nest and default to Top. `+` calls `bridge.install(skillId)` — already an on decision. A third **Suggested** chip runs only when selected (not on every Discover visit) and gates on three states, checked fresh each selection: no bound folder → connect-a-folder prompt; folder bound but `hasLlmKey()` false → "No LLM key" message routing to Settings; both present → `bridge.marketShelves()` then `bridge.suggest(shelves)` render as a plain row list, same per-row `+` as Top/Trending (no "Add all"). A `root::hasKey` cache key skips the refetch when switching tabs and back with nothing changed.
- **Sync** — pick / change folder, plus a **Leftovers** card grouped by kind with one action, **Use ours and remove leftovers** (`adoptLeftovers`). Parked items never appear here.

**There is no push control.** A toggle (or Discover's `+`) *is* the write. Loading / success / failure is inline on the row, not a modal — there is no dest or replace flag left to configure. A market skill with no parked copy re-fetches on toggle-on; a local one errors inline. A command-name collision surfaces inline on the toggle. Mutating bridge calls are exactly `install`, `setSkillEnabled`, `setCommandEnabled`, `setSharedRuleEnabled`, `adoptLeftovers`, `saveLlmSettings`.

**Settings (header gear, not a tab):** provider select (`anthropic` / `openai` / `openrouter`), a key field, one "Save + Test" button that calls `saveLlmSettings` then `pingLlm`. `hasLlmKey()` drives the "Key saved" / "No key saved" line when the dialog opens. The renderer never sees the key again after Save — only these three booleans/Results. Saving rebinds the session engine (`rebindLlmChat` in GUI main) so `health()` picks up the new key on the next call without reconnecting the folder.

**DiskWatch** (GUI main, started after bind): watches the live pair, leftover skill roots, parked roots, glob rule dirs, and the project root non-recursive for `AGENTS.md` / `CLAUDE.md` / leftover always-on files. Debounce ~500ms, mute our writes ~1s, skip `.git` and `.skil/deprecated`. Flush calls `scan()` then mutes `lastWrittenPaths()`, and the window refreshes. Not a live 3-way merge, not a CLI daemon.

### 6. Market index (Discover backend)

A curated Supabase copy of skills.sh (~20k rows), nested role → category → top 30 by installs, refreshed by a laptop script plus a weekly cron. It has its own store, its own sync loop, and no per-tree membership concept — it only feeds Discover's read path and never touches the catalog or `SkillsAdapter`. Always call it the **market index**, never "the engine." Phases 1–4 shipped. Full module boundary: `docs/design/market-index.md`.

## Data Model

Schema **v7**. Load v6 `skills[]` as-is; a leftover `inbox` array is read and dropped on the next persist. `installedSkills` is kept so old files don't break but is not the catalog.

```typescript
interface State {
  version: string              // "7.0"
  commands: CommandRecord[]
  skills: SkillRecord[]        // one catalog — we are SoT
  installedSkills: Skill[]     // leftover, ignored
}

interface CommandRecord {      // `Command`, the list() view DTO, is the same shape
  name: string                 // "build" — display as /build
  skills: string[]             // project SoT
  createdAt: string
}

interface SkillRecord {
  id: string                   // path relative to the skills root ("tdd", "ui/styling")
  hash: string                 // sha256 of SKILL.md (utf-8)
  paths: string[]              // every folder currently seen (live + leftover + parked)
  source: 'local' | 'skills.sh'  // origin, not location — drives Market/Project grouping
  originHash?: string          // SKILL.md hash at market copy-time; scan never overwrites it
}

/** rules() view DTO — walked from disk, never persisted. */
interface RuleRecord {
  id: string                   // "pair-programming/behavior" for a section; a relative path for a glob file
  name: string
  kind: 'shared' | 'glob'      // shared → one AGENTS.md section, togglable; glob → read-only
  path: string                 // AGENTS.md for shared; the .mdc/.md path for glob
  enabled?: boolean            // shared only
}

interface LeftoverRecord { kind: 'skill' | 'command' | 'rule'; id: string; path: string }
interface AdoptResult { adopted: string[]; deprecated: string[] }   // ids copied into live; old paths moved
interface UsageRow { skillId: string; count: number }

interface ScanResult {
  added: string[]; gone: string[]
  changed: string[]            // path still there, hash updated
  alwaysOnWarnings: string[]   // leftover always-on rule files that fight AGENTS.md
}

/** health() view DTO — computed fresh from state + disk + usage() each call, never persisted. */
interface Finding {
  type: 'idle-cost' | 'fat-body' | 'unused' | 'hash-split' | 'secret' | 'conflict' | 'vague-trigger'
  skillId: string
  message: string               // one-line why, shown as-is in the CLI and GUI
}
interface CommandHealth { name: string; tokenEstimate: number; warnCount: number; findings: Finding[]; usedLlm: boolean }
type HealthReport = CommandHealth[]

/** suggest() view DTO — ids only, computed fresh each call, never persisted. Caller already has shelf name/installs to render a row. */
interface SuggestResult { ids: string[] }
```

**Id rule:** id = path relative to the skills root, so every copy of the same id is one row with multiple `paths`. Nested `build/tdd/SKILL.md` → `build/tdd`. **Hash** is `SKILL.md` only, not the whole folder — enough for `changed` and `originChecks`. Because on/off is the path list, a stray edit to one tree and not the other is directly visible (both paths present, different hashes) instead of hidden behind a boolean.

**Load order:** v7 as-is → v6 `skills[]` as-is → v5 `commands[].membership` unioned (first key, then the rest, unique) → v4 `commands[].skills` → v3 `collections` renamed to `commands`, then the same. Missing `skills` → `[]`. The Discover listing `Skill` is the skills.sh DTO, in-memory only; it becomes a catalog row when `+` writes the live pair.

### Live command skill (write)

Both live trees get `skills/<name>/SKILL.md` plus `skills/<name>/agents/openai.yaml`. Off moves both to `.skil/parked/commands/<name>/`. There is no third location and no dock-specific extension — a command is a skill, full stop.

```markdown
---
name: /build
skills: [tdd]                 # one per line in real files
disable-model-invocation: true
generated_by: skil
generated_at: 2026-08-22T23:00:00.000Z
---
## Goal / ## Sequence / ## Rules   <!-- user's text, never rewritten -->
## Skills                          <!-- managed list, mirrors frontmatter -->
When they apply, read and follow:
- `tdd`
```

`disable-model-invocation: true` plus `allow_implicit_invocation: false` in `openai.yaml` make it **human-only**: the agent runs it when someone types `/build`, never on its own judgment. `generated_by: skil` is how `setCommandEnabled` recognizes its own folder during the collision check. `addSkill` / `removeSkill` rewrite frontmatter `skills:` and `## Skills` on the live pair only; everything above `## Skills` stays as the user edited it.

## Key Decisions

- **Split SoT.** Disk owns skill bodies; skil owns the catalog, hashes, the one command list, and where each id currently lives. There is no projection step — a live copy is not a generated artifact, it just *is* the on state.
- **Scan is pull; toggle is push, not a picker.** A dest argument on every write is how the old model grew five copies to hand-sync. A fixed live pair removes the argument.
- **One catalog, one command list, two live trees.** Rejected: per-dock membership (v5), four IDE tabs, a dock picker on install/export (v6), treating `.agents` as a fourth product. Filing once per project matches how people work. This reversed two earlier decisions in a year — the signal that "which dock" should never have been a per-call argument at all.
- **Toggle is the write.** Nothing to defer, so no separate push step to reason about. `addSkill` / `removeSkill` write through only because the command is already on.
- **No Inbox.** A `+` writes the live pair immediately. Market vs Project is a display filter over one catalog, not a queue. `originHash` + manual Update/Reset is still how a later market change gets noticed without overwriting disk.
- **Leftovers are read-only except through `adoptLeftovers`.** Those files are the user's workflow text or a stray tool's dump; owning them by default would make skil a competing command manager. One explicit, always-reversible cleanup is the middle ground.
- **Watcher is scan, not merge.** Explicit Re-scan is too easy to skip; a 3-way merge of map + disk + body edits is out.
- **Usage is counts, no SQLite.** Claude session logs first, Cursor hook only if small, no "used properly" judge. Unused vs used is the product question.
- **Project-local, no login.** CLI = cwd, GUI = picker + `createEngine(root)`. Cross-project import is dropped, not redesigned — it depended on picking a dest dock, and copying a folder by hand covers it.

## Test Strategy

**Unit (70%)** — engine with adapters mocked: scan unions live/leftover/parked without writing leftover; one-list add/remove/create/delete; `setSkillEnabled` off→park→on→restore plus market re-fetch; `setCommandEnabled` the same plus the collision error; `setSharedRuleEnabled` upsert/remove on `AGENTS.md`; `leftovers` / `adoptLeftovers`; gone ids; usage counts; `health()`'s math+regex findings and LLM slice (pure logic unit-tested in `health-checks.test.ts` with a fake `LlmChat`, engine wiring — including a failed LLM call degrading silently — in `collection-engine.test.ts`); `LlmChat`'s three provider presets and clear-401 failure (`llm-chat.test.ts`); env-based `LlmSettings` parsing (`env-llm-settings.test.ts`); the GUI's stored-settings shape parsing (`gui/src/shared/llm-settings.test.ts`); `suggest()`'s pure fingerprint/rank/rerank logic with fake shelves + a fake `LlmChat`, including the no-key `NEED_KEY` error and the fingerprint-only fallback on a bad LLM response (`src/core/suggest.test.ts`).

**Integration (20%)** — CLI against an in-memory engine; temp-dir FS for walk, hash, and park/deprecate moves; DiskWatch debounce/mute with a fake clock.

**E2E (10%)** — GUI with the real engine and fake adapters: connect → scan → toggle a skill on (both live folders exist) → toggle off (parked, row stays) → adopt a leftover (old path gone, new path under `.skil/deprecated/`).

**Agreed seams:** engine public methods; `FileSystemAdapter.findSkillFolders` / `readFile` / `writeFile` / `copyDir` / `removeDir`; `SkillsAdapter.install(skillId)`; `UsageCollector.collect`; CLI handlers; the GUI bridge; DiskWatch debounce/mute/skip. **Not seams:** re-testing `.cursor/skills` concatenation when `findSkillFolders` already takes that root; `createEngine` wiring; JSONL field names in the Claude parser.

## Implementation Notes

**DI:** `CollectionEngine(fs, skills, usage?, projectRoot?, llmChat?)`. `createEngine(projectRoot = process.cwd(), llmChat?)` wires a real `ClaudeUsageCollector`; `llmChat` is opt-in and only feeds `health()`'s LLM slice. DiskWatch lives in GUI main, not a constructor arg.

**Errors:** `Result<T>` for expected failure. Persist failure rolls back in-memory state. Conflict failures carry `code` + `labels` (command-name collision, market re-fetch failure) so the GUI never parses `Error.message`. **State:** atomic JSON write, schema version on every persist. No separate migration step — an old file's `inbox` array is simply not read or written back.

## Success Criteria

1. Scan a repo with nested `SKILL.md` folders: all catalogued, no commands invented, leftover-only folders not copied into the live pair.
2. Market `+` writes both live folders immediately. Toggle off → parked, row stays. Toggle on → both back (re-fetched if parked is gone).
3. File `tdd` onto `/build`: `## Skills` lists it, and `tdd`'s own folders are unchanged — filing never enables.
4. Delete a skill, re-scan: the id leaves the catalog and every command that had it, and the user is told.
5. `/build` on writes `build/SKILL.md` + `agents/openai.yaml` in **both** trees; off leaves neither and `.skil/parked/commands/build/` exists. Turning it on when a non-command skill owns that name is a clear refusal, no auto-prefix.
6. CLI and GUI share the engine; zero catalog logic in React; one Skills list and one Commands list, no dock chips or Export anywhere.
7. DiskWatch: two events inside 500ms become one scan; muted paths and `.skil/deprecated` are ignored; `.git` is skipped.
8. **Use ours and remove leftovers** copies any missing id into the live pair, moves the old path under `.skil/deprecated/`, and never touches a parked path.
9. `usage()` counts Claude skill reads from fixtures; missing logs → empty, not a crash.
10. Rules tab lists every shared-law section (togglable) and every glob file (read-only); `.cursor/rules/*.mdc` is never copied into `AGENTS.md`.
11. `health()` / `skil doctor` run with zero LLM key and report idle-cost, fat-body, unused, hash-split, and secret findings per command; nothing is persisted.
12. Saving a BYOK key round-trips: `hasLlmKey()` flips `true`, `pingLlm()` succeeds on a valid key and fails clearly on an invalid one, and the raw key never crosses back over IPC. With a key set, `health()` adds `conflict` / `vague-trigger` findings only on commands with filed skills; with no key, the report is byte-for-byte the same shape as Phase 1.
13. `suggest()` with no key returns `Err('NEED_KEY')` and never touches the shelves argument; with a key, a fixture `package.json` + fixture shelves produce a 15-20 id shortlist excluding ids already on the catalog. `skil suggest` and the GUI's Suggested tab print/render the same shortlist; the GUI tab's three gate states (no folder, no key, ready) never fire a network call in the wrong state.

## Open Questions

1. One skill on many commands — the map allows it; the GUI files from Skills only.
2. npm package is `skil` (bins `skil` + `contextkit`). Confirm the name is free before publish.
3. Parked is the last live snapshot at toggle-off time, so nothing is lost on restore — but there is no merge if the parked copy goes stale against the map while off. Revisit if it matters in practice. Team YAML sync stays undesigned this phase (no `.skil.yml`).

## Not this phase

- A dock picker or five-way export, in any form; command markdown under a `commands/` tree
- Cross-project import; global (`~/`) skill library as SoT; modeling runtime overlap
- Auto-copying leftovers on scan (only the explicit `adoptLeftovers`); a wishlist Inbox that is not on disk
- Symlink parking (copy + remove is enough); live 3-way merge of map + disk + body
- Stamps on ordinary `SKILL.md` — stamps stay on the command/rule files we generate
- SQLite, LLM-judge eval, Copilot/Codex usage parsers (leftover scan yes, counts later)

**Shipped, not "not this phase" anymore:** Phase 1's math+regex `health()` / `skil doctor`, Phase 2's BYOK + LLM-powered `health()` findings (`conflict`, `vague-trigger`), and Phase 3's `suggest()` / `skil suggest` / Discover's Suggested tab — see "Doctor (`health()`)", "BYOK", and "Suggest (`suggest(shelves)`)" above. skil's own `SKILL.md` (teaching the whole scan/file/enable/disable/doctor/suggest/install loop) ships in the live pair — `.agents/skills/skil/SKILL.md` and `.claude/skills/skil/SKILL.md` — same as any other skill, no bespoke installer.

## References

- Decision history: `docs/design/decisions.md` · market index: `docs/design/market-index.md`
- PRD: `docs/requirements/prd.md` · user loop: `README.md` · tasks: `tasks/plan.md`, `tasks/todo.md` · skills: `.agents/skills/design/codebase-design/SKILL.md`, `.agents/skills/philosophy/tdd/SKILL.md`, `.agents/skills/skil/SKILL.md` (skil's own scan/file/enable/disable/doctor/suggest/install loop)
