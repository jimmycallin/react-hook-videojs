# Working Document — react-hook-videojs

This file captures in-progress work and can be deleted once complete.

---

## Repo quick-reference

| What           | Where                                                        |
| -------------- | ------------------------------------------------------------ |
| Library source | `packages/react-hook-videojs/src/index.tsx`                  |
| Tests          | `packages/react-hook-videojs/src/index.test.tsx`             |
| vitest config  | `vitest.config.ts` (root)                                    |
| Example app    | `packages/example/src/App.jsx` + `App.css`                   |
| Run unit tests | `pnpm run test:unit`                                         |
| Run linter     | `pnpm run test:lint`                                         |
| Run all checks | `pnpm run test` (skips oxfmt — pre-existing YAML CI failure) |

**Critical lint rules** (oxlint + react-hooks-js plugin):

- `react-hooks-js/set-state-in-effect: error` — no bare setState calls at the top level of a useEffect body; they must be inside callbacks
- `react-hooks-js/exhaustive-deps: error` — strict deps enforcement
- `100% code coverage` required on the library (`vitest.config.ts` has thresholds)

---

## Task list

1. **[CURRENT] Firefox + WebKit testing** — replace `createFixtureVideoUrl()` with a static MP4, add `firefox` + `webkit` to vitest instances
2. **`<video>` attribute + child element tests** — test that props and `<track>` children pass through correctly
3. **Dynamic updates** — avoid full player dispose/reinit for commonly-changed options

---

## Task 1 — Firefox + WebKit testing (CURRENT)

### The problem

`createFixtureVideoUrl()` records a WebM video with `MediaRecorder`. WebKit (Safari engine) does not support WebM `MediaRecorder`, so all 12+ fixture-dependent tests would fail on WebKit.

### The fix

Replace the dynamic fixture with a committed tiny static MP4. MP4/H.264 plays in all three browsers.

### Step 1 — generate the fixture files

Playwright's bundled ffmpeg is at:

```
/Users/jimmy/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac
```

Run this once and commit the output files:

```bash
FFMPEG=/Users/jimmy/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac

# Primary fixture (used in all single-source tests)
$FFMPEG -f lavfi -i color=black:size=2x2:rate=15 \
  -t 1 -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  -y packages/react-hook-videojs/src/fixture.mp4

# Second fixture (used in source-switching tests that need two distinct URLs)
$FFMPEG -f lavfi -i color=white:size=2x2:rate=15 \
  -t 1 -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  -y packages/react-hook-videojs/src/fixture2.mp4
```

