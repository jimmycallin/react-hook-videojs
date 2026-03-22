# react-hook-videojs

A React hook for integrating Video.js with React.

## Installation

```bash
npm install react-hook-videojs video.js
# or
pnpm add react-hook-videojs video.js
```

## Quick start

```tsx
import React, { useMemo } from "react";
import "video.js/dist/video-js.css";
import { useVideoJS } from "react-hook-videojs";

export function Player({ src }: { src: string }) {
  const options = useMemo(() => ({ sources: [{ src }] }), [src]);
  const { Video } = useVideoJS(options);

  return <Video />;
}
```

## API

`useVideoJS(videoJsOptions, classNames?)` returns:

- `Video`: component you render
- `ready`: `boolean`
- `player`: Video.js player instance or `null`

`videoJsOptions` must be memoized (for example with `useMemo`) to avoid unnecessary reinitialization.

## Docs and examples

- Full documentation: https://github.com/jimmycallin/react-hook-videojs#readme
- Live example: https://jimmycallin.github.io/react-hook-videojs/
- Issues: https://github.com/jimmycallin/react-hook-videojs/issues

## License

MIT
