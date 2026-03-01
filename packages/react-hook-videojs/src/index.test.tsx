import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { __private__, useVideoJS } from "./index";

type VideoJsOptions = {
  sources?: Array<{ src: string; type?: string }>;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
};

const createdObjectUrls: string[] = [];

const createFixtureVideoUrl = async (): Promise<string> => {
  const mimeTypeCandidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  const mimeType = mimeTypeCandidates.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate),
  );

  if (!mimeType) {
    throw new Error(
      "No supported MediaRecorder video mime type in test browser",
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create canvas context for video fixture");
  }

  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const stream = canvas.captureStream(15);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  const stopPromise = new Promise<void>((resolve) => {
    recorder.addEventListener("stop", () => {
      resolve();
    });
  });

  recorder.start();
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 150);
  });
  recorder.stop();
  await stopPromise;

  stream.getTracks().forEach((track) => {
    track.stop();
  });

  const videoBlob = new Blob(chunks, { type: mimeType });
  const objectUrl = URL.createObjectURL(videoBlob);
  createdObjectUrls.push(objectUrl);

  return objectUrl;
};

const HookHarness = ({
  options,
  mounted = true,
}: {
  options: VideoJsOptions;
  mounted?: boolean;
}): React.JSX.Element => {
  const { Video, ready, player } = useVideoJS(options);
  return (
    <div>
      <span data-testid="ready">{ready ? "true" : "false"}</span>
      <span data-testid="player">{player ? "set" : "null"}</span>
      {mounted ? <Video data-testid="video" /> : null}
    </div>
  );
};

afterEach(() => {
  cleanup();

  while (createdObjectUrls.length > 0) {
    const objectUrl = createdObjectUrls.pop();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
});

test("initializes in browser and attaches a playable media source", async () => {
  const source = await createFixtureVideoUrl();
  const { getByTestId, container } = render(
    <HookHarness
      options={{ sources: [{ src: source, type: "video/webm" }] }}
    />,
  );

  await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("set"));

  const videoElement = container.querySelector("video");
  expect(videoElement).toBeTruthy();
  expect(videoElement?.tagName).toBe("VIDEO");

  await waitFor(() => {
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("blob:");
  });
});

test("loads local fixture media without native media error", async () => {
  const source = await createFixtureVideoUrl();
  const { container } = render(
    <HookHarness
      options={{ sources: [{ src: source, type: "video/webm" }] }}
    />,
  );
  const videoElement = container.querySelector("video");
  expect(videoElement).toBeTruthy();

  await waitFor(() => {
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("blob:");
  });

  await waitFor(() => {
    expect(videoElement?.error).toBeNull();
    expect(videoElement?.readyState ?? 0).toBeGreaterThan(0);
  });
});

test("autoplay starts playback and advances media time", async () => {
  const source = await createFixtureVideoUrl();

  const { container } = render(
    <HookHarness
      options={{
        autoplay: true,
        muted: true,
        sources: [{ src: source, type: "video/webm" }],
      }}
    />,
  );

  const videoElement = await waitFor(() => {
    const element = container.querySelector("video");
    expect(element).toBeTruthy();
    return element as HTMLVideoElement;
  });

  await waitFor(() => {
    const playerRoot = container.querySelector(".video-js");

    expect(playerRoot?.classList.contains("vjs-playing")).toBe(true);
    expect(playerRoot?.classList.contains("vjs-has-started")).toBe(true);
    expect(videoElement?.paused).toBe(false);
  });

  await waitFor(() => {
    expect(videoElement.readyState).toBeGreaterThan(1);
    expect(videoElement.currentTime > 0 || videoElement.ended).toBe(true);
  });
});

