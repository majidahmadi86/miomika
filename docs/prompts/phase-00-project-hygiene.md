You are the technical co-founder of Miomika. Read every instruction below carefully before doing anything.

## OBJECTIVE

Replace the chaotic .md file landscape in the project root with a single canonical document (MIOMIKA.md). Archive the rest. Update Cursor rules to point at the new document. Set up the prompt and asset brief directories for future phases.

This is a documentation-only operation. Do not touch any .ts, .tsx, .sql, or .json file. Do not change any code. Only file moves, file creation, and updates to two config files.

## INPUTS

The canonical document MIOMIKA.md (v2) is pasted separately or copied from the handoff package. It goes at the project root.

## EXACT OPERATIONS (do these in order)

### Step 1 — Create directories

```bash
mkdir -p docs/archive
mkdir -p docs/prompts
mkdir -p docs/asset-briefs
```

### Step 2 — Move every .md file currently in the project root EXCEPT these to docs/archive/

Keep at root:

- MIOMIKA.md (create in Step 4)
- README.md
- CLAUDE.md (only if it exists and is small; otherwise archive it)

Move to docs/archive/ using git mv (so history is preserved):

- BRIEF.md
- CHECKLIST.md
- AGENTS.md (if documentation; if it's an agents config keep at root)
- NEXT_SESSION_PROMPT.md
- PHASE1_WEEK1.md
- PHASE1_WEEK2.md
- PHASE1_WEEK3.md
- MIOMIKA_ARCHITECTURE_OPUS.md
- MIOMIKA_BIBLE.md
- MIOMIKA_COPY_AND_VOICE.md
- MIOMIKA_CREATE_SCREEN_OPUS.md
- MIOMIKA_DESIGN_SYSTEM_OPUS.md
- MIOMIKA_ENGINE_OPUS.md
- MIOMIKA_HANDOFF_MAY19.md
- MIOMIKA_MARKETING_BRIEF.md
- MIOMIKA_MASTER_HANDOFF.md
- MIOMIKA_NAV_SWIPE_OPUS.md
- MIOMIKA_TALK_SCREEN_OPUS.md
- MIOMIKA_USER_JOURNEY.md
- MIOMIKA_UX_CONVERSION_OPUS.md
- MIOMIKA_VOCABULARY_ARCHITECTURE.md

If any file doesn't exist, skip it silently. If a .md file exists at root that isn't listed and isn't README.md, CLAUDE.md, or MIOMIKA.md, archive it.

### Step 3 — Create docs/archive/README.md

See `docs/archive/README.md` in the repo for the canonical index text.

### Step 4 — Create MIOMIKA.md at the project root

Copy the full v2 canonical document verbatim to `/MIOMIKA.md`.

### Step 5 — Replace .cursorrules and .cursor/rules/miomika.mdc

Both files get the same content pointing at `/MIOMIKA.md`. See those files in the repo.

### Step 6 — Create docs/prompts/README.md

See `docs/prompts/README.md` in the repo.

### Step 7 — Create docs/asset-briefs/README.md

See `docs/asset-briefs/README.md` in the repo.

### Step 8 — Save this prompt

This file (`phase-00-project-hygiene.md`) records what was done.

### Step 9 — Confirm and report

Output the PHASE 0 COMPLETE report format from the original handoff prompt.

## CONSTRAINTS

- Use git mv for every move so git history is preserved (where files were tracked).
- Do not run git commit or git push. Leave the working tree dirty so Mike can review.
- Do not modify any .ts, .tsx, .js, .json, .sql, or .mjs file.
- Do not modify next.config.ts, tsconfig.json, tailwind.config.ts, eslint.config.mjs, postcss.config.mjs, middleware.ts, or any file in app/, components/, lib/, supabase/, public/, or types/.
- If anything is ambiguous, stop and ask before proceeding.

Begin.
