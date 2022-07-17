/* eslint-disable react/prop-types */
import React, { useRef, useState, useCallback, useLayoutEffect } from "react";
import { forwardRef } from "react";
import videojs from "video.js";

const VideoJsWrapper = forwardRef(
  (
    { children, videoJsOptions, onReady, onDispose, classNames, ...props },
    player
  ) => {
    const videoJsOptionsCloned = JSON.parse(JSON.stringify(videoJsOptions));
    const videoNode = useRef(null);
    const containerRef = useRef(null);
    const changedKey = JSON.stringify(videoJsOptionsCloned);

    useLayoutEffect(() => {
      if (!videoNode.current.parentNode) return;
      const before = videoNode.current.parentNode.cloneNode(true);
      if (!player.current) {
        player.current = videojs(videoNode.current, videoJsOptionsCloned);
        player.current.ready(() => {
          onReady();
        });
      }

      return () => {
        if (player.current) {
          player.current.dispose();

          if (
            videoNode.current.parentNode &&
            !containerRef.current.contains(videoNode.current.parentNode)
          ) {
            containerRef.current.appendChild(before);
            videoNode.current = before.firstChild;
          }
          player.current = null;
          onDispose();
        }
      };
    }, [changedKey]);

    return (
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

export const useVideoJS = (videoJsOptions, classNames = "") => {
  const [ready, setReady] = useState(false);

  const player = useRef(null);

  const Video = useCallback(
    ({ children, ...props }) => {
      return (
        <VideoJsWrapper
          ref={player}
          videoJsOptions={videoJsOptions}
          classNames={classNames}
          onReady={() => setReady(true)}
          onDispose={() => setReady(false)}
          {...props}
        >
          {children}
        </VideoJsWrapper>
      );
    },
    [JSON.stringify(videoJsOptions), classNames]
  );

  return { Video, ready, player: player.current };
};
