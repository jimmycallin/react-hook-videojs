import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
} from "react";
import type { HTMLProps, MutableRefObject } from "react";
import videojsModule from "video.js";
import cloneDeep from "lodash.clonedeep";
import { dequal } from "dequal";

type VideoJsPlayer = any;
type VideoJsPlayerOptions = any;

const videojs = videojsModule as unknown as (
  id: string | Element,
  options?: VideoJsPlayerOptions,
) => VideoJsPlayer;

// Function copied from
// https://github.com/kentcdodds/use-deep-compare-effect/blob/main/src/index.ts
function useDeepCompareMemoize<T>(value: T): T {
  const ref = React.useRef<T>(value);

  if (!dequal(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
}

// Integrating React and video.js is a bit tricky, especially when supporting
// React 18 strict mode. We'll do our best to explain what happens in inline comments.

const VideoJsWrapper = forwardRef<
  VideoJsPlayer,
  {
    children: React.ReactNode;
    videoJsOptions: VideoJsPlayerOptions;
    onReady: () => void;
    onDispose: () => void;
    classNames: string;
  }
>(
  (
    { children, videoJsOptions, onReady, onDispose, classNames, ...props },
    playerRef,
  ) => {
    const memoizedVideoJsOptions = useDeepCompareMemoize(videoJsOptions);
    const player = playerRef as MutableRefObject<VideoJsPlayer | null>;
    // video.js sometimes mutates the provided options object.
    // We clone it to avoid mutation issues.
    const videoJsOptionsCloned = React.useMemo(
      () => cloneDeep(memoizedVideoJsOptions),
      [memoizedVideoJsOptions],
    );
    const videoNode = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const containerNode = containerRef.current;
      const videoInContainer = containerNode?.querySelector(
        "video",
      ) as HTMLVideoElement | null;
      const currentVideoNode =
        videoNode.current?.isConnected === true
          ? videoNode.current
          : videoInContainer;

      /* v8 ignore start -- stale-ref recovery is non-deterministic in browser automation */
      if (currentVideoNode && currentVideoNode !== videoNode.current) {
        videoNode.current = currentVideoNode;
      }
      /* v8 ignore stop */

      if (!currentVideoNode?.parentNode || !currentVideoNode.isConnected)
        return;

      // Once we initialize the player, videojs will start mutating the DOM.
      // We need a snapshot of the state just before, so we know what state
      // to reset the DOM to.
      const originalVideoNodeParent =
        currentVideoNode.parentNode.cloneNode(true);

      /* v8 ignore next -- player is reset during cleanup before this effect re-runs */
      if (!player.current) {
        player.current = videojs(currentVideoNode, videoJsOptionsCloned);
        player.current.ready(onReady);
      }

      return (): void => {
        // Whenever something changes in the options object, we
        // want to reinitialize video.js, and destroy the old player by calling `player.current.dispose()`

        /* v8 ignore next -- cleanup is only created for initialized players */
        if (player.current) {
          player.current.dispose();

          // Unfortunately, video.js heavily mutates the DOM in a way that React doesn't
          // like, so we need to readd the removed DOM elements directly after dispose.
          // More concretely, the node marked with `data-vjs-player` will be removed from the
          // DOM. We are readding the cloned original video node parent as it was when React first rendered it,
          // so it is once again synchronized with React.
          /* v8 ignore start -- defensive fallback for video.js DOM mutation timing */
          if (
            containerNode &&
            currentVideoNode.parentNode &&
            !containerNode.contains(currentVideoNode.parentNode)
          ) {
            containerNode.appendChild(originalVideoNodeParent);
          }
          /* v8 ignore stop */

          player.current = null;
          onDispose();
        }
      };

      // Reinitialize only when deep-compared options or lifecycle handlers change.
    }, [videoJsOptionsCloned, onReady, onDispose, player]);

    return (
      // TODO: can we get by withour introducing an extra div?
      <div ref={containerRef}>
        <div data-vjs-player>
          <video
            ref={videoNode}
            className={`video-js ${classNames}`}
            {...props}
          >
            {children}
          </video>
        </div>
      </div>
    );
  },
);

VideoJsWrapper.displayName = "VideoJsWrapper";

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
  const memoizedVideoJsOptions = useDeepCompareMemoize(videoJsOptions);
  const [ready, setReady] = useState(false);

  // player will contain the video.js player object, once it is ready.
  const player = useRef<VideoJsPlayer>(null);
  const onReady = useCallback((): void => setReady(true), []);
  const onDispose = useCallback((): void => setReady(false), []);
  const Video = useCallback(
    ({ children, ...props }: VideoProps) => (
      <VideoJsWrapper
        videoJsOptions={memoizedVideoJsOptions}
        classNames={classNames}
        onReady={onReady}
        onDispose={onDispose}
        {...props}
        ref={player}
      >
        {children}
      </VideoJsWrapper>
    ),
    [memoizedVideoJsOptions, classNames, onReady, onDispose],
  );

  return { Video, ready, player: player.current };
};
