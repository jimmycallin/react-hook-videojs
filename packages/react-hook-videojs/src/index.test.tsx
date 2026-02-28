import React, { useLayoutEffect } from "react";
import { afterEach, expect, test } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { useVideoJS } from "./index";

type VideoJsOptions = {
  sources?: Array<{ src: string; type?: string }>;
  controls?: boolean;
  autoplay?: boolean;
};

const createdObjectUrls: string[] = [];

const createBlobVideoUrl = (): string => {
  const videoBlob = new Blob([new Uint8Array([0, 0, 0, 0])], {
    type: "video/mp4",
  });
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
  const source = createBlobVideoUrl();
  const { getByTestId, container } = render(
    <HookHarness options={{ sources: [{ src: source, type: "video/mp4" }] }} />,
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

test("attempts media loading in browser and surfaces native media error state", async () => {
  const source = createBlobVideoUrl();
  const { container } = render(
    <HookHarness options={{ sources: [{ src: source, type: "video/mp4" }] }} />,
  );
  const videoElement = container.querySelector("video");
  expect(videoElement).toBeTruthy();

  await waitFor(() => {
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain("blob:");
    expect(videoElement?.error).not.toBeNull();
  });
});

test("reinitializes player and swaps the media source when options change", async () => {
  const firstSource = createBlobVideoUrl();
  const secondSource = createBlobVideoUrl();

  const { rerender, container } = render(
    <HookHarness
      options={{ sources: [{ src: firstSource, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(firstSource);
  });

  rerender(
    <HookHarness
      options={{ sources: [{ src: secondSource, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(secondSource);
  });
});

test("recovers when ref points to a detached video but container still has a connected video", async () => {
  const firstSource = createBlobVideoUrl();
  const secondSource = createBlobVideoUrl();
  const { rerender, container } = render(
    <HookHarness
      options={{ sources: [{ src: firstSource, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(firstSource);
  });

  const originalVideoWrapper = container.querySelector("[data-vjs-player]");
  expect(originalVideoWrapper).toBeTruthy();
  const wrapperParent = originalVideoWrapper?.parentNode;
  expect(wrapperParent).toBeTruthy();

  const replacementVideoWrapper = originalVideoWrapper?.cloneNode(true);
  if (wrapperParent && originalVideoWrapper && replacementVideoWrapper) {
    wrapperParent.replaceChild(replacementVideoWrapper, originalVideoWrapper);
  }

  rerender(
    <HookHarness
      options={{ sources: [{ src: secondSource, type: "video/mp4" }] }}
    />,
  );

  await waitFor(() => {
    const videoElement = container.querySelector("video");
    const currentSource = videoElement?.currentSrc || videoElement?.src || "";
    expect(currentSource).toContain(secondSource);
  });
});

test("skips initialization when the rendered video gets detached before effect runs", async () => {
  const source = createBlobVideoUrl();

  const DetachedBeforeEffectHarness = (): React.JSX.Element => {
    const { Video, ready, player } = useVideoJS({
      sources: [{ src: source, type: "video/mp4" }],
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
  const source = createBlobVideoUrl();
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
