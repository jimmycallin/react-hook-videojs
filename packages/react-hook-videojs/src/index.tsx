import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useEffectEvent,
} from "react";
import type { ComponentPropsWithRef, MutableRefObject, Ref } from "react";
import videojsModule from "video.js";
import type { VideoJsPlayer, VideoJsPlayerOptions } from "video.js";
import cloneDeep from "lodash.clonedeep";

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

const OPTION_TO_METHOD_ALIAS: Readonly<Record<string, string>> = {
  sources: "src",
};

const resetPlayerMethodCache = (): void => {};

const getPlayerMethodCache = (): ReadonlySet<string> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Player = (videojsModule as any).getComponent?.("Player");
  const methods = new Set<string>();

  if (!Player?.prototype) {
    return methods;
  }

  let proto = Player.prototype as Record<string, unknown>;
  while (proto && proto !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name !== "constructor" && typeof proto[name] === "function") {
        methods.add(name);
      }
    }
    proto = Object.getPrototypeOf(proto) as Record<string, unknown>;
  }

  return methods;
};

const isDynamicCandidate = (key: string): boolean => {
  const methodName = OPTION_TO_METHOD_ALIAS[key] ?? key;
  return getPlayerMethodCache().has(methodName);
};

const applyDynamically = (
  player: VideoJsPlayer,
  key: string,
  value: unknown,
): boolean => {
  const methodName = OPTION_TO_METHOD_ALIAS[key] ?? key;
  const method = (player as Record<string, unknown>)[methodName];

  if (typeof method !== "function") {
    return false;
  }

  try {
    (method as (v: unknown) => void).call(player, value);
    return true;
  } catch {
    return false;
  }
};

const stableSerialize = (value: unknown): string => {
  const seen = new WeakSet<object>();
  const functionIds = new WeakMap<Function, number>();
  let nextFunctionId = 1;

  return JSON.stringify(value, (_key, currentValue) => {
    if (typeof currentValue === "function") {
      if (!functionIds.has(currentValue)) {
        functionIds.set(currentValue, nextFunctionId++);
      }

      return `[Function:${functionIds.get(currentValue)}]`;
    }

    if (typeof currentValue === "undefined") {
      return "[Undefined]";
    }

    if (typeof currentValue === "bigint") {
      return `[BigInt:${currentValue.toString()}]`;
    }

    if (currentValue && typeof currentValue === "object") {
      if (seen.has(currentValue as object)) {
        return "[Circular]";
      }

      seen.add(currentValue as object);

      if (Array.isArray(currentValue)) {
        return currentValue;
      }

      const record = currentValue as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(record).sort()) {
        sorted[key] = record[key];
      }

      return sorted;
    }

    return currentValue;
  });
};

const getChangedEntries = (
  prev: VideoJsPlayerOptions,
  next: VideoJsPlayerOptions,
): [string, unknown][] => {
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: [string, unknown][] = [];

  for (const key of allKeys) {
    const typedKey = key as keyof VideoJsPlayerOptions;
    if (
      !Object.is(prev[typedKey], next[typedKey]) &&
      stableSerialize(prev[typedKey]) !== stableSerialize(next[typedKey])
    ) {
      changed.push([key, next[typedKey]]);
    }
  }

  return changed;
};

