# Instructions for Claude

- **Always create a branch before making changes.** `main` is protected — never commit or push directly to it.
- **Update `CHANGELOG.md`** with any relevant changes made. If the change is user-facing and worth mentioning to visitors, also add an entry to `src/pages/Changelog.jsx` (the `ENTRIES` array), written in the same user-friendly tone as existing entries there.
- **Flag Supabase preview-branch cost when opening/pushing a PR that touches `supabase/`** (migrations, functions, config). The GitHub integration spins up a billed preview database ($0.01344/hr, Micro compute) for the entire time such a PR stays open, so mention it and suggest merging or closing promptly rather than leaving it open.
