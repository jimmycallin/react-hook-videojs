(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("react"), require("video.js")) : typeof define === "function" && define.amd ? define(["exports", "react", "video.js"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global["react-hook-videojs"] = {}, global.React, global.videojs));
})(this, function(exports2, React, videojs) {
  "use strict";
  function _interopDefaultLegacy(e) {
    return e && typeof e === "object" && "default" in e ? e : { "default": e };
  }
  var React__default = /* @__PURE__ */ _interopDefaultLegacy(React);
  var videojs__default = /* @__PURE__ */ _interopDefaultLegacy(videojs);
  const useVideoJS = (videoJsOptions) => {
    const videoNode = React.useRef(null);
    const [ready, setReady] = React.useState(false);
    const changedKey = JSON.stringify(videoJsOptions);
    const player = React.useRef(null);
    React.useEffect(() => {
      player.current = videojs__default["default"](videoNode.current, videoJsOptions);
      player.current.ready(() => {
        setReady(true);
      });
      return () => {
        player.current.dispose();
      };
    }, [changedKey]);
    const Video = React.useCallback(() => /* @__PURE__ */ React__default["default"].createElement("div", {
      "data-vjs-player": true,
      key: changedKey
    }, /* @__PURE__ */ React__default["default"].createElement("video", {
      ref: videoNode,
      className: "video-js"
    })), [changedKey]);
    return { Video, ready, player: player.current };
  };
  exports2.useVideoJS = useVideoJS;
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2[Symbol.toStringTag] = "Module";
});
//# sourceMappingURL=react-hook-videojs.umd.js.map
