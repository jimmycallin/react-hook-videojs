import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { __private__, useVideoJS } from "./index";
import fixtureUrl from "./fixture.mp4?url";
import fixture2Url from "./fixture2.mp4?url";

type VideoJsOptions = {
  sources?: Array<{ src: string; type?: string }>;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  playsinline?: boolean;
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
});

test("initializes in browser and attaches a playable media source", async () => {
  const { getByTestId, container } = render(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("set"));

  const videoElement = container.querySelector("video");
  expect(videoElement).toBeTruthy();
  expect(videoElement?.tagName).toBe("VIDEO");

  await waitFor(() => {
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("fixture");
  });
});

test("loads local fixture media without native media error", async () => {
  const { container } = render(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
    />,
  );
  const videoElement = container.querySelector("video");
  expect(videoElement).toBeTruthy();

  await waitFor(() => {
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("fixture");
  });

  await waitFor(() => {
    expect(videoElement?.error).toBeNull();
    expect(videoElement?.readyState ?? 0).toBeGreaterThan(0);
  });
});

// Headless Firefox and WebKit block autoplay even for muted video; skip on those browsers.
// Chromium is identified by its userAgent containing "Chrome".
const isChromium =
  typeof navigator !== "undefined" && /Chrome/.test(navigator.userAgent);
