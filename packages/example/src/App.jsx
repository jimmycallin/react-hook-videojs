import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import sample from "./sample.vtt?url";
import VideoJS from '../../react-hook-videojs/src/index';
import videojs from 'video.js';

const initialVideoJsOptions = {
  autoplay: false,
  controls: true,
  responsive: true,
  fluid: true,
  sources: [{
    src: '//vjs.zencdn.net/v/oceans.mp4'
  }]
};

export const App = (props) => {

  const [ src, setSrc ] = useState(initialVideoJsOptions.sources[0].src);
  const [vtt, setVtt] = useState(false);
  const [isMount, setIsMount] = useState(true);
  const [videoJsOptions, setVideoJsOptions] = useState(initialVideoJsOptions);

  const playerRef = useRef(null);

  const handleShowControls = (e) => {
    setVideoJsOptions({
      ...videoJsOptions,
      controls: !videoJsOptions.controls,
    });
  }
  const handleAutoplay = (e) => {
    setVideoJsOptions({
      ...videoJsOptions,
      autoplay: !videoJsOptions.autoplay,
    })
  }

  const handlePlay = (e) => {
    if(!playerRef.current) return;
    const player = playerRef.current;
    player.log("starting playback");
    player.play();
  }

  const handlePause = (e) => {
    if(!playerRef.current) return;
    const player = playerRef.current;
    player.log("pauzing");
    player.pause();
  }

  const handlePlayerReady = (player) => {
    playerRef.current = player;

    // You can handle player events here, for example:
    player.on('waiting', () => {
      videojs.log('player is waiting');
    });

    player.on('dispose', () => {
      videojs.log('player will dispose');
    });
  };

  // debounce for setting videosource
  useEffect(() => {
    let timer;
    if( src ) {
      timer = setTimeout(() => {
        setVideoJsOptions({
          ...videoJsOptions,
          sources: [{src: src}],
        })
      }, 600);
    }

    return () => {
      if( timer ) clearTimeout(timer);
    }
    
  }, [src])

  return(
    <div style={{maxWidth: '1200px', width: '100%', minHeight: '400px', background: '#EEE', padding: '8px', margin: '0 auto'}}>
      {isMount &&
        <VideoJS onReady={handlePlayerReady} options={videoJsOptions}>
          {vtt ? (
            <track
              kind="captions"
              src={sample}
              srcLang="en"
              label="English"
              default
            />
          ) : null}
        </VideoJS>
      }
      <div style={{ display: "flex", flexDirection: "column", margin: "20px" }}>
        <label>
          Video source&nbsp;
          <input
            style={{ width: "300px" }}
            type="text"
            value={src}
            onChange={e => setSrc(e.target.value)}
          />
        </label>
        <label>
          VTT&nbsp;
          <input
            type="checkbox"
            checked={vtt}
            onChange={(e) => setVtt(e.target.checked)}
          />
        </label>
        <label>
          Show controls&nbsp;
          <input
            disabled
            type="checkbox"
            checked={videoJsOptions.controls}
            onChange={handleShowControls}
          />
          &nbsp;(Does not seem to work yett...)
        </label>
        <label>
          Autoplay&nbsp;
          <input
            type="checkbox"
            checked={videoJsOptions.autoplay}
            onChange={handleAutoplay}
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
        <button onClick={handlePlay} style={{margin: '4px', height: '2em'}}>
          Play
        </button>
        <button onClick={handlePause} style={{margin: '4px', height: '2em'}}>
          Pause
        </button>
      </div>
    </div>
  );
}
export default App;
