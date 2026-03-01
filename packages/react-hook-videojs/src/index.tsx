import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { HTMLProps, MutableRefObject } from "react";
import videojsModule from "video.js";
import type { VideoJsPlayer, VideoJsPlayerOptions } from "video.js";
import cloneDeep from "lodash.clonedeep";

const videojs = videojsModule as unknown as (
  id: string | Element,
  options?: VideoJsPlayerOptions,
) => VideoJsPlayer;

const restoreDisposedVideoNode = (
  containerNode: HTMLDivElement,
  originalVideoNodeParent: Node | null | undefined,
  videoNode: MutableRefObject<HTMLVideoElement | null>,
): void => {
  if (originalVideoNodeParent && !containerNode.querySelector("video")) {
    containerNode.appendChild(originalVideoNodeParent);
    videoNode.current = containerNode.querySelector("video");
  }
};

export const __private__ = {
  restoreDisposedVideoNode,
};

// Integrating React and video.js is a bit tricky, especially when supporting
// React 18 strict mode. We'll do our best to explain what happens in inline comments.

type VideoJsWrapperProps = {
  children: React.ReactNode;
  videoJsOptions: VideoJsPlayerOptions;
  onReady: (player: VideoJsPlayer) => void;
  onDispose: () => void;
  classNames: string;
  playerRef: MutableRefObject<VideoJsPlayer | null>;
} & Partial<HTMLProps<HTMLVideoElement>>;

const VideoJsWrapper = ({
  children,
  videoJsOptions,
  onReady,
  onDispose,
  classNames,
  playerRef,
  ...props
}: VideoJsWrapperProps): React.JSX.Element => {
  const videoJsOptionsCloned = useMemo(
    () => cloneDeep(videoJsOptions),
    [videoJsOptions],
  );
  const videoNode = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const containerNode = containerRef.current;
    if (!containerNode) return;

    const connectedVideoNode = containerNode.querySelector(
      "video",
    ) as HTMLVideoElement | null;
    const currentVideoNode =
      videoNode.current?.isConnected === true
        ? videoNode.current
        : connectedVideoNode;

    if (!currentVideoNode || !currentVideoNode.isConnected) return;

    if (videoNode.current !== currentVideoNode) {
      videoNode.current = currentVideoNode;
    }

    const originalVideoNodeParent =
      currentVideoNode.parentNode?.cloneNode(true);

    const initializedPlayer = videojs(currentVideoNode, videoJsOptionsCloned);
    playerRef.current = initializedPlayer;
    initializedPlayer.ready(() => {
      onReady(initializedPlayer);
    });

    return (): void => {
      // Whenever something changes in the options object, we
      // want to reinitialize video.js, and destroy the old player by calling `player.current.dispose()`

      initializedPlayer.dispose();
      playerRef.current = null;

      restoreDisposedVideoNode(
        containerNode,
        originalVideoNodeParent,
        videoNode,
      );

      onDispose();
    };

    // Reinitialize only when deep-compared options or lifecycle handlers change.
  }, [videoJsOptionsCloned, onReady, onDispose, playerRef]);

  return (
    <div ref={containerRef}>
      <div data-vjs-player>
        <video ref={videoNode} className={`video-js ${classNames}`} {...props}>
          {children}
        </video>
      </div>
    </div>
  );
};

type VideoProps = {
  children?: React.ReactNode;
} & Partial<HTMLProps<HTMLVideoElement>>;

type VideoType = (props: VideoProps) => React.JSX.Element;

export const useVideoJS = (
  videoJsOptions: VideoJsPlayerOptions,
  classNames = "",
): {
  Video: VideoType;
  ready: boolean;
  player: VideoJsPlayer | null;
} => {
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState<VideoJsPlayer | null>(null);

  // player will contain the video.js player object, once it is ready.
  const playerRef = useRef<VideoJsPlayer | null>(null);
  const onReady = useCallback((playerInstance: VideoJsPlayer): void => {
    setReady(true);
    setPlayer(playerInstance);
  }, []);
  const onDispose = useCallback((): void => {
    setReady(false);
    setPlayer(null);
  }, []);
  const Video = useCallback(
    ({ children, ...props }: VideoProps) => (
      <VideoJsWrapper
        videoJsOptions={videoJsOptions}
        classNames={classNames}
        onReady={onReady}
        onDispose={onDispose}
        playerRef={playerRef}
        {...props}
      >
        {children}
      </VideoJsWrapper>
    ),
    [videoJsOptions, classNames, onReady, onDispose],
  );

  return { Video, ready, player };
};
