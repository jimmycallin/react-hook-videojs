# react-hook-videojs

> A simple react hook to easily integrate video.js with React

[![NPM](https://img.shields.io/npm/v/react-hook-videojs.svg)](https://www.npmjs.com/package/react-hook-videojs)

# react-hook-videojs

Due to how video.js mutates the DOM, integrating video.js with React can be a bit tricky. Especially if you want to support video.js component updates and correctly dispose of any old player.

React Hooks helps us package this quite nicely, and all you have to do to use this package is:

```javascript
import React from "react";
import "video.js/dist/video-js.css";
import { useVideoJS } from "react-hook-videojs";

const App = () => {
  const videoUrl = "http://techslides.com/demos/sample-videos/small.mp4";
  const className = "my-class";
  const { Video, player, ready } = useVideoJS(
    { sources: [{ src: videoUrl }] },
    className // optional
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
You may also provide an optional second string argument that will be appended as class name on the `video` DOM node.

See their [options reference](https://docs.videojs.com/tutorial-options.html) for further information on the options argument.
