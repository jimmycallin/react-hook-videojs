function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var videojs = _interopDefault(require('video.js'));
require('video.js/dist/video-js.css');

var useVideoJS = function useVideoJS(videoJsOptions) {
  var videoNode = React.useRef(null);

  var _useState = React.useState(false),
      ready = _useState[0],
      setReady = _useState[1];

  var changedKey = JSON.stringify(videoJsOptions);
  var player = React.useRef(null);
  React.useEffect(function () {
    player.current = videojs(videoNode.current, videoJsOptions);
    player.current.ready(function () {
      setReady(true);
    });
    return function () {
      player.current.dispose();
    };
  }, [changedKey]);
  var Video = React.useCallback(function () {
    return /*#__PURE__*/React__default.createElement("div", {
      "data-vjs-player": true,
      key: changedKey
    }, /*#__PURE__*/React__default.createElement("video", {
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

exports.useVideoJS = useVideoJS;
//# sourceMappingURL=index.js.map
