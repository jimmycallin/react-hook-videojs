# Repository Guidelines

## Project Structure & Module Organization

This repository is a pnpm workspace monorepo:

- `packages/react-hook-videojs`: published hook library (`src/index.tsx`, tests in `src/index.test.tsx`, build output in `dist/`).
- `packages/example`: Vite demo app for manual verification (`src/App.jsx`, `src/sample.vtt`).
- `.github/workflows`: CI and formatting checks.

Keep library logic in `packages/react-hook-videojs/src` and use the example app only for demo and integration checks.

## Build, Test, and Development Commands

Run commands from the repository root unless noted.

- `pnpm install`: install dependencies for all workspaces.
- `pnpm run dev`: starts library watch build and example app dev server together.
- `pnpm run test`: runs formatting check, ESLint, and workspace tests.
- `pnpm --filter react-hook-videojs test`: runs Vitest suite for the library.
- `pnpm --filter react-hook-videojs build`: builds library bundles and type declarations.
- `pnpm run publish`: publishes the `react-hook-videojs` workspace.

## Coding Style & Naming Conventions

- Formatting: Prettier (`npx prettier -c .` / `--write`).
- Linting: ESLint with TypeScript + React rules (`.eslintrc`), including required explicit function return types.
- Indentation and whitespace follow `.editorconfig` (2 spaces, LF, UTF-8, final newline).
- Use `PascalCase` for React components, `camelCase` for functions/variables, and keep hook APIs typed (`strict` TypeScript settings are enabled).

## Testing Guidelines

- Framework: Vitest with Testing Library and `jsdom`.
- Place tests next to source files using `*.test.tsx` naming.
- Focus tests on behavior and lifecycle (player init/dispose, rerender behavior, strict mode safety).
- Run `pnpm run test` before opening a PR; there is no explicit coverage threshold, so add tests for every bug fix or API change.

## Commit & Pull Request Guidelines

- Follow existing commit style: short imperative subject, often Conventional Commit prefixes like `fix:`, `ci:`, `doc:`, `chore(deps):`.
- Keep commits scoped and atomic.
- PRs should include:
  - clear summary of behavior changes,
  - linked issue (if applicable),
  - test evidence (`pnpm run test` output),
  - screenshots or recording for demo app UI changes.
