# AGENTS.md

Guidance for coding agents working inside the `mcp-servers` registry repo. Complements [`README.md`](README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md); when anything here conflicts with an explicit user instruction in the current session, the user wins.

## Project Overview

`mcp-servers` is the community-maintained registry of MCP server definitions for [McpMux](https://mcpmux.com). Each server is a single JSON file in `servers/`, validated against a JSON Schema on every PR. Merges to `main` are bundled and published to the McpMux discovery API, so definitions land in user installs automatically.

This is **not** a code repo — there is no runtime to ship, no UI to build. The artefact is the set of JSON files and the bundle generated from them. Agent changes here are almost always JSON edits plus CI green.

## Repository Layout

```
mcp-servers/
├── servers/                       # One JSON file per MCP server — the registry
├── schemas/
│   └── server-definition.schema.json   # JSON Schema 2020-12 — the contract
├── categories.json                # Allowed categories
├── examples/                      # Starter templates for contributors
│   ├── complete-example.json
│   ├── remote-hosted-example.json
│   ├── read-only-example.json
│   └── sponsored-example.json
├── scripts/
│   ├── validate.js                # AJV validation + conflict detection
│   └── build-bundle.js            # Aggregates servers into bundle/bundle.json
├── tests/                         # Vitest — schema, consistency, categories, bundle
├── bundle/                        # Generated — do not edit by hand
├── CONTRIBUTING.md
└── LICENSE                        # Elastic License 2.0 (ELv2)
```

## Setup

```bash
pnpm install
```

Node.js 20+ and pnpm 9+. No Rust, no native deps.

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm validate servers/<file>.json` | Validate specific definition(s) against the schema. |
| `pnpm validate:all` | Validate every file in `servers/`. |
| `pnpm check-conflicts` | Detect ID/alias collisions across definitions. |
| `pnpm test` | Full test suite (schema, consistency, categories, bundle). |
| `pnpm test:watch` | Watch mode for local iteration. |
| `pnpm build` | Generate `bundle/bundle.json`. |

**Always run `pnpm validate:all && pnpm check-conflicts && pnpm test` before claiming a change is done.** CI runs the same checks on every PR.

## Server Definition Rules

Every definition must include **`id`**, **`name`**, and **`transport`**. Recommended additions: `description`, `alias`, `categories`, `capabilities`, `links.repository`, `contributor`, `platforms`, `auth`.

### ID convention

- Format `{tld}.{publisher}-{name}`, lowercase, regex `^[a-z0-9]+\.[a-z0-9][a-z0-9-]*$`.
- `com.*` — official publishers / well-known orgs (`com.github-mcp`, `com.notion-mcp`).
- `community.*` — community contributions (`community.sqlite`, `community.brave-search`).
- The filename must match the ID: `servers/community.brave-search.json`.

### Transport

- `stdio` — local command, runs on the user's machine. Provide `command`, `args`, optional `env`.
- `http` — remote Streamable-HTTP endpoint. Provide `url`.

### Input placeholders

User-supplied values flow through `${input:VAR}` substitution in `env` and `args`. Every placeholder must have a matching entry in `transport.metadata.inputs`. For secrets, set `secret: true` and `type: "password"` so McpMux encrypts them in the OS keychain. Include an `obtain` block with step-by-step instructions whenever the user has to visit a dashboard.

See `examples/complete-example.json` for the full shape.

### Categories

Must come from `categories.json`. Need a new one? Open a registry issue — don't invent an ID inline.

## Platform-Managed Fields (do not set)

Contributor PRs that touch these are rejected:

- `badges`, `stats`, `sponsored`, `featured`
- `publisher.official`, `publisher.verified`, `publisher.domain_verified`
- Any `_platform*` prefix

These are computed or granted by McpMux maintainers after verification.

## Trademark & Branding

- Reference third-party products with "works with", "for", or "connects to" — never "official", "certified", "endorsed" unless you represent the trademark owner and are verified.
- Logos are referenced by HTTP(S) URL in the `logo` field — McpMux does not host logo files and emoji are not accepted. Only link to assets you have the right to reference. The legacy field name `icon` is still accepted for backward compatibility.
- See `TRADEMARK-TAKEDOWN.md` for the full IP policy.

## Commit & PR Guidelines

- Commits must be **signed off** (DCO): `git commit -s -m "..."`. CI rejects unsigned commits.
- One server per PR keeps review fast. Multi-server PRs are fine for coordinated maintenance sweeps.
- PRs follow [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). The checklist exists to catch the common failure modes — please actually tick it.
- Don't bypass hooks (`--no-verify`) or DCO signing unless explicitly told to.

## Issue Templates

Two templates live in `.github/ISSUE_TEMPLATE/`:

- `request-server.yml` — ask the community to add a server you don't have a definition for. **Deep-linked from the McpMux desktop app** — keep the filename stable.
- `bug-report.yml` — flag a broken or incorrect existing definition. **Deep-linked from the McpMux desktop app** — keep the filename stable.

Contributors who want to add a server open a PR against `servers/` — there is no issue-based submission path. See `CONTRIBUTING.md` for the flow.

Renaming or removing either template breaks deep links shipped in every installed McpMux — don't do it without coordinating with the app.

## Adding a Server — Quick Recipe

1. Copy the closest template from `examples/` to `servers/<your-id>.json`.
2. Set `id`, `name`, `description`, `transport`, `categories`, `links.repository` at minimum.
3. For every user-provided value, add an entry to `transport.metadata.inputs` with `obtain` instructions.
4. `pnpm validate servers/<your-id>.json && pnpm check-conflicts && pnpm test`.
5. `git commit -s -m "Add <your-server-name>"` and open a PR.

## Things Not To Do

- **Don't edit `bundle/`** — it's generated by `scripts/build-bundle.js`. CI will overwrite anything you put there.
- **Don't edit `schemas/server-definition.schema.json`** as part of a server submission. Schema changes are their own PR, discussed separately.
- **Don't claim official status** (`publisher.official: true`, "official" badge, etc.) unless you're a verified publisher.
- **Don't remove or rename issue-template files** without coordinating with the McpMux app — the desktop app links to specific template filenames.
- **Don't add servers that require the user to run arbitrary shell scripts during install.** Stick to `npx`, `uvx`, `docker`, `python`, `node`, or HTTPS endpoints.
