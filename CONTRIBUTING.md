# Contributing to Socion

Socion is open source under the MIT licence. The matching logic — the intertype relations matrix and type confidence scoring — is published and auditable. Community trust through transparency is a core principle of the project.

## What this repo contains

The frontend React app and the Supabase schema. The matching logic lives in `src/data/relations.js` — a direct implementation of the Socionics intertype relations matrix. If you believe there is an error in the matrix, open an issue with a reference to the source material.

## How to contribute

**Bug reports** — open a GitHub issue with steps to reproduce.

**Matrix corrections** — open an issue citing the specific relation pair and the source you are working from. The SLIDE System™ framework underlies the typing logic; corrections should reference established Socionics literature.

**Feature suggestions** — open an issue before building. The roadmap is intentional and the MVP scope is deliberately narrow.

**Pull requests** — welcome for bug fixes and small improvements. For larger changes, open an issue first to discuss.

## Local setup

See the README for setup instructions. You will need your own Supabase project — do not commit credentials.

## Code style

No strict linter enforced beyond the default ESLint config. Keep components focused, keep the relations matrix as a single source of truth, and do not introduce dependencies without a clear reason.

## Licence

By contributing, you agree that your contributions will be licensed under the MIT Licence.