### Step 2 — update vitest.config.ts

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  optimizeDeps: {
    include: ["react/jsx-dev-runtime"],
  },
  test: {
    include: ["packages/react-hook-videojs/src/**/*.test.ts?(x)"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [
        { browser: "chromium" },
        { browser: "firefox" },
        { browser: "webkit" },
      ],
      api: {
        host: "127.0.0.1",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/react-hook-videojs/src/**/*.ts?(x)"],
      exclude: ["packages/react-hook-videojs/src/**/*.test.ts?(x)"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
```

### Step 3 — rewrite the test file top section

Replace the entire `createFixtureVideoUrl` block with static imports:

```ts
// DELETE all of this:
//   const createdObjectUrls: string[] = [];
//   const createFixtureVideoUrl = async (): Promise<string> => { ... };
//   afterEach cleanup of createdObjectUrls

// ADD these imports at the top of the file:
import fixtureUrl from "./fixture.mp4?url";
import fixture2Url from "./fixture2.mp4?url";
```

The `afterEach` should keep only `cleanup()` — remove the `createdObjectUrls` revoke loop.

### Step 4 — update every test

Replace every `await createFixtureVideoUrl()` call and every `type: "video/webm"` annotation.

**Single-source tests** (use `fixtureUrl`):

```ts
// BEFORE:
const source = await createFixtureVideoUrl();
options={{ sources: [{ src: source, type: "video/webm" }] }}

// AFTER:
options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
```

**Two-source tests** (use `fixtureUrl` + `fixture2Url`):

```ts
// BEFORE:
const firstSource = await createFixtureVideoUrl();
const secondSource = await createFixtureVideoUrl();

// AFTER:
// firstSource  → fixtureUrl
// secondSource → fixture2Url
```

**Source-contains assertion** — the blob-URL check needs updating:

```ts
// BEFORE:
expect(currentSource).toContain("blob:");

// AFTER (static file served by Vite dev server, URL contains the filename):
expect(currentSource).toContain("fixture");
// OR just check it's non-empty:
expect(currentSource).not.toBe("");
```

Specifically for the test `"reinitializes player and swaps the media source when options change"`:

```ts
// BEFORE:
expect(currentSource).toContain(firstSource); // blob URL identity check
// AFTER:
expect(currentSource).toContain("fixture.mp4"); // first fixture
// ...
expect(currentSource).toContain("fixture2.mp4"); // second fixture
```

### Step 5 — check if vitest needs assetsInclude

Vitest's browser mode uses Vite under the hood. `.mp4?url` imports may need explicit asset handling. If the import fails, add to `vitest.config.ts`:

```ts
export default defineConfig({
  assetsInclude: ["**/*.mp4"], // ADD THIS if ?url imports don't resolve
  // ...rest unchanged
});
```

### Step 6 — run tests and fix failures

```bash
pnpm run test:unit
```

Expected: all 25 tests pass on chromium. Then on firefox and webkit once those pass on chromium.

**Likely webkit issue**: The `autoplay starts playback` test asserts `videoElement.paused === false`. WebKit in headless mode may block autoplay even when `muted: true`. If so, wrap that assertion loosely or add `playsInline` to the muted autoplay harness.

---

## Task 2 — `<video>` attribute + child element tests

Add these tests to `index.test.tsx`. They are synchronous (no fixture needed) and will run on all three browsers.

### `<video>` attribute forwarding

```tsx
test("forwards html attributes to the video element", () => {
  const AttrHarness = (): React.JSX.Element => {
    const { Video } = useVideoJS({ sources: [] });
    return <Video data-testid="my-video" aria-label="test player" />;
  };
  const { container } = render(<AttrHarness />);
  const video = container.querySelector("video");
  expect(video?.getAttribute("data-testid")).toBe("my-video");
  expect(video?.getAttribute("aria-label")).toBe("test player");
});

test("forwards playsInline to the video element", () => {
  const AttrHarness = (): React.JSX.Element => {
    const { Video } = useVideoJS({ sources: [] });
    return <Video playsInline />;
  };
  const { container } = render(<AttrHarness />);
  expect(container.querySelector("video")?.hasAttribute("playsinline")).toBe(
    true,
  );
});

test("merges hook classNames with Video className prop", () => {
  const AttrHarness = (): React.JSX.Element => {
    const { Video } = useVideoJS({ sources: [] }, "hook-class");
    return <Video className="user-class" />;
  };
  const { container } = render(<AttrHarness />);
  const video = container.querySelector("video");
  expect(video?.classList.contains("video-js")).toBe(true);
  expect(video?.classList.contains("hook-class")).toBe(true);
  expect(video?.classList.contains("user-class")).toBe(true);
});
```

### Child element forwarding

```tsx
test("renders track children inside the video element", () => {
  const TrackHarness = (): React.JSX.Element => {
    const { Video } = useVideoJS({ sources: [] });
    return (
      <Video>
        <track
          kind="captions"
          src="/captions.vtt"
          srcLang="en"
          label="English"
        />
        <track kind="subtitles" src="/subs.vtt" srcLang="fr" label="French" />
      </Video>
    );
  };
  const { container } = render(<TrackHarness />);
  const tracks = container.querySelectorAll("track");
  expect(tracks).toHaveLength(2);
  expect(tracks[0].getAttribute("kind")).toBe("captions");
  expect(tracks[0].getAttribute("srclang")).toBe("en");
  expect(tracks[1].getAttribute("kind")).toBe("subtitles");
  expect(tracks[1].getAttribute("srclang")).toBe("fr");
});
```

---

## Task 3 — Dynamic updates (no reinit for hot options)

### The core problem

React's effect cleanup always runs _before_ the new effect body. So the pattern:

```
videoJsOptionsCloned changes
→ previous cleanup disposes the player
→ new effect body runs — player is null
→ must do full reinit
```

There is no way to "intercept" the cleanup mid-flight. The solution is **two separate effects** with different dependencies.

### Architecture

**Effect 1** (`deps: [videoJsOptionsCloned, playerRef]`):

- Always updates `prevOptionsRef.current` to the latest options
- If no live player exists: returns (init effect handles it)
- If options are the same reference (Strict Mode re-run): returns
- Computes the diff between previous and new options
- If all changed keys are in `DYNAMIC_UPDATERS`: applies them imperatively, no reinit
- Otherwise: increments `initId` state to trigger Effect 2

**Effect 2** (`deps: [initId, onReady, onDispose, playerRef, videoRef]`):

- Full player init/dispose lifecycle (current code, largely unchanged)
- Reads options from `prevOptionsRef.current` — always current by the time this runs because Effect 1 always runs first (declared first in the component)

### Key insight on React effect ordering

Within a single component, effects run in **declaration order**. So if Effect 1 is declared before Effect 2:

- Effect 1 cleanup → Effect 2 cleanup → Effect 1 body → Effect 2 body

When `videoJsOptionsCloned` changes but `initId` does NOT change yet:

1. Effect 1 cleanup: no-op (no cleanup returned)
2. Effect 2 cleanup: does NOT run (initId unchanged)
3. Effect 1 body: detects dynamic-only change → applies updates → does NOT call setInitId
4. Effect 2 body: does NOT run ✓

When `videoJsOptionsCloned` changes and requires reinit:

1. Effect 1 cleanup: no-op
2. Effect 2 cleanup: does NOT run yet (initId not changed yet)
3. Effect 1 body: calls `setInitId(id => id + 1)` — React schedules re-render
4. React re-renders, `initId` incremented
5. Effect 2 cleanup: runs → disposes old player
6. Effect 2 body: runs → inits new player with `prevOptionsRef.current` ✓

### Lint issue

`react-hooks-js/set-state-in-effect: error` will flag `setInitId(...)` in Effect 1's body. This is a legitimate architectural use of state to coordinate effects. Suppress with:

```ts
// eslint-disable-next-line react-hooks-js/set-state-in-effect
setInitId((id) => id + 1);
```

### New helpers to add to `index.tsx`

Add **before** `VideoJsWrapper`, and export via `__private__`:

```ts
/**
 * Options that can be applied to a live Video.js player without reinitializing it.
 * Options not listed here trigger a full dispose + reinitialize when they change.
 */
const DYNAMIC_UPDATERS: Partial<
  Record<string, (player: VideoJsPlayer, value: unknown) => void>
> = {
  sources: (p, v) => {
    p.src(v as VideoJsPlayerOptions["sources"]);
  },
  volume: (p, v) => {
    p.volume(v as number);
  },
  muted: (p, v) => {
    p.muted(v as boolean);
  },
  playbackRate: (p, v) => {
    p.playbackRate(v as number);
  },
  defaultPlaybackRate: (p, v) => {
    p.defaultPlaybackRate(v as number);
  },
  playbackRates: (p, v) => {
    p.playbackRates(v as number[]);
  },
  poster: (p, v) => {
    p.poster(v as string);
  },
  controls: (p, v) => {
    p.controls(v as boolean);
  },
  loop: (p, v) => {
    p.loop(v as boolean);
  },
  width: (p, v) => {
    p.width(v as number);
  },
  height: (p, v) => {
    p.height(v as number);
  },
  fluid: (p, v) => {
    p.fluid(v as boolean);
  },
  fill: (p, v) => {
    p.fill(v as boolean);
  },
};

/**
 * Returns [key, newValue] pairs for options that differ between prev and next.
 * Uses JSON serialization for deep value comparison.
 */
const getChangedEntries = (
  prev: VideoJsPlayerOptions,
  next: VideoJsPlayerOptions,
): [string, unknown][] => {
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: [string, unknown][] = [];
  for (const key of allKeys) {
    const k = key as keyof VideoJsPlayerOptions;
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) {
      changed.push([key, next[k]]);
    }
  }
  return changed;
};
```

### Rewritten `VideoJsWrapper`

Replace the existing single `useEffect` in `VideoJsWrapper` with:

```tsx
const VideoJsWrapper = ({
  children,
  videoJsOptions,
  onReady,
  onDispose,
  classNames,
  playerRef,
  ref: videoRef,
  className,
  ...props
}: VideoJsWrapperProps): React.JSX.Element => {
  const videoJsOptionsCloned = useMemo(
    () => cloneDeep(videoJsOptions),
    [videoJsOptions],
  );
  const videoNode = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevOptionsRef = useRef<VideoJsPlayerOptions>(videoJsOptionsCloned);
  const [initId, setInitId] = useState(0);

  // Effect 1: Detect option changes. Apply dynamically when possible, or trigger reinit.
  // Declared before Effect 2 so React runs it first, ensuring prevOptionsRef is always
  // current by the time Effect 2 reads it.
  useEffect(() => {
    const prevOptions = prevOptionsRef.current;
    prevOptionsRef.current = videoJsOptionsCloned;

    const player = playerRef.current;
    if (!player || player.isDisposed()) return;

    // Same reference = Strict Mode double-invoke or no actual change
    if (prevOptions === videoJsOptionsCloned) return;

    const changed = getChangedEntries(prevOptions, videoJsOptionsCloned);
    if (changed.length === 0) return;

    if (changed.every(([key]) => key in DYNAMIC_UPDATERS)) {
      for (const [key, value] of changed) {
        DYNAMIC_UPDATERS[key]?.(player, value);
      }
    } else {
      // eslint-disable-next-line react-hooks-js/set-state-in-effect
      setInitId((id) => id + 1);
    }
  }, [videoJsOptionsCloned, playerRef]);

  // Effect 2: Initialize (or reinitialize) the player.
  // Reruns on mount and when initId increments. Always reads the latest options
  // from prevOptionsRef.current, which Effect 1 keeps up to date.
  useEffect(() => {
    const containerNode = containerRef.current as HTMLDivElement;

    const currentVideoNode = getCurrentVideoNode(containerNode, videoNode);

    if (!currentVideoNode || !currentVideoNode.isConnected) return;

    if (videoNode.current !== currentVideoNode) {
      setVideoNodeRef(videoNode, videoRef, currentVideoNode);
    }

    const originalVideoNode = currentVideoNode.cloneNode(
      true,
    ) as HTMLVideoElement;

    let disposed = false;

    const initializedPlayer = videojs(
      currentVideoNode,
      cloneDeep(prevOptionsRef.current),
    );
    playerRef.current = initializedPlayer;
    initializedPlayer.ready(() => {
      callOnReadyForCurrentPlayer(
        disposed,
        playerRef,
        initializedPlayer,
        onReady,
      );
    });

    return (): void => {
      disposed = true;
      initializedPlayer.dispose();
      playerRef.current = null;

      restoreDisposedVideoNode(
        containerNode,
        originalVideoNode,
        videoNode,
        videoRef,
      );

      onDispose();
    };
  }, [initId, onReady, onDispose, playerRef, videoRef]);

  return (
    <div ref={containerRef}>
      <video
        ref={(value) => {
          setVideoNodeRef(videoNode, videoRef, value);
        }}
        className={getVideoClassName(classNames, className)}
        {...props}
      >
        {children}
      </video>
    </div>
  );
};
```

### Update `__private__` export

```ts
export const __private__ = {
  setVideoNodeRef,
  getVideoClassName,
  restoreDisposedVideoNode,
  shouldSkipReadyCallback,
  callOnReadyForCurrentPlayer,
  getCurrentVideoNode,
  getChangedEntries, // new
  DYNAMIC_UPDATERS, // new
};
```

### New tests for dynamic updates

These go in `index.test.tsx`. After Task 1 is done, use `fixtureUrl` / `fixture2Url` instead of `createFixtureVideoUrl()`.

```tsx
// Unit test for getChangedEntries
test("getChangedEntries returns changed keys and new values", () => {
  const prev = { sources: [{ src: "a.mp4" }], controls: true, muted: false };
  const next = { sources: [{ src: "b.mp4" }], controls: true, muted: true };
  const changed = __private__.getChangedEntries(prev, next);
  expect(changed).toHaveLength(2);
  expect(changed.find(([k]) => k === "sources")?.[1]).toEqual([
    { src: "b.mp4" },
  ]);
  expect(changed.find(([k]) => k === "muted")?.[1]).toBe(true);
});

test("getChangedEntries returns empty array when options are identical", () => {
  const opts = { sources: [{ src: "a.mp4" }], controls: true };
  expect(__private__.getChangedEntries(opts, opts)).toHaveLength(0);
});

// Integration tests (async, use fixture files)
test("applies source changes dynamically without reinitializing the player", async () => {
  const playerInstances = new Set<unknown>();

  const DynamicSrcHarness = ({ src }: { src: string }): React.JSX.Element => {
    const options = useMemo(
      () => ({ sources: [{ src, type: "video/mp4" }] }),
      [src],
    );
    const { Video, player } = useVideoJS(options);
    if (player) playerInstances.add(player);
    return <Video />;
  };

  const { rerender } = render(<DynamicSrcHarness src={fixtureUrl} />);
  await waitFor(() => expect(playerInstances.size).toBe(1));

  rerender(<DynamicSrcHarness src={fixture2Url} />);

  await waitFor(() => {
    const video = document.querySelector("video");
    const src = video?.currentSrc || video?.src || "";
    expect(src).toContain("fixture2");
  });

  // Player instance was reused — no reinit
  expect(playerInstances.size).toBe(1);
});

test("reinitializes player when non-dynamic options change", async () => {
  const playerInstances = new Set<unknown>();

  const TechHarness = ({
    techOrder,
  }: {
    techOrder: string[];
  }): React.JSX.Element => {
    const options = useMemo(
      () => ({
        sources: [{ src: fixtureUrl, type: "video/mp4" }],
        techOrder,
      }),
      [techOrder],
    );
    const { Video, player } = useVideoJS(options);
    if (player) playerInstances.add(player);
    return <Video />;
  };

  const { rerender } = render(<TechHarness techOrder={["html5"]} />);
  await waitFor(() => expect(playerInstances.size).toBe(1));

  rerender(<TechHarness techOrder={["html5", "flash"]} />);
  await waitFor(() => expect(playerInstances.size).toBe(2));
});

test("applies multiple dynamic option changes without reinitializing", async () => {
  const playerInstances = new Set<unknown>();

  const MultiHarness = ({
    controls,
    loop,
  }: {
    controls: boolean;
    loop: boolean;
  }): React.JSX.Element => {
    const options = useMemo(
      () => ({
        sources: [{ src: fixtureUrl, type: "video/mp4" }],
        controls,
        loop,
      }),
      [controls, loop],
    );
    const { Video, player } = useVideoJS(options);
    if (player) playerInstances.add(player);
    return <Video />;
  };

  const { rerender } = render(<MultiHarness controls={true} loop={false} />);
  await waitFor(() => expect(playerInstances.size).toBe(1));

  rerender(<MultiHarness controls={false} loop={true} />);

  // Wait a tick to ensure no reinit happens
  await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
  expect(playerInstances.size).toBe(1);
});
```

### 100% coverage note

Every branch in the new code must be exercised:

- `getChangedEntries`: equal options → empty result; differing options → entries returned
- `DYNAMIC_UPDATERS`: at least one key exercised (sources test covers it)
- Effect 1 early-returns: `!player` branch (mount), `prevOptions === cloned` branch (Strict Mode)
- Dynamic path: sources-only change test
- Reinit path: techOrder change test

The `!player || player.isDisposed()` branch in Effect 1 is hit on the very first render (before the init effect has run). This is covered by any test that renders the component.

---

## Current file state (after previous session's work)

All tests pass (25/25 on chromium), linter passes. Changes already committed on `improvements` branch:

- `packages/react-hook-videojs/src/index.tsx` — JSDoc added to public exports
- `packages/example/src/App.jsx` — comprehensive demo (source switching, events, imperative controls, etc.)
- `packages/example/src/App.css` — dark single-screen layout
- `README.md` — full API reference + recipes

No changes yet to:

- `vitest.config.ts`
- `packages/react-hook-videojs/src/index.test.tsx`
- `packages/react-hook-videojs/src/index.tsx` (library logic unchanged)
