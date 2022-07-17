import React, {
  useRef,
  useState,
  useLayoutEffect,
  useCallback,
  forwardRef,
  HTMLProps,
  MutableRefObject,
} from "react";
import videojs, { VideoJsPlayer, VideoJsPlayerOptions } from "video.js";
import cloneDeep from "lodash.clonedeep";
import { dequal } from "dequal";

// Function copied from
// https://github.com/kentcdodds/use-deep-compare-effect/blob/main/src/index.ts
function useDeepCompareMemoize<T>(value: T): T {
  const ref = React.useRef<T>(value);
  const signalRef = React.useRef<number>(0);

  if (!dequal(value, ref.current)) {
    ref.current = value;
    signalRef.current += 1;
  }

  return React.useMemo(() => ref.current, [signalRef.current]);
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
    playerRef
  ) => {
    const player = playerRef as MutableRefObject<VideoJsPlayer | null>;
    // video.js sometimes mutates the provided options object.
    // We clone it to avoid mutation issues.
    const videoJsOptionsCloned = cloneDeep(videoJsOptions);
    const videoNode = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
      if (!videoNode.current?.parentNode) return;

      // Once we initialize the player, videojs will start mutating the DOM.
      // We need a snapshot of the state just before, so we know what state
      // to reset the DOM to.
      const originalVideoNodeParent =
        videoNode.current.parentNode.cloneNode(true);

      if (!player.current) {
        player.current = videojs(videoNode.current, videoJsOptionsCloned);
        player.current.ready(() => {
          onReady();
        });
      }

      return (): void => {
        // Whenever something changes in the options object, we
        // want to reinitialize video.js, and destroy the old player by calling `player.current.dispose()`

        if (player.current) {
          player.current.dispose();

          // Unfortunately, video.js heavily mutates the DOM in a way that React doesn't
          // like, so we need to readd the removed DOM elements directly after dispose.
          // More concretely, the node marked with `data-vjs-player` will be removed from the
          // DOM. We are readding the cloned original video node parent as it was when React first rendered it,
          // so it is once again synchronized with React.
          if (
            containerRef.current &&
            videoNode.current?.parentNode &&
            !containerRef.current.contains(videoNode.current.parentNode)
          ) {
            containerRef.current.appendChild(originalVideoNodeParent);
            videoNode.current =
              originalVideoNodeParent.firstChild as HTMLVideoElement;
          }

          player.current = null;
          onDispose();
        }
      };

      // We'll use the serialized videoJsOptions object as a dependency object
    }, [useDeepCompareMemoize(videoJsOptions)]);

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
  }
);

VideoJsWrapper.displayName = "VideoJsWrapper";

type VideoProps = {
  children?: React.ReactNode;
} & Partial<HTMLProps<HTMLVideoElement>>;

type VideoType = (props: VideoProps) => JSX.Element;

export const useVideoJS = (
  videoJsOptions: VideoJsPlayerOptions,
  classNames = ""
): {
  Video: VideoType;
  ready: boolean;
  player: VideoJsPlayer | null;
} => {
  const [ready, setReady] = useState(false);

  // player will contain the video.js player object, once it is ready.
  const player = useRef<VideoJsPlayer>(null);
  const Video = useCallback(
    ({ children, ...props }: VideoProps) => (
      <VideoJsWrapper
        videoJsOptions={videoJsOptions}
        classNames={classNames}
        onReady={(): void => setReady(true)}
        onDispose={(): void => setReady(false)}
        {...props}
        ref={player}
      >
        {children}
      </VideoJsWrapper>
    ),
    [useDeepCompareMemoize(videoJsOptions), classNames]
  );

  return { Video, ready, player: player.current };
};
