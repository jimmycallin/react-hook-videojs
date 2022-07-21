import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import sample from "./sample.vtt?url";
import VideoJS from '../../react-hook-videojs/src/index';
import videojs from 'video.js';

const initialVideoJsOptions = {
  autoplay: false,
  controls: true,
  muted: false,
  responsive: true,
  aspectRatio: '16:9',
  fluid: true,
  sources: [{
    src: '//vjs.zencdn.net/v/oceans.mp4'
  }]
};

const effectTime = 1500; // in ms

export const App = (props) => {

  const [ src, setSrc ] = useState(initialVideoJsOptions.sources[0].src);
  const [ controls, setControls ] = useState(initialVideoJsOptions.controls);
  const [ autoplay, setAutoplay ] = useState(initialVideoJsOptions.autoplay);
  const [ muted, setMuted ] = useState(false);
  const [ vtt, setVtt ] = useState(false);
  const [ mounted, setMounted ] = useState(true);
  const [ isMount, setIsMount ] = useState(true);

  const playerRef = useRef(null);

  const handleShowControls = (e) => {
    setControls(e.target.checked);
    const player = playerRef.current;
    player && player.controls(e.target.checked);
  }
  const handleAutoplay = (e) => {
    setAutoplay(e.target.checked);
    const player = playerRef.current;
    player && player.autoplay(e.target.checked);
  }

  const handlePlay = (e) => {
    const player = playerRef.current;
    player && player.play();
  }

  const handlePause = (e) => {
    const player = playerRef.current;
    player && player.pause();
  }
  const handleMuted = (e) => {
    setMuted(e.target.checked)
    const player = playerRef.current;
    player && player.muted(e.target.checked);
  }


  const handlePlayerReady = (player) => {
    playerRef.current = player;
    
    // load any set options (on remount)
    if( initialVideoJsOptions.sources[0].src !== src ) {
      playerRef.current.src(src);
    }
    if( initialVideoJsOptions.controls !== controls ) {
      playerRef.current.controls(controls);
    }
    if( initialVideoJsOptions.autoplay !== autoplay ) {
      playerRef.current.autoplay(autoplay);
    }
    if( initialVideoJsOptions.muted !== muted ) {
      playerRef.current.muted(muted);
    }

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
    const player = playerRef.current;
    if( src && player ) {
      timer = setTimeout(() => {
        player.src(src);
      }, 600);
    }
    return () => {
      if( timer ) clearTimeout(timer);
    }
  }, [src])

  // wait for fadeout animation
  useEffect(() => {
    let timer;
    if(mounted) {
      setIsMount(mounted);
    } 
    else {
      timer = setTimeout(() => {
        setIsMount(mounted);
      }, effectTime);
    }
    return () => {
      if( timer ) clearTimeout(timer);
    }
  }, [mounted])

  return(
    <div 
      style={{
        maxWidth: '1100px', 
        width: 'calc(100% - 16px)', 
        minHeight: '400px', 
        background: '#EEE', 
        padding: '8px',
        borderRadius: '8px',
        margin: '8px auto',
    }}>
        <div 
          style={{
            animation: `${mounted ? 'fadeIn': 'fadeOut'} ${Math.round(effectTime/100)/10}s`, 
            width: '100%',
            aspectRatio: "16 / 9",
            display: 'flex', 
            justifyContent: 'center'
          }}
        >
        { isMount &&
          <VideoJS onReady={handlePlayerReady} options={initialVideoJsOptions}>
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
      </div>
      <hr />
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
            // disabled
            type="checkbox"
            checked={controls}
            onChange={handleShowControls}
          />
        </label>
        <label>
          Autoplay&nbsp;
          <input
            type="checkbox"
            checked={autoplay}
            onChange={handleAutoplay}
          />
        </label>
        <label>
          Mute&nbsp;
          <input
            type="checkbox"
            checked={muted}
            onChange={handleMuted}
          />
        </label>
        <label>
          Mounted
          <input
            type="checkbox"
            checked={mounted}
            onChange={(e) => setMounted(e.target.checked)}
          />
        </label>
        <button onClick={handlePlay}>
          Play
        </button>
        <button onClick={handlePause}>
          Pause
        </button>
      </div>
    </div>
  );
}
export default App;
