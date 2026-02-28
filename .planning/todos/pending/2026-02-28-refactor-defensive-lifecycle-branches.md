---
created: 2026-02-28T23:11:39.998Z
title: Refactor defensive lifecycle branches
area: general
files:
  - packages/react-hook-videojs/src/index.tsx:72
  - packages/react-hook-videojs/src/index.tsx:87
  - packages/react-hook-videojs/src/index.tsx:97
  - packages/react-hook-videojs/src/index.test.tsx
---

## Problem

The hook currently keeps several defensive lifecycle branches around stale refs and cleanup safety in `VideoJsWrapper`.
These branches are difficult to trigger deterministically in browser-mode tests, which makes coverage targets harder to enforce and leaves uncertainty about whether we should preserve or simplify this logic.

## Solution

Evaluate a stricter lifecycle refactor that removes the defensive branches and relies on clearer invariants.
If we proceed, add stress tests for strict mode, rapid rerenders, and mount/unmount churn to verify behavior does not regress.
