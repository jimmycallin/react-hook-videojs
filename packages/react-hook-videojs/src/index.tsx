import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { ComponentPropsWithRef, MutableRefObject, Ref } from "react";
import videojsModule from "video.js";
import deepClone from "./deepClone.js";

type VideoJsPlayer = ReturnType<typeof videojsModule>;
type VideoJsPlayerOptions = Parameters<typeof videojsModule>[1];

const videojs = videojsModule as unknown as (
  id: string | Element,
  options?: VideoJsPlayerOptions,
) => VideoJsPlayer;

const setVideoNodeRef = (
  videoNode: MutableRefObject<HTMLVideoElement | null>,
  videoRef: Ref<HTMLVideoElement> | undefined,
  value: HTMLVideoElement | null,
): void => {
  videoNode.current = value;

  if (!videoRef) {
    return;
  }

  if (typeof videoRef === "function") {
    videoRef(value);
    return;
  }

  videoRef.current = value;
};

const getVideoClassName = (classNames: string, className?: string): string =>
  ["video-js", classNames, className].filter(Boolean).join(" ");

const restoreDisposedVideoNode = (
  containerNode: HTMLDivElement,
  originalVideoNode: HTMLVideoElement | null,
  videoNode: MutableRefObject<HTMLVideoElement | null>,
  videoRef?: Ref<HTMLVideoElement>,
): void => {
  if (originalVideoNode && !containerNode.querySelector("video")) {
    containerNode.appendChild(originalVideoNode);
    setVideoNodeRef(
      videoNode,
      videoRef,
      containerNode.querySelector("video") as HTMLVideoElement | null,
    );
  }
};

const shouldSkipReadyCallback = (
  disposed: boolean,
  playerRef: MutableRefObject<VideoJsPlayer | null>,
  initializedPlayer: VideoJsPlayer,
): boolean => disposed || playerRef.current !== initializedPlayer;

const getCurrentVideoNode = (
  containerNode: HTMLDivElement,
  videoNode: MutableRefObject<HTMLVideoElement | null>,
): HTMLVideoElement | null => {
  const connectedVideoNode = containerNode.querySelector(
    "video",
  ) as HTMLVideoElement | null;

  return videoNode.current?.isConnected === true
    ? videoNode.current
    : connectedVideoNode;
};

const callOnReadyForCurrentPlayer = (
  disposed: boolean,
  playerRef: MutableRefObject<VideoJsPlayer | null>,
  initializedPlayer: VideoJsPlayer,
  onReady: (player: VideoJsPlayer) => void,
): void => {
  if (shouldSkipReadyCallback(disposed, playerRef, initializedPlayer)) {
    return;
  }

  onReady(initializedPlayer);
};

export const __private__ = {
  setVideoNodeRef,
  getVideoClassName,
  restoreDisposedVideoNode,
  shouldSkipReadyCallback,
  callOnReadyForCurrentPlayer,
  getCurrentVideoNode,
};

// Integrating React and video.js is a bit tricky, especially when supporting
// React 19 strict mode. We'll do our best to explain what happens in inline comments.

type VideoElementProps = ComponentPropsWithRef<"video">;

type VideoJsWrapperProps = {
  videoJsOptions: VideoJsPlayerOptions;
  onReady: (player: VideoJsPlayer) => void;
  onDispose: () => void;
  classNames: string;
  playerRef: MutableRefObject<VideoJsPlayer | null>;
} & VideoElementProps;

