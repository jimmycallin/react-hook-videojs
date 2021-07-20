function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var videojs = _interopDefault(require('video.js'));
require('video.js/dist/video-js.css');

const useVideoJS = videoJsOptions => {
  const videoNode = React.useRef(null);
  const [ready, setReady] = React.useState(false);
  const changedKey = JSON.stringify(videoJsOptions);
  const player = React.useRef(null);
  React.useEffect(() => {
    player.current = videojs(videoNode.current, videoJsOptions);
    player.current.ready(() => {
      setReady(true);
    });
    return () => {
      player.current.dispose();
    };
  }, [changedKey]);
  const Video = React.useCallback(() => /*#__PURE__*/React__default.createElement("div", {
    "data-vjs-player": true,
    key: changedKey
  }, /*#__PURE__*/React__default.createElement("video", {
    ref: videoNode,
    className: "video-js"
  })), [changedKey]);
  return {
    Video,
    ready,
    player: player.current
  };
};

exports.useVideoJS = useVideoJS;
//# sourceMappingURL=index.js.map
