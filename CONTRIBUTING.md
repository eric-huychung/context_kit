# Contributing

Solo project. PRs welcome — I might be slow.

Node 20+. You don't need Vercel or Supabase keys to hack on the CLI/GUI.

```bash
npm install
npm run ci
```

`npm run ci` is typecheck (CLI + GUI), tests, CLI build, website build, GUI build. Same job as GitHub Actions on PRs and `main`. A tag `v*` also packages unsigned macOS `.dmg`s.

CLI is `src/`. GUI is `gui/`. Same engine. Don't add a second one.

README is the user CLI. Change a command → update README too.

PR against `main`. One thing per PR. Be kind — [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Vulns → [SECURITY.md](SECURITY.md), not a public issue. Thanks.
