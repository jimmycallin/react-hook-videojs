import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { useVideoJS } from "./index";

const consoleError = console.error;
console.error = (...err): void => {
  if (err[2] === "(CODE:4 MEDIA_ERR_SRC_NOT_SUPPORTED)") {
    // ignore error related to video file not supported by jsdom
  } else {
    consoleError(...err);
  }
};

const App = (): JSX.Element => {
  const videoJsOptions = {
    sources: [{ src: "example.com/oceans.mp4" }],
  };
  const { Video, ready, player } = useVideoJS(videoJsOptions);
  return (
    <div>
      <div>{ready ? "Ready: true" : "Ready: false"}</div>
      <div>
        {typeof player === "object" && player !== null
          ? "player is object"
          : "player is NOT object but should be"}
      </div>
      <Video />
    </div>
  );
};

test("loads and displays a video", async () => {
  render(<App />);

  await waitFor(() => screen.getByText("Ready: true"));
  expect(screen.getByTitle("Play Video"));
  expect(screen.getByText("Ready: true"));
  expect(screen.getByText("player is object"));
});
