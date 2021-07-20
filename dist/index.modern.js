import React, { useRef, useState, useEffect, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const useVideoJS = videoJsOptions => {
  const videoNode = useRef(null);
  const [ready, setReady] = useState(false);
  const changedKey = JSON.stringify(videoJsOptions);
  const player = useRef(null);
  useEffect(() => {
    player.current = videojs(videoNode.current, videoJsOptions);
    player.current.ready(() => {
      setReady(true);
    });
    return () => {
      player.current.dispose();
    };
  }, [changedKey]);
  const Video = useCallback(() => /*#__PURE__*/React.createElement("div", {
    "data-vjs-player": true,
    key: changedKey
  }, /*#__PURE__*/React.createElement("video", {
    ref: videoNode,
    className: "video-js"
  })), [changedKey]);
  return {
    Video,
    ready,
    player: player.current
  };
};

export { useVideoJS };
//# sourceMappingURL=index.modern.js.map
