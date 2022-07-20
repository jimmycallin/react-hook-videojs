/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { test, expect } from "vitest";
import React from "react";
import { render, waitFor, renderHook, cleanup } from "@testing-library/react";
import { useVideoJS } from "./index.jsx";

import { afterEach } from "vitest";
import { VideoJsPlayerOptions } from "video.js";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window.HTMLMediaElement.prototype, "load", {
  configurable: true,
  get() {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return (): void => {};
  },
});

Object.defineProperty(window.HTMLMediaElement.prototype, "canPlayType", {
  configurable: true,
  get() {
    return (): string => "maybe";
  },
});

const App = ({
  options,
  mounted = true,
}: {
  options: VideoJsPlayerOptions;
  mounted: boolean;
}): JSX.Element => {
  const { Video, ready } = useVideoJS(options);
  return (
    <div>
      {ready ? "Ready: true" : "Ready: false"}
      {mounted ? <Video /> : null}
    </div>
  );
};

test("can reinitialize video player with new url", async () => {
  const videoJsOptions = {
    sources: [{ src: "http://example.com/oceans.mp4" }],
  };
  const { getByText, getByTitle, getByRole, rerender } = render(
    <App options={videoJsOptions} />
  );

  await waitFor(() => getByText("Ready: true"));
  expect(getByTitle("Play Video"));
  expect(getByText("Ready: true"));

  const videoElements = getByRole(
    "region",
    "Video Player"
  ).getElementsByTagName("video");
  expect(videoElements.length).toBe(1);
  const videoElement = videoElements[0];

  await waitFor(() => {
    expect(videoElement.getAttribute("src")).toEqual(
      "http://example.com/oceans.mp4"
    );
  });
  rerender(
    <App options={{ sources: [{ src: "http://example.com/waves.mp4" }] }} />
  );
  const videoElementsAfterRerender = getByRole(
    "region",
    "Video Player"
  ).getElementsByTagName("video");
  await waitFor(() => {
    expect(videoElementsAfterRerender.length).toBe(1);
  });
  const videoElementAfterRerender = videoElementsAfterRerender[0];
  await waitFor(() => {
    expect(videoElementAfterRerender.getAttribute("src")).toEqual(
      "http://example.com/waves.mp4"
    );
  });
});

test("loads and displays a video", async () => {
  const videoJsOptions = {
    sources: [{ src: "http://example.com/oceans.mp4" }],
  };
  const { getByText, getByTitle, getByRole, unmount } = render(
    <App options={videoJsOptions} />
  );

  await waitFor(() => getByText("Ready: true"));
  expect(getByTitle("Play Video"));
  expect(getByText("Ready: true"));

  const videoElement = getByRole("region", "Video Player").getElementsByTagName(
    "video"
  )[0];

  await waitFor(() => {
    expect(videoElement.getAttribute("src")).toEqual(
      "http://example.com/oceans.mp4"
    );
  });

  // unmounting should remove all video elements that video.js have created

  unmount();
  expect(document.body.innerHTML).toEqual("<div></div>");
});

test("unmounting video should remove all videojs DOM nodes", async () => {
  const videoJsOptions = {
    sources: [{ src: "http://example.com/oceans.mp4" }],
  };
  const { getByText, getByTitle, getByRole, rerender } = render(
    <App options={videoJsOptions} />
  );

  await waitFor(() => getByText("Ready: true"));
  expect(getByTitle("Play Video"));
  expect(getByText("Ready: true"));

  const videoElement = getByRole("region", "Video Player").getElementsByTagName(
    "video"
  )[0];

  await waitFor(() => {
    expect(videoElement.getAttribute("src")).toEqual(
      "http://example.com/oceans.mp4"
    );
  });

  // removing video.js player should remove all video elements that video.js have created

  rerender(<App options={videoJsOptions} mounted={false} />);
  expect(document.body.innerHTML).toEqual("<div><div>Ready: false</div></div>");
});

test("useVideoJs initialization without rendering <Video/>", async () => {
  const videoJsOptions = {
    sources: [{ src: "example.com/oceans.mp4" }],
  };
  const { result } = renderHook(() => useVideoJS(videoJsOptions));
  expect(result.current).toEqual({
    Video: expect.any(Function),
    player: null,
    ready: false,
  });

  // Since we don't render the Video dom, we never expect the player to be initialized
  await expect(
    waitFor(() => expect(result.current.player).not.toEqual(null))
  ).rejects.toThrow(Error);
});

test("useVideoJs initialization with rendering <Video/>", async () => {
  const videoJsOptions = {
    sources: [{ src: "http://example.com/oceans.mp4", controls: false }],
  };
  const { result, rerender } = renderHook((props) => useVideoJS(props), {
    initialProps: videoJsOptions,
  });
  expect(result.current).toEqual({
    Video: expect.any(Function),
    player: null,
    ready: false,
  });
  const Video = result.current.Video;
  const { getByRole } = render(<Video />);
  await waitFor(() => expect(result.current.player).not.toEqual(null));
  expect(result.current).toEqual({
    Video: expect.any(Function),
    player: expect.any(Object),
    ready: true,
  });

  const videoElement = getByRole("region", "Video Player").getElementsByTagName(
    "video"
  )[0];

  expect(videoElement.getAttribute("src")).toEqual(
    "http://example.com/oceans.mp4"
  );

  rerender({
    sources: [{ src: "http://example.com/waves.mp4", controls: false }],
  });
});
