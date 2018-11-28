# react-hook-videojs

Due to how video.js mutates the DOM, integrating video.js with React can be a bit tricky. Especially if you want to support video.js component updates and correctly dispose of any old player.

React Hooks helps us package this quite nicely, and all you have to do to use this package is:

```
import React from "react";
import useVideoJS from "react-hook-videojs";

const App = () => {
  const videoUrl = "http://techslides.com/demos/sample-videos/small.mp4";
  const Player = useVideoJS({ sources: [{ src: videoUrl }] });
  return (
    <div className="App">
      <Player />
    </div>
  );
};
```

`useVideoJS` takes a single options argument, and passes it without modifications to video.js. See their [options reference](https://docs.videojs.com/tutorial-options.html) for further information.

Many thanks to Dan Abramov for helping me figure out some issues related to `useLayoutEffect` and video.js DOM manipulation.