/* eslint-disable react/prop-types */
import React, { useRef, useState, useLayoutEffect } from "react";
import { forwardRef } from "react";
import videojs from "video.js";

const VideoJsWrapper = React.memo(
  forwardRef(
    (
      { children, videoJsOptions, onReady, onDispose, classNames, ...props },
      player
    ) => {
      const videoNode = useRef(null);
      const containerRef = useRef(null);
      const changedKey = JSON.stringify(videoJsOptions);

      const mounted = useRef(true);

      useLayoutEffect(() => {
        mounted.current = true;
        const before = videoNode.current.parentNode.cloneNode(true);
        if (!player.current) {
          player.current = videojs(videoNode.current, videoJsOptions);
          player.current.ready(() => {
            onReady();
          });
        }

        return () => {
          mounted.current = false;
          if (player.current) {
            player.current.dispose();

            if (
              videoNode.current.parentNode &&
              !containerRef.current.contains(videoNode.current.parentNode)
            ) {
              // issue is that this adds old nodes as well, and we need to clean them up first?
              containerRef.current.appendChild(before);
              videoNode.current = before.firstChild;
            }
            player.current = null;
            // onDispose();
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
  )
);

VideoJsWrapper.displayName = "VideoJsWrapper";

export const useVideoJS = (videoJsOptions, classNames = "") => {
  const [ready, setReady] = useState(false);

  const player = useRef(null);

  const Video = ({ children, ...props }) => {
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
  };

  return { Video, ready, player: player.current };
};