test.skipIf(!isChromium)(
  "autoplay starts playback and advances media time",
  async () => {
    const { container } = render(
      <HookHarness
        options={{
          autoplay: true,
          muted: true,
          playsinline: true,
          sources: [{ src: fixtureUrl, type: "video/mp4" }],
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
  },
);

test("reinitializes player and swaps the media source when options change", async () => {
  const { rerender, container } = render(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("fixture.mp4");
  });

  rerender(
    <HookHarness
      options={{ sources: [{ src: fixture2Url, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("fixture2.mp4");
  });
});

test("recovers when ref points to detached video but container has a connected video", async () => {
  const { rerender, container } = render(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("fixture.mp4");
  });

  const currentVideo = container.querySelector("video");
  const videoParent = currentVideo?.parentNode;
  const replacementVideo = currentVideo?.cloneNode(true);
  if (videoParent && currentVideo && replacementVideo) {
    videoParent.replaceChild(replacementVideo, currentVideo);
  }

  rerender(
    <HookHarness
      options={{ sources: [{ src: fixture2Url, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("fixture2.mp4");
  });
});

test("stays stable under StrictMode mount/unmount lifecycle", async () => {
  const { container, getByTestId } = render(
    <React.StrictMode>
      <HookHarness
        options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
      />
    </React.StrictMode>,
  );

  await waitFor(() => expect(container.querySelector("video")).toBeTruthy());
  await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("set"));
  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("fixture");
  });
});

test("handles rapid options churn and keeps latest media source", async () => {
  const { rerender, container } = render(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
    />,
  );

  rerender(
    <HookHarness
      options={{ sources: [{ src: fixture2Url, type: "video/mp4" }] }}
    />,
  );
  rerender(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("fixture.mp4");
  });
});

test("does not recreate player repeatedly when options stay the same", async () => {
  const seenPlayers = new Set<unknown>();

  const StableRerenderHarness = (): React.JSX.Element => {
    const [tick, setTick] = useState(0);
    const options = useMemo(
      () => ({ sources: [{ src: fixtureUrl, type: "video/mp4" }] }),
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
  const DetachedBeforeEffectHarness = (): React.JSX.Element => {
    const { Video, ready, player } = useVideoJS({
      sources: [{ src: fixtureUrl, type: "video/mp4" }],
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
  const { getByTestId } = render(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl }] }}
      mounted={false}
    />,
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
  const RefHarness = (): React.JSX.Element => {
    const [hasRef, setHasRef] = useState(false);
    const { Video } = useVideoJS({
      sources: [{ src: fixtureUrl, type: "video/mp4" }],
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
  const { getByTestId, rerender } = render(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
      mounted={true}
    />,
  );

  await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("set"));

  rerender(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
      mounted={false}
    />,
  );

  await waitFor(() => expect(getByTestId("ready").textContent).toBe("false"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("null"));

  rerender(
    <HookHarness
      options={{ sources: [{ src: fixtureUrl, type: "video/mp4" }] }}
      mounted={true}
    />,
  );

  await waitFor(() => expect(getByTestId("ready").textContent).toBe("true"));
  await waitFor(() => expect(getByTestId("player").textContent).toBe("set"));
});

test("restores disposed video node when container has no video", () => {
  const containerNode = document.createElement("div");
  const originalVideo = document.createElement("video");

  const videoNode = {
    current: null,
  } as React.MutableRefObject<HTMLVideoElement | null>;

  __private__.restoreDisposedVideoNode(containerNode, originalVideo, videoNode);

  expect(containerNode.querySelector("video")).toBeTruthy();
  expect(videoNode.current).toBe(containerNode.querySelector("video"));
});

test("does not restore disposed video node when container already has video", () => {
  const containerNode = document.createElement("div");
  const existingVideo = document.createElement("video");
  containerNode.appendChild(existingVideo);

  const originalVideo = document.createElement("video");

  const videoNode = {
    current: existingVideo,
  } as React.MutableRefObject<HTMLVideoElement | null>;

  __private__.restoreDisposedVideoNode(containerNode, originalVideo, videoNode);

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

test("forwards html attributes to the video element", () => {
  const AttrHarness = (): React.JSX.Element => {
    const { Video } = useVideoJS({ sources: [] });
    return <Video data-testid="my-video" aria-label="test player" />;
  };
  const { container } = render(<AttrHarness />);
  const video = container.querySelector("video");
  expect(video?.getAttribute("data-testid")).toBe("my-video");
  expect(video?.getAttribute("aria-label")).toBe("test player");
});

test("forwards playsInline to the video element", () => {
  const AttrHarness = (): React.JSX.Element => {
    const { Video } = useVideoJS({ sources: [] });
    return <Video playsInline />;
  };
  const { container } = render(<AttrHarness />);
  expect(container.querySelector("video")?.hasAttribute("playsinline")).toBe(
    true,
  );
});

test("merges hook classNames with Video className prop", () => {
  const AttrHarness = (): React.JSX.Element => {
    const { Video } = useVideoJS({ sources: [] }, "hook-class");
    return <Video className="user-class" />;
  };
  const { container } = render(<AttrHarness />);
  // After Video.js initialises, it takes the <video> element and uses it as the
  // player root — adding its own vjs-* classes while keeping ours.  The native
  // <video> gets class="vjs-tech", so we query the player root (.video-js) instead.
  const playerEl = container.querySelector(".video-js");
  expect(playerEl?.classList.contains("video-js")).toBe(true);
  expect(playerEl?.classList.contains("hook-class")).toBe(true);
  expect(playerEl?.classList.contains("user-class")).toBe(true);
});

test("track children are registered as video.js text tracks", async () => {
  const TrackHarness = (): React.JSX.Element => {
    const { Video, player } = useVideoJS({ sources: [] });
    // Video.js reads <track> elements during init and removes them from the DOM.
    // They are accessible via the remoteTextTracks() API.
    const remoteTracks = player ? player.remoteTextTracks() : null;
    const kinds = remoteTracks
      ? [remoteTracks[0]?.kind ?? "", remoteTracks[1]?.kind ?? ""].join(",")
      : "";
    return (
      <div>
        <span data-testid="track-kinds">{kinds}</span>
        <Video>
          <track
            kind="captions"
            src="/captions.vtt"
            srcLang="en"
            label="English"
          />
          <track kind="subtitles" src="/subs.vtt" srcLang="fr" label="French" />
        </Video>
      </div>
    );
  };

  const { getByTestId } = render(<TrackHarness />);

  await waitFor(() => {
    const kinds = getByTestId("track-kinds").textContent ?? "";
    expect(kinds).toContain("captions");
    expect(kinds).toContain("subtitles");
  });
});
