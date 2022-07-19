import React, { useState } from "react";
import "./App.css";
import sample from "./sample.vtt?url";
import "video.js/dist/video-js.css";
import { useVideoJS } from "../../src/index";

const App = () => {
  const [source, setSource] = useState("//vjs.zencdn.net/v/oceans.mp4");
  const [vtt, setVtt] = useState(true);
  const [controls, setControls] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [isMount, setIsMount] = useState(true);

  const videoJsOptions = {
    sources: [{ src: source }],
    controls,
    autoplay,
  };
  const className = "my-class";
  const { Video, ready, player } = useVideoJS(videoJsOptions, className);
  console.log({ Video, ready, player });
  return (
    <>
      {isMount && (
        <Video>
          {vtt ? (
            <track
              kind="captions"
              src={sample}
              srcLang="en"
              label="English"
              default
            />
          ) : null}
        </Video>
      )}
      <div style={{ display: "flex", flexDirection: "column", margin: "20px" }}>
        <label>
          Video source
          <input
            style={{ width: "300px" }}
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <label>
          VTT
          <input
            type="checkbox"
            checked={vtt}
            onChange={(e) => setVtt(e.target.checked)}
          />
        </label>
        <label>
          Show controls
          <input
            type="checkbox"
            checked={controls}
            onChange={(e) => setControls(e.target.checked)}
          />
        </label>
        <label>
          Autoplay
          <input
            type="checkbox"
            checked={autoplay}
            onChange={(e) => setAutoplay(e.target.checked)}
          />
        </label>
        <label>
          Mounted
          <input
            type="checkbox"
            checked={isMount}
            onChange={() => setIsMount((m) => !m)}
          />
        </label>
      </div>
    </>
  );
};

export default App;
