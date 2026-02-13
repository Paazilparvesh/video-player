const VideoPlayer = ({
  src = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  autoPlay = false,
  muted = false,
  loop = false,
  // Thumnail image to show before video loads
  poster = "",
  // Event callbacks
  // triggered when video and HLS are ready, receives { video, hls, qualities }
  onReady,
  // triggered on play, receives video element
  onPlay,
  // triggered on pause, receives video element
  onPause,
  // triggered on video end, receives video element
  onEnded,
  // triggered on time update, receives currentTime and duration
  onTimeUpdate,
  // triggered on error, receives error object
  onError,
  // Additional CSS class for custom styling
  className = "",
  width = "100%",
  height = "auto",
  // Default to showing controls, but can be hidden for custom UI implementations
  showControls = true,
  // Show quality selector if multiple qualities are available (HLS)
  showQualitySelector = true,
  // Show playback speed selector
  showPlaybackSpeed = true,
  // Show Picture-in-Picture button if supported by the browser
  showPictureInPicture = false,
  // Keyboard shortcuts: Space (play/pause), F (fullscreen), M (mute), ArrowLeft/Right (seek)
  enableKeyboardShortcuts = true,
  // Unique key for localStorage to persist progress and settings (should be unique per video)
  persistKey = "video-player",
  // Interval in seconds to save progress to localStorage
  persistInterval = 5,
  // Minimum progress (in seconds) required to show resume dialog
  resumeThreshold = 5,
  // Array of puzzle configurations
  puzzles = [
    {
      time: 120, // seconds
      question: "What is React?",
      options: ["Library", "Framework"],
      correctAnswer: 0,
    },
  ],
  // Callback when a puzzle is completed, receives { puzzleId, attempts, timeToSolve }
  onPuzzleComplete,

  // Playback rate options (e.g. [0.5, 1, 1.5, 2])
  playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2],
  playbackRateLabels = {
    0.5: "0.5x",
    0.75: "0.75x",
    1: "1x",
    1.25: "1.25x",
    1.5: "1.5x",
    2: "2x",
  },
  // Preload video metadata to get duration and trigger puzzles at correct times
  preload = "metadata",
  // For IOS Safari support, use playsInline
  playsInline = true,
  // Prefered quality level (index from HLS levels, -1 for auto)
  preferredQuality = "auto",
  // capQualityByViewport: automatically limit quality based on viewport size (HLS)
  capQualityByViewport = true,
  // capQualityByDevice: automatically limit quality on mobile devices (HLS)
  capQualityByDevice = true,
  // onQualityChange: callback when quality changes, receives new quality index
  onQualityChange,
  // disableContextMenu: disable right-click context menu on video
  disableContextMenu = false,
  // diableseeking: prevent user from seeking through the video (e.g. for exams or quizzes, cant skip the video)
  disableSeeking = false,
  // Show remaining time instead of elapsed time
  showRemainingTime = false,
  // progress bar styling options
  showProgressBar = true,

  // tracks user engagement and analytics, receives events like play, pause, seek, puzzleComplete with relevant data
  onEngagement,
  // trackEvents: array of event types to track for engagement (e.g. ['play', 'pause', 'seek', 'puzzleComplete'])
  trackEvents = true,
  // onProgress: callback that receives currentTime and duration at regular intervals (e.g. every second) for custom progress tracking or analytics
  onProgress,
  completionThreshold = 0.9, // percentage of video watched to consider it "completed"
  // disable download: prevent users from downloading the video (e.g. for premium content)
  disableDownload = false,
}) => {};
