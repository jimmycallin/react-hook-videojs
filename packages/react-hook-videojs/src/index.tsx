import React from 'react';
import videojs, { VideoJsPlayer } from 'video.js';
import 'video.js/dist/video-js.css';

export type VideoJSProps = {
  options: videojs.PlayerOptions;
  onReady?: (player: VideoJsPlayer) => void;
  children?: React.ReactNode;
}

export const VideoJS: React.FC<VideoJSProps> = (props) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const playerRef = React.useRef<VideoJsPlayer | null>(null);
  const {options, onReady, children} = props;

  // this useEffect() order must be first
  React.useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  // this useEffect() order must be second to work with React 18
  React.useEffect(() => {

    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = videoRef.current;

      if (!videoElement) return;

      const player = playerRef.current = videojs(videoElement, options, () => {
        onReady && onReady(player);
      });
    }
  }, [options, videoRef]);

  return (
    <div data-vjs-player>
      <video ref={videoRef} className='video-js vjs-big-play-centered'>
        {children}
      </video>
    </div>
  );
}

export default VideoJS;
