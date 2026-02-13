import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
// import "./VideoPlayer.css";

const VideoPlayer = ({
  src = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  autoPlay = false,
  muted = false,
  loop = false,
  poster = "",
  onReady,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onError,
  className = "",
  width = "100%",
  height = "auto",
  showControls = true,
  showQualitySelector = true,
  showPlaybackSpeed = true,
  showPictureInPicture = true,
  enableKeyboardShortcuts = true,
  persistKey = "video-player", // Unique key for localStorage
  persistInterval = 5, // Save progress every 5 seconds
  resumeThreshold = 5, // Show resume dialog if progress > 5 seconds
  puzzles = [
    {
      time: 20, // seconds
      question: "What is React?",
      options: ["Library", "Framework"],
      correctAnswer: 0,
    },
  ],
  onPuzzleComplete,
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const persistTimerRef = useRef(null);

  // State management
  const [puzzleState, setPuzzleState] = useState(() => {
    const initialState = {};
    puzzles.forEach((puzzle, index) => {
      initialState[index] = {
        attempts: 0,
        solved: false,
        timeToSolve: null,
      };
    });
    return initialState;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem(`${persistKey}-volume`);
    return saved ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem(`${persistKey}-muted`);
    return saved ? saved === "true" : false;
  });
  const [playbackRate, setPlaybackRate] = useState(() => {
    const saved = localStorage.getItem(`${persistKey}-playbackRate`);
    return saved ? parseFloat(saved) : 1;
  });
  const [currentQuality, setCurrentQuality] = useState(() => {
    const saved = localStorage.getItem(`${persistKey}-quality`);
    return saved ? parseInt(saved) : -1;
  });
  const [availableQualities, setAvailableQualities] = useState([]);
  const [buffered, setBuffered] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(0);

  const [activePuzzleIndex, setActivePuzzleIndex] = useState(null);
  const puzzleStartTimeRef = useRef(null);

  // Generate unique storage keys based on video src
  const getStorageKeys = useCallback(() => {
    const videoId = src.split("/").pop() || "default";
    return {
      time: `${persistKey}-${videoId}-time`,
      volume: `${persistKey}-volume`,
      muted: `${persistKey}-muted`,
      playbackRate: `${persistKey}-playbackRate`,
      quality: `${persistKey}-quality`,
    };
  }, [src, persistKey]);

  // Load saved preferences
  useEffect(() => {
    const keys = getStorageKeys();

    // Load saved playback position
    const savedTime = localStorage.getItem(keys.time);
    if (savedTime) {
      const parsedTime = parseFloat(savedTime);
      const savedDuration = localStorage.getItem(`${keys.time}-duration`);

      // Only show resume dialog if video was watched recently (last 30 days)
      const savedTimestamp = localStorage.getItem(`${keys.time}-timestamp`);
      const isRecent =
        savedTimestamp &&
        Date.now() - parseInt(savedTimestamp) < 30 * 24 * 60 * 60 * 1000;

      if (parsedTime > resumeThreshold && isRecent) {
        setSavedProgress({
          time: parsedTime,
          duration: savedDuration ? parseFloat(savedDuration) : 0,
          percentage: savedDuration
            ? (parsedTime / parseFloat(savedDuration)) * 100
            : 0,
          timestamp: savedTimestamp,
        });
        setShowResumeDialog(true);
      }
    }
  }, [getStorageKeys, resumeThreshold]);

  // Save progress periodically
  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !duration || video.currentTime <= 0) return;

    const keys = getStorageKeys();
    const currentVideoTime = video.currentTime;

    // Only save if progress has changed significantly
    if (Math.abs(currentVideoTime - lastSavedTime) > persistInterval) {
      localStorage.setItem(keys.time, currentVideoTime.toString());
      localStorage.setItem(`${keys.time}-duration`, duration.toString());
      localStorage.setItem(`${keys.time}-timestamp`, Date.now().toString());
      setLastSavedTime(currentVideoTime);
    }
  }, [duration, getStorageKeys, persistInterval, lastSavedTime]);

  // Save user preferences
  useEffect(() => {
    const keys = getStorageKeys();
    localStorage.setItem(keys.volume, volume.toString());
    localStorage.setItem(keys.muted, isMuted.toString());
    localStorage.setItem(keys.playbackRate, playbackRate.toString());
    if (currentQuality !== -1) {
      localStorage.setItem(keys.quality, currentQuality.toString());
    }
  }, [volume, isMuted, playbackRate, currentQuality, getStorageKeys]);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsLoading(true);
    setError(null);

    // Set initial volume/muted state from localStorage
    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackRate;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const qualities = data.levels.map((level, index) => ({
          index,
          height: level.height,
          width: level.width,
          bitrate: level.bitrate,
          name: `${level.height}p (${Math.round(level.bitrate / 1000)}kbps)`,
        }));
        setAvailableQualities(qualities);
        setIsLoading(false);

        // Set saved quality preference
        if (currentQuality !== -1 && qualities[currentQuality]) {
          hls.currentLevel = currentQuality;
        }

        if (onReady) onReady({ video, hls, qualities });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError(`HLS Error: ${data.type} - ${data.details}`);
          if (onError) onError(data);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      // Clear persist timer
      if (persistTimerRef.current) {
        clearInterval(persistTimerRef.current);
      }
    };
  }, [src, onReady, onError, currentQuality, volume, isMuted, playbackRate]);

  // Set up progress persistence
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Save progress periodically
    persistTimerRef.current = setInterval(saveProgress, persistInterval * 1000);

    // Save progress on page unload
    const handleBeforeUnload = () => {
      saveProgress();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(persistTimerRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Final save on unmount
      saveProgress();
    };
  }, [saveProgress, persistInterval]);

  // Resume from saved position
  const handleResume = useCallback(() => {
    if (videoRef.current && savedProgress) {
      videoRef.current.currentTime = savedProgress.time;
      setCurrentTime(savedProgress.time);
      setShowResumeDialog(false);

      // Auto-play if previously playing
      if (autoPlay) {
        videoRef.current.play().catch(console.error);
      }
    }
  }, [savedProgress, autoPlay]);

  const handleStartFromBeginning = useCallback(() => {
    setShowResumeDialog(false);
    // Clear saved progress
    const keys = getStorageKeys();
    localStorage.removeItem(keys.time);
    localStorage.removeItem(`${keys.time}-duration`);
    localStorage.removeItem(`${keys.time}-timestamp`);

    if (autoPlay) {
      videoRef.current?.play().catch(console.error);
    }
  }, [getStorageKeys, autoPlay]);

  const clearSavedProgress = useCallback(() => {
    const keys = getStorageKeys();
    localStorage.removeItem(keys.time);
    localStorage.removeItem(`${keys.time}-duration`);
    localStorage.removeItem(`${keys.time}-timestamp`);
  }, [getStorageKeys]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlay) onPlay(video);
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (onPause) onPause(video);
      // Save progress on pause
      saveProgress();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded(video);
      // Clear saved progress when video ends
      clearSavedProgress();
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      puzzles.forEach((puzzle, index) => {
        const state = puzzleState[index];

        if (!state.solved && time >= puzzle.time && time < puzzle.time + 0.5) {
          video.pause(); // ⛔ pause video
          setActivePuzzleIndex(index); // 🔥 show puzzle
        }
      });

      if (onTimeUpdate) onTimeUpdate(time, video.duration);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleProgress = () => {
      const bufferedRanges = [];
      for (let i = 0; i < video.buffered.length; i++) {
        bufferedRanges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        });
      }
      setBuffered(bufferedRanges);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      // If no resume dialog and autoPlay, check if we should resume
      if (!showResumeDialog && autoPlay) {
        const savedTime = localStorage.getItem(getStorageKeys().time);
        if (savedTime && parseFloat(savedTime) > resumeThreshold) {
          setSavedProgress({
            time: parseFloat(savedTime),
            duration: video.duration,
          });
          setShowResumeDialog(true);
        } else {
          video.play().catch(console.error);
        }
      }
    };
    const handleError = (e) =>
      setError(video.error?.message || "Video error occurred");

    // Add event listeners
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    // Fullscreen change listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);

      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, [
    onPlay,
    onPause,
    onEnded,
    onTimeUpdate,
    saveProgress,
    clearSavedProgress,
    showResumeDialog,
    autoPlay,
    getStorageKeys,
    resumeThreshold,
  ]);

  // Control handlers (keep your existing handlers)
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const handleSeek = useCallback(
    (time) => {
      const nextUnsolvedPuzzle = puzzles.find(
        (p, i) => !puzzleState[i].solved && time > p.time,
      );

      if (nextUnsolvedPuzzle) {
        return; // 🚫 block skipping
      }

      videoRef.current.currentTime = time;
      setCurrentTime(time);
      setTimeout(saveProgress, 100);
    },
    [puzzles, puzzleState, saveProgress],
  );

  const handleVolumeChange = useCallback((newVolume) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const changePlaybackRate = useCallback((rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  }, []);

  const changeQuality = useCallback((levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
    }
  }, []);

  const skipTime = useCallback(
    (seconds) => {
      if (videoRef.current) {
        videoRef.current.currentTime += seconds;
        setTimeout(saveProgress, 100);
      }
    },
    [saveProgress],
  );

  // Format time helper
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // const handlePuzzleAnswer = (selectedIndex) => {
  //   const puzzle = puzzles[activePuzzleIndex];
  //   const isCorrect = selectedIndex === puzzle.correctAnswer;

  //   setPuzzleState((prev) => {
  //     const updated = { ...prev };

  //     updated[activePuzzleIndex] = {
  //       ...updated[activePuzzleIndex],
  //       attempts: updated[activePuzzleIndex].attempts + 1,
  //       solved: isCorrect,
  //       timeToSolve: isCorrect
  //         ? Math.round(videoRef.current.currentTime - puzzle.time)
  //         : null,
  //     };

  //     return updated;
  //   });

  //   if (isCorrect) {
  //     if (onPuzzleComplete) {
  //       onPuzzleComplete({
  //         puzzleIndex: activePuzzleIndex,
  //         attempts: puzzleState[activePuzzleIndex].attempts + 1,
  //         timeToSolve: Math.round(videoRef.current.currentTime - puzzle.time),
  //       });
  //     }

  //     setActivePuzzleIndex(null); // ❌ hide puzzle
  //     videoRef.current.play(); // ▶ resume video
  //   }
  // };

  const handlePuzzleAnswer = (selectedIndex) => {
    if (activePuzzleIndex === null) return;

    const puzzle = puzzles[activePuzzleIndex];
    const isCorrect = selectedIndex === puzzle.correctAnswer;

    setPuzzleState((prev) => {
      const updated = { ...prev };

      const newAttempts = prev[activePuzzleIndex].attempts + 1;

      updated[activePuzzleIndex] = {
        ...prev[activePuzzleIndex],
        attempts: newAttempts,
        solved: isCorrect,
        timeToSolve: isCorrect
          ? Math.round(videoRef.current.currentTime - puzzle.time)
          : null,
      };

      // ✅ Fire callback safely inside state update
      if (isCorrect && typeof onPuzzleComplete === "function") {
        onPuzzleComplete({
          puzzleIndex: activePuzzleIndex,
          attempts: newAttempts,
          timeToSolve: updated[activePuzzleIndex].timeToSolve,
        });
      }

      return updated;
    });

    if (isCorrect) {
      setActivePuzzleIndex(null);
      videoRef.current?.play();
    }
  };


  return (
    <div
      ref={containerRef}
      className={`video-player-container ${className} ${isFullscreen ? "fullscreen" : ""}`}
      style={{ width, height }}
    >
      <video
        ref={videoRef}
        poster={poster}
        loop={loop}
        playsInline
        style={{ width: "100%", height: "100%" }}
      />

      {isLoading && (
        <div className="video-loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      {error && (
        <div className="video-error-overlay">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Resume Dialog */}
      {showResumeDialog && savedProgress && (
        <div className="video-resume-overlay">
          <div className="resume-dialog">
            <h3>Resume Watching?</h3>
            <p>
              You were at {formatTime(savedProgress.time)}
              {savedProgress.duration > 0 &&
                ` (${Math.round(savedProgress.percentage)}%)`}
            </p>
            <div className="resume-actions">
              <button onClick={handleResume} className="resume-btn primary">
                Resume
              </button>
              <button
                onClick={handleStartFromBeginning}
                className="resume-btn secondary"
              >
                Start from Beginning
              </button>
              <button
                onClick={() => setShowResumeDialog(false)}
                className="resume-btn cancel"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {activePuzzleIndex !== null && (
        <div className="puzzle-overlay">
          <div className="puzzle-box">
            <h3>{puzzles[activePuzzleIndex].question}</h3>

            {puzzles[activePuzzleIndex].options.map((option, i) => (
              <button
                key={i}
                onClick={() => handlePuzzleAnswer(i)}
                className="puzzle-option"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {showControls && (
        <div className="video-controls">
          <div className="progress-bar-container">
            <div className="buffered-indicator">
              {buffered.map((range, index) => (
                <div
                  key={index}
                  className="buffered-range"
                  style={{
                    left: `${(range.start / (duration || 1)) * 100}%`,
                    width: `${((range.end - range.start) / (duration || 1)) * 100}%`,
                  }}
                />
              ))}
            </div>
            <input
              type="range"
              className="progress-bar"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right,
                  #ff4444 0%, #ff4444 ${(currentTime / (duration || 1)) * 100}%,
                  #666 ${(currentTime / (duration || 1)) * 100}%, #666 100%)`,
              }}
            />
          </div>

          <div className="controls-left">
            <button onClick={togglePlay} className="control-button">
              {isPlaying ? "⏸" : "▶"}
            </button>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <button onClick={toggleMute} className="control-button">
              {isMuted || volume === 0 ? "🔇" : volume > 0.5 ? "🔊" : "🔉"}
            </button>

            <input
              type="range"
              className="volume-slider"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              style={{ width: "80px" }}
            />
          </div>

          <div className="controls-right">
            {showPlaybackSpeed && (
              <select
                className="speed-selector"
                value={playbackRate}
                onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            )}

            {showQualitySelector && availableQualities.length > 0 && (
              <select
                className="quality-selector"
                value={currentQuality}
                onChange={(e) => changeQuality(parseInt(e.target.value))}
              >
                <option value="-1">Auto</option>
                {availableQualities.map((quality) => (
                  <option key={quality.index} value={quality.index}>
                    {quality.name}
                  </option>
                ))}
              </select>
            )}

            {showPictureInPicture && document.pictureInPictureEnabled && (
              <button
                onClick={() => videoRef.current?.requestPictureInPicture()}
                className="control-button"
              >
                📺
              </button>
            )}

            <button onClick={toggleFullscreen} className="control-button">
              {isFullscreen ? "⤓" : "⤢"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
