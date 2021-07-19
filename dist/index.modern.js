import React, { useRef, useState, useEffect, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

var useVideoJS = function useVideoJS(videoJsOptions) {
  var videoNode = useRef(null);

  var _useState = useState(false),
      ready = _useState[0],
      setReady = _useState[1];

  var changedKey = JSON.stringify(videoJsOptions);
  var player = useRef(null);
  useEffect(function () {
    player.current = videojs(videoNode.current, videoJsOptions);
    player.current.ready(function () {
      setReady(true);
    });
    return function () {
      player.current.dispose();
    };
  }, [changedKey]);
  var Video = useCallback(function () {
    return /*#__PURE__*/React.createElement("div", {
      "data-vjs-player": true,
      key: changedKey
    }, /*#__PURE__*/React.createElement("video", {
      ref: videoNode,
      className: "video-js"
    }));
  }, [changedKey]);
  return {
    Video: Video,
    ready: ready,
    player: player.current
  };
};

export { useVideoJS };
//# sourceMappingURL=index.modern.js.map