export const __private__ = {
  setVideoNodeRef,
  getVideoClassName,
  restoreDisposedVideoNode,
  shouldSkipReadyCallback,
  callOnReadyForCurrentPlayer,
  getCurrentVideoNode,
  getChangedEntries,
  isDynamicCandidate,
  applyDynamically,
  stableSerialize,
  getPlayerMethodCache,
  resetPlayerMethodCache,
  OPTION_TO_METHOD_ALIAS,
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
    () => cloneDeep(videoJsOptions),
    [videoJsOptions],
  );
  const videoNode = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevOptionsRef = useRef<VideoJsPlayerOptions>(videoJsOptionsCloned);
  const originalVideoNodeRef = useRef<HTMLVideoElement | null>(null);

  const reinitSignature = useMemo((): string => {
    const reinitOnly: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(videoJsOptionsCloned)) {
      if (!isDynamicCandidate(key)) {
        reinitOnly[key] = value;
      }
    }

    return stableSerialize(reinitOnly);
  }, [videoJsOptionsCloned]);

  const onInit = useEffectEvent((currentVideoNode: HTMLVideoElement) => {
    prevOptionsRef.current = videoJsOptionsCloned;
    return videojs(currentVideoNode, cloneDeep(videoJsOptionsCloned));
  });

  const disposeCurrentPlayer = useEffectEvent((): void => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer) {
      return;
    }

    if (!currentPlayer.isDisposed()) {
      currentPlayer.dispose();
    }

    playerRef.current = null;

    const containerNode = containerRef.current;
    if (containerNode) {
      restoreDisposedVideoNode(
        containerNode,
        originalVideoNodeRef.current,
        videoNode,
        videoRef,
      );
    }

    onDispose();
  });

  const initCurrentPlayer = useEffectEvent((): void => {
    const containerNode = containerRef.current as HTMLDivElement | null;
    if (!containerNode) {
      return;
    }

    const currentVideoNode = getCurrentVideoNode(containerNode, videoNode);

    if (!currentVideoNode || !currentVideoNode.isConnected) {
      return;
    }

    if (videoNode.current !== currentVideoNode) {
      setVideoNodeRef(videoNode, videoRef, currentVideoNode);
    }

    originalVideoNodeRef.current = currentVideoNode.cloneNode(
      true,
    ) as HTMLVideoElement;

    let disposed = false;
    const initializedPlayer = onInit(currentVideoNode);
    playerRef.current = initializedPlayer;
    initializedPlayer.ready(() => {
      callOnReadyForCurrentPlayer(
        disposed,
        playerRef,
        initializedPlayer,
        onReady,
      );
    });

    initializedPlayer.one("dispose", () => {
      disposed = true;
    });
  });

  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) {
      return;
    }

    if (videoNode.current?.isConnected !== true) {
      disposeCurrentPlayer();
      initCurrentPlayer();
      return;
    }

    const containerNode = containerRef.current;
    if (containerNode) {
      const currentVideoNode = getCurrentVideoNode(containerNode, videoNode);
      if (currentVideoNode && videoNode.current !== currentVideoNode) {
        disposeCurrentPlayer();
        initCurrentPlayer();
        return;
      }
    }

    const changed = getChangedEntries(prevOptionsRef.current, videoJsOptionsCloned);
    if (changed.length === 0) {
      prevOptionsRef.current = videoJsOptionsCloned;
      return;
    }

    const hasNonDynamicChange = changed.some(([key]) => !isDynamicCandidate(key));
    if (hasNonDynamicChange) {
      return;
    }

    let allApplied = true;
    for (const [key, value] of changed) {
      if (!applyDynamically(player, key, value)) {
        allApplied = false;
        break;
      }
    }

    if (allApplied) {
      prevOptionsRef.current = videoJsOptionsCloned;
      return;
    }

    disposeCurrentPlayer();
    initCurrentPlayer();
  }, [videoJsOptionsCloned, playerRef]);

  useEffect(() => {
    const containerNode = containerRef.current as HTMLDivElement | null;
    if (!containerNode) {
      return;
    }

    const currentVideoNode = getCurrentVideoNode(containerNode, videoNode);

    if (!currentVideoNode || !currentVideoNode.isConnected) {
      return;
    }

    if (videoNode.current !== currentVideoNode) {
      setVideoNodeRef(videoNode, videoRef, currentVideoNode);
    }

    const originalVideoNode = currentVideoNode.cloneNode(
      true,
    ) as HTMLVideoElement;

    let disposed = false;
    const initializedPlayer = onInit(currentVideoNode);
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
      disposed = true;
      const wasCurrent = playerRef.current === initializedPlayer;

      if (!initializedPlayer.isDisposed()) {
        initializedPlayer.dispose();
      }

      if (!wasCurrent) {
        return;
      }

      playerRef.current = null;

      restoreDisposedVideoNode(
        containerNode,
        originalVideoNode,
        videoNode,
        videoRef,
      );

      onDispose();
    };
  }, [reinitSignature, onReady, onDispose, playerRef, videoRef]);

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
 * disposes it on unmount, and reinitializes only when non-dynamic
 * `videoJsOptions` change. Dynamic options (such as `sources`, `controls`,
 * `muted`, and similar player-settable values) are applied imperatively to
 * the current player instance when possible.
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
  const videoJsOptionsRef = useRef(videoJsOptions);
  videoJsOptionsRef.current = videoJsOptions;

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
        videoJsOptions={videoJsOptionsRef.current}
        classNames={classNames}
        onReady={onReady}
        onDispose={onDispose}
        playerRef={playerRef}
        {...props}
      >
        {children}
      </VideoJsWrapper>
    ),
    [classNames, onReady, onDispose],
  );

  return { Video, ready, player };
};
