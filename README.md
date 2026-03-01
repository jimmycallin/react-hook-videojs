# react-hook-videojs

> A simple react hook to easily integrate video.js with React. Supports React 18/19 (including Strict Mode) and Video.js 7/8.

[![NPM](https://img.shields.io/npm/v/react-hook-videojs.svg)](https://www.npmjs.com/package/react-hook-videojs)

# react-hook-videojs

Due to how video.js mutates the DOM, integrating video.js with React can be a quite tricky. Especially if you want to support video.js component updates and correctly dispose of any old player.

React Hooks helps us package this quite nicely, and all you have to do to use this package is:

```jsx
import React from "react";
import "video.js/dist/video-js.css";
import { useVideoJS } from "react-hook-videojs";

const App = () => {
  const videoUrl = "http://techslides.com/demos/sample-videos/small.mp4";
  const videoJsOptions = React.useMemo(
    () => ({ sources: [{ src: videoUrl }] }),
    [videoUrl],
  );
  const className = "my-class";
  const { Video, player, ready } = useVideoJS(
    videoJsOptions,
    className, // optional
  );
  if (ready) {
    // Do something with the video.js player object.
  }
  return (
    <div className="App">
      <Video />
    </div>
  );
};
```

`useVideoJS` takes an options argument, and passes it without modifications to video.js.
Pass a memoized options object (for example with `React.useMemo`) so the player only reinitializes when options values actually change.
Use standard ESM imports (`import { useVideoJS } from "react-hook-videojs"`).
You may also provide an optional second string argument that will be appended as class name on the `video` DOM node.

See their [options reference](https://videojs.com/guides/options) for further information on the options argument.

### Using with Tracks or other child components

This hook supports using features such as [tracks](https://docs.videojs.com/tutorial-tracks.html#text-tracks), and other child components of the `<video>` element.

Example of using a text track:

```jsx
const App = () => {
  // ...setup code from above

  return (
    <Video>
      <track
        kind="captions"
        src="//example.com/path/to/captions.vtt"
        srcLang="en"
        label="English"
        default
      />
    </Video>
  );
};
```

### Support for all `<video>` element attributes

This hook supports all attributes for the native `<video>` element directly on the `<Video>` component.

```jsx
const App = () => {
  return <Video muted autopictureinpicture />;
};
```

### Run compatibility matrix locally

To run the same React/Video.js compatibility checks locally (React 18/19 × Video.js 7/8):

```bash
pnpm run test:matrix:local
```

This command runs in a temporary git worktree, so your current working tree stays unchanged.
