# Review policy

Solo project — this is the checklist to run over your own diffs before considering a change done (via `/code-review` or manual read).

## Passes
1. **Correctness** — does it do what the intent/spec said? Check edge cases: empty states, loading, error responses from the API.
2. **Consistency** — does it match patterns already used elsewhere in `src/app` and `src/components` (naming, data fetching via `src/lib`, types in `src/types`)?
3. **Simplification** — any code that could be deleted or simplified without losing behavior?

## Severity
- **Blocking** — breaks a page, breaks the build, breaks auth/access gating (contribute form, admin pages), leaks a secret.
- **Should fix** — inconsistent with existing patterns, missing an edge case, unclear naming.
- **Optional** — style nits, minor duplication.

## Exclusions
Don't flag: generated files (`.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`), formatting-only diffs (handled by `npm run lint`), and `node_modules`.