const VideoJsWrapper = ({
  children,
  videoJsOptions,
  onReady,
  onDispose,
  classNames,
  playerRef,
  ref: videoRef,
  className,
  ...props
}: VideoJsWrapperProps): React.JSX.Element => {
  const videoJsOptionsCloned = useMemo(
    () => deepClone(videoJsOptions),
    [videoJsOptions],
  );
  const videoNode = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const containerNode = containerRef.current as HTMLDivElement;

    const currentVideoNode = getCurrentVideoNode(containerNode, videoNode);

    if (!currentVideoNode || !currentVideoNode.isConnected) return;

    if (videoNode.current !== currentVideoNode) {
      setVideoNodeRef(videoNode, videoRef, currentVideoNode);
    }

    const originalVideoNode = currentVideoNode.cloneNode(
      true,
    ) as HTMLVideoElement;

    let disposed = false;

    const initializedPlayer = videojs(currentVideoNode, videoJsOptionsCloned);
    playerRef.current = initializedPlayer;
    initializedPlayer.ready(() => {
      callOnReadyForCurrentPlayer(
        disposed,
        playerRef,
        initializedPlayer,
        onReady,
      );
    });

    return (): void => {
      // Whenever something changes in the options object, we
      // want to reinitialize video.js, and destroy the old player by calling `player.current.dispose()`

      disposed = true;
      initializedPlayer.dispose();
      playerRef.current = null;

      restoreDisposedVideoNode(
        containerNode,
        originalVideoNode,
        videoNode,
        videoRef,
      );

      onDispose();
    };

    // Reinitialize only when deep-compared options or lifecycle handlers change.
  }, [videoJsOptionsCloned, onReady, onDispose, playerRef, videoRef]);

  return (
    <div ref={containerRef}>
      <video
        ref={(value) => {
          setVideoNodeRef(videoNode, videoRef, value);
        }}
        className={getVideoClassName(classNames, className)}
        {...props}
      >
        {children}
      </video>
    </div>
  );
};

/** All standard `<video>` element attributes and the `ref` prop are accepted. */
export type VideoProps = VideoElementProps;

/**
 * The `Video` component returned by {@link useVideoJS}.
 *
 * Renders a Video.js-managed `<video>` element. Accepts any prop that a
 * native `<video>` element accepts (including `ref`, `className`, `muted`,
 * `autoPlay`, etc.) as well as child elements such as `<track>` nodes.
 *
 * @example
 * ```tsx
 * const { Video } = useVideoJS(options);
 * return (
 *   <Video className="my-player" muted>
 *     <track kind="captions" src="/captions.vtt" srcLang="en" default />
 *   </Video>
 * );
 * ```
 */
export type VideoComponent = (props: VideoProps) => React.JSX.Element;

/**
 * Integrates Video.js with React.
 *
 * Initializes a Video.js player when the returned `Video` component mounts,
 * disposes it on unmount or when `videoJsOptions` changes, and reinitializes
 * with the new configuration — all while handling React 19 Strict Mode's
 * double-invoke lifecycle correctly.
 *
 * @param videoJsOptions - Video.js player options. **Must be memoized** (e.g.
 *   with `React.useMemo`) so the player only reinitializes when options values
 *   actually change, not on every render.
 * @param classNames - Optional CSS class name(s) appended to the `<video>`
 *   node in addition to the required `"video-js"` class.
 * @returns An object with three fields:
 *   - `Video` — React component to render in JSX. Accepts all `<video>` props
 *     and children (e.g. `<track>` elements).
 *   - `ready` — `true` once the player has fired its `"ready"` event.
 *   - `player` — The `VideoJsPlayer` instance when ready, `null` otherwise.
 *     Use this to call Video.js API methods imperatively (e.g. in a
 *     `useEffect` that depends on `player`).
 *
 * @example
 * ```tsx
 * import React, { useMemo, useEffect } from "react";
 * import "video.js/dist/video-js.css";
 * import { useVideoJS } from "react-hook-videojs";
 *
 * const MyPlayer = ({ src }: { src: string }) => {
 *   const options = useMemo(() => ({ sources: [{ src }] }), [src]);
 *   const { Video, ready, player } = useVideoJS(options);
 *
 *   // Attach event listeners imperatively once the player is ready
 *   useEffect(() => {
 *     if (!player) return;
 *     const onPlay = () => console.log("playing");
 *     player.on("play", onPlay);
 *     return () => { player.off("play", onPlay); };
 *   }, [player]);
 *
 *   return <Video />;
 * };
 * ```
 */
export const useVideoJS = (
  videoJsOptions: VideoJsPlayerOptions,
  classNames = "",
): {
  Video: VideoComponent;
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
