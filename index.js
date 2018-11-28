export default (videoJsOptions) => {
  const videoNode = useRef(null);
  useLayoutEffect(
    () => {
      const player = videojs(videoNode.current, videoJsOptions, () => {
        console.log("onPlayerReady", this);
      });
      return () => {
        player.dispose();
      };
    },
    [JSON.stringify(videoJsOptions)]
  );
  return () => (
    <div data-vjs-player key={JSON.stringify(videoJsOptions)}>
      <video ref={videoNode} className="video-js" />
    </div>
  );
};