test("reinitializes player and swaps the media source when options change", async () => {
  const firstSource = await createFixtureVideoUrl();
  const secondSource = await createFixtureVideoUrl();

  const { rerender, container } = render(
    <HookHarness
      options={{ sources: [{ src: firstSource, type: "video/webm" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(firstSource);
  });

  rerender(
    <HookHarness
      options={{ sources: [{ src: secondSource, type: "video/webm" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(secondSource);
  });
});

test("recovers when ref points to detached video but container has a connected video", async () => {
  const firstSource = await createFixtureVideoUrl();
  const secondSource = await createFixtureVideoUrl();

  const { rerender, container } = render(
    <HookHarness
      options={{ sources: [{ src: firstSource, type: "video/webm" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(firstSource);
  });

  const currentWrapper = container.querySelector("[data-vjs-player]");
  const wrapperParent = currentWrapper?.parentNode;
  const replacementWrapper = currentWrapper?.cloneNode(true);
  if (wrapperParent && currentWrapper && replacementWrapper) {
    wrapperParent.replaceChild(replacementWrapper, currentWrapper);
  }

  rerender(
    <HookHarness
      options={{ sources: [{ src: secondSource, type: "video/webm" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(secondSource);
  });
});

test("stays stable under StrictMode mount/unmount lifecycle", async () => {
  const source = await createFixtureVideoUrl();
  const { container, getByTestId } = render(
    <React.StrictMode>
      <HookHarness
        options={{ sources: [{ src: source, type: "video/webm" }] }}
      />
    </React.StrictMode>,
  );

  await waitFor(() => expect(container.querySelector("video")).toBeTruthy());
  await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("set"));
  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("blob:");
  });
});

test("handles rapid options churn and keeps latest media source", async () => {
  const sourceA = await createFixtureVideoUrl();
  const sourceB = await createFixtureVideoUrl();
  const sourceC = await createFixtureVideoUrl();

  const { rerender, container } = render(
    <HookHarness
      options={{ sources: [{ src: sourceA, type: "video/webm" }] }}
    />,
  );

  rerender(
    <HookHarness
      options={{ sources: [{ src: sourceB, type: "video/webm" }] }}
    />,
  );
  rerender(
    <HookHarness
      options={{ sources: [{ src: sourceC, type: "video/webm" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(sourceC);
  });
});

test("does not recreate player repeatedly when options stay the same", async () => {
  const source = await createFixtureVideoUrl();
  const seenPlayers = new Set<unknown>();

  const StableRerenderHarness = (): React.JSX.Element => {
    const [tick, setTick] = useState(0);
    const options = useMemo(
      () => ({ sources: [{ src: source, type: "video/webm" }] }),
      [],
    );
    const { Video, player } = useVideoJS(options);

    if (player) {
      seenPlayers.add(player);
    }

    useEffect(() => {
      if (tick >= 3) return;
      const id = window.setTimeout(() => {
        setTick((previous) => previous + 1);
      }, 20);
      return () => {
        window.clearTimeout(id);
      };
    }, [tick]);

    return (
      <div>
        <span data-testid="tick">{tick}</span>
        <span data-testid="player-count">{seenPlayers.size}</span>
        <Video />
      </div>
    );
  };

  const { getByTestId } = render(<StableRerenderHarness />);

  await waitFor(() => {
    expect(getByTestId("tick").textContent).toBe("3");
  });

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 80);
  });

  expect(getByTestId("player-count").textContent).toBe("1");
});

test("skips initialization when the rendered video gets detached before effect runs", async () => {
  const source = await createFixtureVideoUrl();

  const DetachedBeforeEffectHarness = (): React.JSX.Element => {
    const { Video, ready, player } = useVideoJS({
      sources: [{ src: source, type: "video/webm" }],
    });

    useLayoutEffect(() => {
      const videoElement = document.querySelector("video");
      videoElement?.remove();
    }, []);

    return (
      <div>
        <span data-testid="ready">{ready ? "true" : "false"}</span>
        <span data-testid="player">{player ? "set" : "null"}</span>
        <Video />
      </div>
    );
  };

  const { getByTestId } = render(<DetachedBeforeEffectHarness />);
  await waitFor(() => {
    expect(getByTestId("ready").textContent).toBe("false");
    expect(getByTestId("player").textContent).toBe("null");
  });
});

test("does not initialize a player when Video is not rendered", async () => {
  const source = await createFixtureVideoUrl();
  const { getByTestId } = render(
    <HookHarness options={{ sources: [{ src: source }] }} mounted={false} />,
  );

  expect(getByTestId("ready").textContent).toBe("false");
  expect(getByTestId("player").textContent).toBe("null");

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 25);
  });

  expect(getByTestId("ready").textContent).toBe("false");
  expect(getByTestId("player").textContent).toBe("null");
});

test("supports ref prop on Video component", async () => {
  const source = await createFixtureVideoUrl();

  const RefHarness = (): React.JSX.Element => {
    const [hasRef, setHasRef] = useState(false);
    const { Video } = useVideoJS({
      sources: [{ src: source, type: "video/webm" }],
    });

    return (
      <div>
        <span data-testid="has-ref">{hasRef ? "true" : "false"}</span>
        <Video
          ref={(element) => {
            setHasRef(Boolean(element));
          }}
        />
      </div>
    );
  };

  const { getByTestId } = render(<RefHarness />);

  await waitFor(() => {
    expect(getByTestId("has-ref").textContent).toBe("true");
  });
});

test("handles mount/unmount churn and restores player state when remounted", async () => {
  const source = await createFixtureVideoUrl();
  const { getByTestId, rerender } = render(
    <HookHarness
      options={{ sources: [{ src: source, type: "video/webm" }] }}
      mounted={true}
    />,
  );

  await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("set"));

  rerender(
    <HookHarness
      options={{ sources: [{ src: source, type: "video/webm" }] }}
      mounted={false}
    />,
  );

  await waitFor(() => expect(getByTestId("ready").textContent).toBe("false"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("null"));

  rerender(
    <HookHarness
      options={{ sources: [{ src: source, type: "video/webm" }] }}
      mounted={true}
    />,
  );

  await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("set"));
});

test("restores disposed video node when container has no video", () => {
  const containerNode = document.createElement("div");
  const originalVideoNodeParent = document.createElement("div");
  const originalVideo = document.createElement("video");
  originalVideoNodeParent.appendChild(originalVideo);

  const videoNode = {
    current: null,
  } as React.MutableRefObject<HTMLVideoElement | null>;

  __private__.restoreDisposedVideoNode(
    containerNode,
    originalVideoNodeParent,
    videoNode,
  );

  expect(containerNode.querySelector("video")).toBeTruthy();
  expect(videoNode.current).toBe(containerNode.querySelector("video"));
});

test("does not restore disposed video node when container already has video", () => {
  const containerNode = document.createElement("div");
  const existingVideo = document.createElement("video");
  containerNode.appendChild(existingVideo);

  const originalVideoNodeParent = document.createElement("div");
  const originalVideo = document.createElement("video");
  originalVideoNodeParent.appendChild(originalVideo);

  const videoNode = {
    current: existingVideo,
  } as React.MutableRefObject<HTMLVideoElement | null>;

  __private__.restoreDisposedVideoNode(
    containerNode,
    originalVideoNodeParent,
    videoNode,
  );

  expect(containerNode.querySelectorAll("video")).toHaveLength(1);
  expect(videoNode.current).toBe(existingVideo);
});

test("skips ready callback when disposed", () => {
  const initializedPlayer = {} as React.MutableRefObject<unknown> as unknown;
  const playerRef = {
    current: initializedPlayer,
  } as React.MutableRefObject<unknown> as React.MutableRefObject<
    import("video.js").VideoJsPlayer | null
  >;

  expect(
    __private__.shouldSkipReadyCallback(
      true,
      playerRef,
      initializedPlayer as import("video.js").VideoJsPlayer,
    ),
  ).toBe(true);
});

test("does not skip ready callback for active current player", () => {
  const initializedPlayer = {} as import("video.js").VideoJsPlayer;
  const playerRef = {
    current: initializedPlayer,
  } as React.MutableRefObject<import("video.js").VideoJsPlayer | null>;

  expect(
    __private__.shouldSkipReadyCallback(false, playerRef, initializedPlayer),
  ).toBe(false);
});

test("skips ready callback for stale player instance", () => {
  const initializedPlayer = {} as import("video.js").VideoJsPlayer;
  const newerPlayer = {} as import("video.js").VideoJsPlayer;
  const playerRef = {
    current: newerPlayer,
  } as React.MutableRefObject<import("video.js").VideoJsPlayer | null>;

  expect(
    __private__.shouldSkipReadyCallback(false, playerRef, initializedPlayer),
  ).toBe(true);
});

test("does not invoke onReady for stale ready callback", () => {
  const initializedPlayer = {} as import("video.js").VideoJsPlayer;
  const newerPlayer = {} as import("video.js").VideoJsPlayer;
  const playerRef = {
    current: newerPlayer,
  } as React.MutableRefObject<import("video.js").VideoJsPlayer | null>;
  const onReady = vi.fn();

  __private__.callOnReadyForCurrentPlayer(
    false,
    playerRef,
    initializedPlayer,
    onReady,
  );

  expect(onReady).not.toHaveBeenCalled();
});

test("invokes onReady for current active player", () => {
  const initializedPlayer = {} as import("video.js").VideoJsPlayer;
  const playerRef = {
    current: initializedPlayer,
  } as React.MutableRefObject<import("video.js").VideoJsPlayer | null>;
  const onReady = vi.fn();

  __private__.callOnReadyForCurrentPlayer(
    false,
    playerRef,
    initializedPlayer,
    onReady,
  );

  expect(onReady).toHaveBeenCalledTimes(1);
  expect(onReady).toHaveBeenCalledWith(initializedPlayer);
});

test("uses connected ref video node when available", () => {
  const containerNode = document.createElement("div");
  const connectedRefVideo = document.createElement("video");
  containerNode.appendChild(connectedRefVideo);
  document.body.appendChild(containerNode);

  const videoNode = {
    current: connectedRefVideo,
  } as React.MutableRefObject<HTMLVideoElement | null>;

  expect(__private__.getCurrentVideoNode(containerNode, videoNode)).toBe(
    connectedRefVideo,
  );

  containerNode.remove();
});

test("falls back to container video node when ref video is detached", () => {
  const containerNode = document.createElement("div");
  const connectedContainerVideo = document.createElement("video");
  containerNode.appendChild(connectedContainerVideo);
  document.body.appendChild(containerNode);

  const detachedVideo = document.createElement("video");
  const videoNode = {
    current: detachedVideo,
  } as React.MutableRefObject<HTMLVideoElement | null>;

  expect(__private__.getCurrentVideoNode(containerNode, videoNode)).toBe(
    connectedContainerVideo,
  );

  containerNode.remove();
});

test("builds merged video className", () => {
  expect(__private__.getVideoClassName("hook-class", "prop-class")).toBe(
    "video-js hook-class prop-class",
  );
  expect(__private__.getVideoClassName("", undefined)).toBe("video-js");
});

test("updates internal and callback refs for video node", () => {
  const videoNode = {
    current: null,
  } as React.MutableRefObject<HTMLVideoElement | null>;
  const callbackRef = vi.fn();
  const element = document.createElement("video");

  __private__.setVideoNodeRef(videoNode, callbackRef, element);

  expect(videoNode.current).toBe(element);
  expect(callbackRef).toHaveBeenCalledTimes(1);
  expect(callbackRef).toHaveBeenCalledWith(element);
});

test("updates internal and object refs for video node", () => {
  const videoNode = {
    current: null,
  } as React.MutableRefObject<HTMLVideoElement | null>;
  const objectRef = {
    current: null,
  } as React.MutableRefObject<HTMLVideoElement | null>;
  const element = document.createElement("video");

  __private__.setVideoNodeRef(videoNode, objectRef, element);

  expect(videoNode.current).toBe(element);
  expect(objectRef.current).toBe(element);
});

test("updates internal ref when external ref is missing", () => {
  const videoNode = {
    current: null,
  } as React.MutableRefObject<HTMLVideoElement | null>;
  const element = document.createElement("video");

  __private__.setVideoNodeRef(videoNode, undefined, element);

  expect(videoNode.current).toBe(element);
});
