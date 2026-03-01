import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import sample from "./sample.vtt?url";
import "video.js/dist/video-js.css";
import { useVideoJS } from "react-hook-videojs";

const SOURCES = {
  oceans: "//vjs.zencdn.net/v/oceans.mp4",
  elephantDream:
    "//commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  bigBuckBunny:
    "//commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
};

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const MAX_LOG_ENTRIES = 30;

const formatTime = (seconds) => {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

const App = () => {
  // ── options state ─────────────────────────────────────────────────────────
  const [sourceKey, setSourceKey] = useState("oceans");
  const [customSource, setCustomSource] = useState("");
  const [showVtt, setShowVtt] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  // ── player state ──────────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");

  // ── event log ─────────────────────────────────────────────────────────────
  const [eventLog, setEventLog] = useState([]);
  const logEvent = useCallback((name) => {
    setEventLog((prev) => {
      const entry = {
        id: Date.now() + Math.random(),
        name,
        time: new Date().toLocaleTimeString(),
      };
      return [entry, ...prev].slice(0, MAX_LOG_ENTRIES);
    });
  }, []);

  // ── video.js options ──────────────────────────────────────────────────────
  const activeSource = customSource || SOURCES[sourceKey];
  const videoJsOptions = useMemo(
    () => ({
      sources: [{ src: activeSource }],
      controls: showControls,
      autoplay,
      loop,
      muted,
      playbackRates: PLAYBACK_RATES,
    }),
    [activeSource, showControls, autoplay, loop, muted],
  );

  const { Video, ready, player } = useVideoJS(videoJsOptions, "demo-player");

  // ── event listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!player) return;

    const onPlay = () => {
      logEvent("play");
      setIsPaused(false);
    };
    const onPause = () => {
      logEvent("pause");
      setIsPaused(true);
    };
    const onEnded = () => {
      logEvent("ended");
      setIsPaused(true);
    };
    const onTimeUpdate = () => setCurrentTime(player.currentTime() || 0);
    const onDurationChange = () => setDuration(player.duration() || 0);
    const onWaiting = () => {
      logEvent("buffering");
      setIsBuffering(true);
    };
    const onCanPlay = () => setIsBuffering(false);
    const onError = () => {
      const err = player.error();
      const msg = err ? `error ${err.code}` : "error";
      logEvent(msg);
      setErrorMessage(err ? `${err.message}` : "Unknown error");
    };
    const onVolumeChange = () => {
      setVolume(player.muted() ? 0 : player.volume());
      logEvent("volumechange");
    };
    const onRateChange = () => {
      const rate = player.playbackRate();
      setPlaybackRate(rate);
      logEvent(`rate → ${rate}x`);
    };
    const onFullscreenChange = () =>
      logEvent(player.isFullscreen() ? "fullscreen on" : "fullscreen off");
    const onSeeking = () => logEvent("seeking");
    const onSeeked = () => logEvent("seeked");

    player.on("play", onPlay);
    player.on("pause", onPause);
    player.on("ended", onEnded);
    player.on("timeupdate", onTimeUpdate);
    player.on("durationchange", onDurationChange);
    player.on("waiting", onWaiting);
    player.on("canplay", onCanPlay);
    player.on("error", onError);
    player.on("volumechange", onVolumeChange);
    player.on("ratechange", onRateChange);
    player.on("fullscreenchange", onFullscreenChange);
    player.on("seeking", onSeeking);
    player.on("seeked", onSeeked);

    return () => {
      if (!player.isDisposed()) {
        player.off("play", onPlay);
        player.off("pause", onPause);
        player.off("ended", onEnded);
        player.off("timeupdate", onTimeUpdate);
        player.off("durationchange", onDurationChange);
        player.off("waiting", onWaiting);
        player.off("canplay", onCanPlay);
        player.off("error", onError);
        player.off("volumechange", onVolumeChange);
        player.off("ratechange", onRateChange);
        player.off("fullscreenchange", onFullscreenChange);
        player.off("seeking", onSeeking);
        player.off("seeked", onSeeked);
      }
      setCurrentTime(0);
      setDuration(0);
      setIsPaused(true);
      setIsBuffering(false);
      setErrorMessage("");
    };
  }, [player, logEvent]);

  // ── imperative controls ───────────────────────────────────────────────────
  const handlePlayPause = () => {
    if (!player) return;
    if (player.paused()) {
      player.play();
    } else {
      player.pause();
    }
  };

  const handleSeek = (e) => {
    if (!player || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    player.currentTime(((e.clientX - rect.left) / rect.width) * duration);
  };

  const handleVolumeChange = (e) => {
    if (!player) return;
    const val = Number(e.target.value);
    player.volume(val);
    player.muted(val === 0);
  };

  const handleRateChange = (e) => {
    if (!player) return;
    player.playbackRate(Number(e.target.value));
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="app">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="app-header">
        <span className="app-title">react-hook-videojs</span>
        <span className="app-subtitle">
          <code>useVideoJS</code> demo
        </span>
      </header>

      <div className="app-body">
        {/* ── Left: Player ─────────────────────────────────────────────── */}
        <div className="panel panel--player">
          <div className="player-wrap">
            {isMounted ? (
              <Video>
                {showVtt && (
                  <track
                    kind="captions"
                    src={sample}
                    srcLang="en"
                    label="English"
                    default
                  />
                )}
              </Video>
            ) : (
              <div className="player-placeholder">Player unmounted</div>
            )}
          </div>

          {/* Progress */}
          <div
            className="progress"
            onClick={handleSeek}
            style={{ cursor: duration > 0 ? "pointer" : "default" }}
          >
            <div
              className="progress-bar"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="time-row">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Badges */}
          <div className="badge-row">
            <span className={`badge ${ready ? "badge--green" : "badge--gray"}`}>
              {ready ? "ready" : "not ready"}
            </span>
            <span
              className={`badge ${isPaused ? "badge--gray" : "badge--green"}`}
            >
              {isPaused ? "paused" : "playing"}
            </span>
            {isBuffering && (
              <span className="badge badge--yellow">buffering</span>
            )}
            {errorMessage && (
              <span className="badge badge--red" title={errorMessage}>
                error
              </span>
            )}
          </div>

          {/* Buttons */}
          <div className="btn-row">
            <button className="btn" onClick={handlePlayPause} disabled={!ready}>
              {isPaused ? "▶ Play" : "⏸ Pause"}
            </button>
            <button
              className="btn"
              onClick={() => player?.requestFullscreen()}
              disabled={!ready}
            >
              ⛶ Fullscreen
            </button>
          </div>
        </div>

        {/* ── Right: Controls ───────────────────────────────────────────── */}
        <div className="panel panel--controls">
          {/* Source */}
          <div className="ctrl-group">
            <div className="ctrl-label">Source</div>
            <div className="ctrl-row">
              <select
                className="ctrl-select"
                value={customSource ? "__custom__" : sourceKey}
                onChange={(e) => {
                  if (e.target.value === "__custom__") return;
                  setCustomSource("");
                  setSourceKey(e.target.value);
                }}
              >
                <option value="oceans">Oceans</option>
                <option value="elephantDream">Elephant Dream</option>
                <option value="bigBuckBunny">Big Buck Bunny</option>
                {customSource && <option value="__custom__">Custom</option>}
              </select>
            </div>
            <input
              className="ctrl-input"
              type="url"
              placeholder="or paste a custom URL…"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
            />
          </div>

          {/* Options checkboxes */}
          <div className="ctrl-group">
            <div className="ctrl-label">Options</div>
            <div className="check-grid">
              <label className="check">
                <input
                  type="checkbox"
                  checked={showControls}
                  onChange={(e) => setShowControls(e.target.checked)}
                />
                Controls
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                />
                Autoplay
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                />
                Loop
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={muted}
                  onChange={(e) => setMuted(e.target.checked)}
                />
                Muted
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={showVtt}
                  onChange={(e) => setShowVtt(e.target.checked)}
                />
                Captions
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={isMounted}
                  onChange={(e) => setIsMounted(e.target.checked)}
                />
                Mounted
              </label>
            </div>
          </div>

          {/* Volume */}
          <div className="ctrl-group">
            <div className="ctrl-label">
              Volume{" "}
              <span className="ctrl-value">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              className="ctrl-range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolumeChange}
              disabled={!ready}
            />
          </div>

          {/* Playback speed */}
          <div className="ctrl-group">
            <div className="ctrl-label">Speed</div>
            <div className="ctrl-row">
              <select
                className="ctrl-select"
                value={playbackRate}
                onChange={handleRateChange}
                disabled={!ready}
              >
                {PLAYBACK_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}x
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* State */}
          <div className="ctrl-group ctrl-group--grow">
            <div className="ctrl-label">
              State
              <span className="ctrl-hint"> · from useVideoJS + events</span>
            </div>
            <table className="state-table">
              <tbody>
                <tr>
                  <th>ready</th>
                  <td>{String(ready)}</td>
                </tr>
                <tr>
                  <th>player</th>
                  <td>{player ? "instance" : "null"}</td>
                </tr>
                <tr>
                  <th>currentTime</th>
                  <td>{formatTime(currentTime)}</td>
                </tr>
                <tr>
                  <th>duration</th>
                  <td>{formatTime(duration)}</td>
                </tr>
                <tr>
                  <th>paused</th>
                  <td>{String(isPaused)}</td>
                </tr>
                <tr>
                  <th>volume</th>
                  <td>{Math.round(volume * 100)}%</td>
                </tr>
                <tr>
                  <th>rate</th>
                  <td>{playbackRate}x</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Event log */}
          <div className="ctrl-group ctrl-group--log">
            <div className="ctrl-label">
              Events
              <button
                className="log-clear"
                onClick={() => setEventLog([])}
                disabled={eventLog.length === 0}
              >
                clear
              </button>
            </div>
            <ol className="event-log">
              {eventLog.length === 0 ? (
                <li className="event-log__empty">
                  play the video to see events
                </li>
              ) : (
                eventLog.map((entry) => (
                  <li key={entry.id} className="event-log__entry">
                    <span className="event-log__time">{entry.time}</span>
                    <span className="event-log__name">{entry.name}</span>
                  </li>
                ))
              )}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
