@AGENTS.md

# vocab-app-frontend

Next.js frontend for a vocabulary learning app (flashcards, quiz, dictation, listening, sentence drills, admin).

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (also type-checks)
- `npm run lint` — eslint with `--fix`
- No test suite yet.

## Conventions
- Routes live under `src/app/<feature>` (App Router). API routes under `src/app/api`.
- Shared types in `src/types`, shared logic/fetchers in `src/lib`, shared UI in `src/components`.
- This project pins a pre-release Next.js — see `AGENTS.md` above before touching routing, data fetching, or config APIs; check `node_modules/next/dist/docs/` rather than assuming stable-Next.js behavior.

## Workflow
For non-trivial features, use the intent → spec → plan flow in `docs/workflow/README.md`. Review policy is in `REVIEW.md`.
