# Phase prompts

Each file in this directory is a single Cursor master-prompt for one
build phase. Run them in order.

The canonical execution plan is in `/MIOMIKA.md` §8. Each phase prompt
here corresponds to one phase in that plan.

## Index

- `phase-00-project-hygiene.md` — this directory's creation prompt (already run)
- `phase-01-foundation.md` — generated on demand
- `phase-02-cleanup.md` — generated on demand
- `phase-03-real-teaching.md` — generated on demand
- `phase-04-real-brain.md` — generated on demand
- `phase-05-real-conversion.md` — generated on demand
- `phase-06-operational.md` — generated on demand
- `phase-07-polish.md` — generated on demand
- `phase-08-marketplace.md` — generated on demand

## How to use a phase prompt

1. Open a NEW Cursor chat (don't continue an old one).
2. Paste the phase prompt file content.
3. Paste `/MIOMIKA.md` after it if the prompt asks for it.
4. Verify acceptance criteria locally.
5. Commit and push.
6. Update `/MIOMIKA.md` §10 State Log.

## How to request a new phase prompt

In a fresh Claude chat (claude.ai), paste `/MIOMIKA.md` and say:
"Generate phase N prompt."

Claude will produce a complete self-contained master-prompt to paste
into Cursor.
