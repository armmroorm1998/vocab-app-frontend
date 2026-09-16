# Feature workflow: intent → spec → plan

Lightweight version of the AI-native SDLC stages, sized for a solo project. Skip stages for small changes — use this for anything that touches multiple files or is easy to get wrong.

1. **intent** — Copy `intent.template.md` into `intent/<feature-name>.md`. Fill in the problem, proposed outcome, and open questions before writing code.
2. **spec** — Copy `spec.template.md` into `intent/<feature-name>-spec.md` once the intent is agreed. Describes what the feature does and how, not the step-by-step implementation.
3. **plan** — Copy `plan.template.md` into `intent/<feature-name>-plan.md`. Lists the files that change, the order of work, and how you'll verify it (e.g. `npm run build`, `npm run lint`, manual check in the browser).

Ask Claude Code to start a session in **plan mode** for anything following this flow, so the plan is reviewed before code is written.

Once a feature ships, the intent/spec/plan files can stay in `intent/` as a record, or be deleted — they're working documents, not permanent docs.
