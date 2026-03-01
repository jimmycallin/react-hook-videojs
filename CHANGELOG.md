# Changelog

All notable changes to this project will be documented in this file.

## 4.0.0 - Future

### Breaking Changes

- Package is now ESM-only.
  - CommonJS `require("react-hook-videojs")` is no longer supported.
  - Use ESM imports: `import { useVideoJS } from "react-hook-videojs"`.
- `useVideoJS` now expects a memoized `videoJsOptions` object from consumers.
  - Pass options via `React.useMemo(...)` so player re-initialization only happens when option values actually change.
