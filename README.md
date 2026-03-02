# react-hook-videojs

> A React hook for integrating Video.js with React 19.
> It handles player setup, disposal, Strict Mode behavior, and options-driven reinitialization with a small, predictable API.

[![NPM](https://img.shields.io/npm/v/react-hook-videojs.svg)](https://www.npmjs.com/package/react-hook-videojs)

Live example: [https://jimmycallin.github.io/react-hook-videojs/](https://jimmycallin.github.io/react-hook-videojs/)

PR preview (for open PRs): `https://jimmycallin.github.io/react-hook-videojs/pr-<PR_NUMBER>/`

## Quick links

- [Installation](#installation)
- [Quick start](#quick-start)
- [API reference](#api-reference)
- [Recipes](#recipes)
- [Troubleshooting](#troubleshooting)

## Why this hook

- React-first Video.js lifecycle management (mount/init, unmount/dispose)
- Strict Mode-safe behavior in React 19 development
- Predictable reinitialization when options change
- Native `<video>` props, children, and `ref` forwarding
- Minimal API: `const { Video, ready, player } = useVideoJS(...)`

---

## Installation

```bash
npm install react-hook-videojs video.js
# or
pnpm add react-hook-videojs video.js
```

**Peer requirements:** React ≥ 19, Video.js 7 or 8.

---

## Quick start

```tsx
import React, { useMemo } from "react";
import "video.js/dist/video-js.css";
import { useVideoJS } from "react-hook-videojs";

const MyPlayer = () => {
  // Always memoize options so the player only reinitializes when values change.
  const options = useMemo(
    () => ({ sources: [{ src: "https://example.com/video.mp4" }] }),
    [],
  );

  const { Video, ready, player } = useVideoJS(options);

  return <Video />;
};
```

`useVideoJS` returns three values:

| Return value | Type                    | Description                                                          |
| ------------ | ----------------------- | -------------------------------------------------------------------- |
| `Video`      | `VideoComponent`        | React component to render. Accepts all `<video>` props and children. |
| `ready`      | `boolean`               | `true` once the player has fired its `"ready"` event.                |
| `player`     | `VideoJsPlayer \| null` | The Video.js player instance when ready, `null` otherwise.           |

---

## API reference

### `useVideoJS(videoJsOptions, classNames?)`

```ts
import { useVideoJS } from "react-hook-videojs";

const { Video, ready, player } = useVideoJS(
  videoJsOptions, // VideoJsPlayerOptions — must be memoized
  classNames, // optional string — extra CSS classes on the <video> element
);
```

**`videoJsOptions`** is passed directly to Video.js — see the [Video.js options reference](https://videojs.com/guides/options) for all available properties.

**Important:** wrap `videoJsOptions` in `React.useMemo` (or define it outside the component).
The hook deep-clones options and reinitializes when the options object changes;
passing a fresh object on every render recreates the player every render.

---

## Recipes

These patterns cover the most common integrations.

### Accessing player events

Use a `useEffect` that depends on the `player` value. The effect runs when the player becomes available and the cleanup function runs when it is disposed.

```tsx
import React, { useEffect, useMemo } from "react";
import { useVideoJS } from "react-hook-videojs";

const MyPlayer = ({ src }: { src: string }) => {
  const options = useMemo(() => ({ sources: [{ src }] }), [src]);
  const { Video, player } = useVideoJS(options);

  useEffect(() => {
    if (!player) return;

    const onPlay = () => console.log("playing");
    const onPause = () => console.log("paused");
    const onEnded = () => console.log("ended");
    const onTimeUpdate = () => console.log("currentTime", player.currentTime());

    player.on("play", onPlay);
    player.on("pause", onPause);
    player.on("ended", onEnded);
    player.on("timeupdate", onTimeUpdate);

    return () => {
      if (!player.isDisposed()) {
        player.off("play", onPlay);
        player.off("pause", onPause);
        player.off("ended", onEnded);
        player.off("timeupdate", onTimeUpdate);
      }
    };
  }, [player]);

  return <Video />;
};
```

### Calling player methods imperatively

Use `player` for direct Video.js API calls.

```tsx
const { Video, ready, player } = useVideoJS(options);

const handlePlayPause = () => {
  if (!player) return;
  if (player.paused()) {
    player.play();
  } else {
    player.pause();
  }
};

const handleSeek = (seconds: number) => {
  player?.currentTime(seconds);
};

const handleVolume = (level: number) => {
  player?.volume(level); // 0.0 – 1.0
};

const handleRate = (rate: number) => {
  player?.playbackRate(rate); // e.g. 0.5, 1, 1.5, 2
};
```

### Text tracks (captions / subtitles)

Pass a `<track>` element as a child of `<Video>`:

```tsx
const { Video } = useVideoJS(options);

return (
  <Video>
    <track
      kind="captions"
      src="https://example.com/captions-en.vtt"
      srcLang="en"
      label="English"
      default
    />
    <track
      kind="subtitles"
      src="https://example.com/subtitles-fr.vtt"
      srcLang="fr"
      label="Français"
    />
  </Video>
);
```

### Native `<video>` attributes

`Video` forwards all standard `<video>` element attributes:

```tsx
<Video muted autoPlay playsInline className="my-player" data-testid="video" />
```

### Forwarding a ref to the `<video>` element

```tsx
import React, { useRef } from "react";

const MyPlayer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { Video } = useVideoJS(options);

  return <Video ref={videoRef} />;
};
```

### Switching sources

Update `sources` in options to trigger automatic reinitialization.

```tsx
const [src, setSrc] = useState("https://example.com/video-1.mp4");

const options = useMemo(() => ({ sources: [{ src }] }), [src]);
const { Video } = useVideoJS(options);

return (
  <>
    <Video />
    <button onClick={() => setSrc("https://example.com/video-2.mp4")}>
      Switch source
    </button>
  </>
);
```

### Playback rate menu

Pass `playbackRates` in options to add a playback speed menu to the Video.js control bar:

```tsx
const options = useMemo(
  () => ({
    sources: [{ src }],
    controls: true,
    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
  }),
  [src],
);
```

### Mount / unmount

Conditionally render `<Video>` to mount and unmount the player.
The player is disposed on unmount and reinitialized on remount.

```tsx
const [visible, setVisible] = useState(true);
const { Video } = useVideoJS(options);

return (
  <>
    {visible && <Video />}
    <button onClick={() => setVisible((v) => !v)}>Toggle player</button>
  </>
);
```

### Poster image

```tsx
const options = useMemo(
  () => ({
    sources: [{ src }],
    poster: "https://example.com/poster.jpg",
  }),
  [src],
);
```

### React Strict Mode

The hook is designed for React 19 Strict Mode, where components mount/unmount
twice in development. It handles this lifecycle without leaking player instances.

### Server-side rendering (RSC / Next.js)

`useVideoJS` uses DOM APIs and browser-only Video.js internals. It cannot run
on the server. In a React Server Components environment, mark any component
that uses this hook with the `"use client"` directive:

```tsx
"use client";

import { useVideoJS } from "react-hook-videojs";

export function MyPlayer({ src }: { src: string }) {
  const options = useMemo(() => ({ sources: [{ src }] }), [src]);
  const { Video } = useVideoJS(options);
  return <Video />;
}
```

---

## Run the example app

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173). The example demonstrates:

- Multiple video sources with live switching
- VTT caption track via `<track>` child element
- Controls, autoplay, loop, muted, and poster options
- Mount/unmount lifecycle
- Imperative play/pause, seek, volume, and playback speed controls
- Live player state display (`ready`, `player`, `currentTime`, `duration`, …)
- Full event log (`play`, `pause`, `ended`, `timeupdate`, `error`, …)

### Run the React × Video.js compatibility matrix

```bash
pnpm run test:matrix:local
```

Runs the repository's local compatibility matrix script in a temporary worktree.

---

## Troubleshooting

### Player keeps reinitializing

`videoJsOptions` is probably recreated each render. Memoize it with `useMemo`.

### SSR / RSC error (`window` / DOM access)

`useVideoJS` is client-only. In Next.js / RSC, move it into a client component
and add the `"use client"` directive.

### Video.js styles look missing

Import Video.js CSS once in your app:

```tsx
import "video.js/dist/video-js.css";
```

---

## License

MIT © [jimmycallin](https://github.com/jimmycallin)
