# Changelog

## 2026-06-14

### Added
- **Feed activity stats**: Shows live "online now" (green dot) and "active today" (orange dot) counts beneath the Browse/Swipe toggle on the feed, fetched from the users table and hidden when both counts are zero.

### Fixed
- **Online now count**: Subtracts the current user from the "online now" count so users don't see themselves included in the tally.
- **Avatar caching**: Service worker now intercepts Supabase storage image URLs and serves them cache-first. Cache busting is automatic via the `?t=<timestamp>` query param already present on avatar URLs.

### Changed
- **Brand name**: Added ™ symbol to the Socion name across all page meta titles (`index.html`, `Layout.jsx`, `usePageTitle.js`, `Home.jsx`).
- **Docs**: Updated README and CONTRIBUTING to reflect current codebase state — fixed broken links, added all new routes, rewrote the structure section, expanded the build log, and updated Supabase setup docs.
