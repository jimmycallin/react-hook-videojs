/* eslint-disable react/prop-types */
import React, { useRef, useState, useEffect, useCallback } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
export const useVideoJS = (videoJsOptions, classNames = "") => {
  const [ready, setReady] = useState(false);
  const changedKey = JSON.stringify(videoJsOptions);
  const videoNode = useRef(null);
  const player = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    () => {
      if (player.current) {
        player.current.dispose();
        player.current = null;
      }
    };
  }, []);

  const Video = useCallback(
    ({ children, ...props }) => {
      useEffect(() => {
        if (videoNode.current && containerRef.current) {
          if (!containerRef.current.contains(videoNode.current.parentNode)) {
            containerRef.current.appendChild(videoNode.current.parentNode);
          }

          player.current = videojs(videoNode.current, videoJsOptions);
          player.current.ready(() => {
            setReady(true);
          });
        }
        return () => {
          if (player.current) {
            setReady(false);
            player.current.reset();
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
    },
    [classNames, changedKey]
  );
  return { Video, ready, player: player.current };
};
