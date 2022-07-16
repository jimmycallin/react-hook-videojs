import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  HTMLProps,
} from "react";
import videojs, { VideoJsPlayer, VideoJsPlayerOptions } from "video.js";

type VideoType = (
  props: {
    children?: React.ReactNode;
  } & Partial<HTMLProps<HTMLVideoElement>>
) => JSX.Element;

export const useVideoJS = (
  videoJsOptions: VideoJsPlayerOptions,
  classNames = ""
): {
  Video: VideoType;
  ready: boolean;
  player: videojs.Player | null;
} => {
  const videoNode = useRef(null);
  const [ready, setReady] = useState(false);
  const changedKey = JSON.stringify(videoJsOptions);
  const player = useRef<VideoJsPlayer | null>(null);
  useEffect(() => {
    if (!videoNode.current) return;
    player.current = videojs(videoNode.current, videoJsOptions);
    player.current.ready(() => {
      setReady(true);
    });
    return () => {
      player.current?.dispose();
    };
  }, [changedKey]);

  const Video = useCallback<VideoType>(
    ({ children, ...props }) => (
      <div data-vjs-player={true} key={changedKey}>
        <video ref={videoNode} className={`video-js ${classNames}`} {...props}>
          {children}
        </video>
      </div>
    ),
    [changedKey]
  );
  return { Video, ready, player: player.current };
};
