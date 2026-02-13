export const hlsConfig = {
  // Critical LMS Settings
  autoStartLoad: false, // CRITICAL for LMS - don't load until visible
  startPosition: -1, // Resume from last position
  lowLatencyMode: false, // LMS doesn't need live latency
  // Performance Settings
  maxBufferLength: 30, // Smooth playback through bandwidth dips
  maxBufferSize: 60 * 1000 * 1000, // 60MB max buffer
  maxBufferHole: 0.5,      // Half second hole tolerance
  maxMaxBufferLength: 60, // Maximum buffer allowed if the buffer is growing (e.g. paused).
  backBufferLength: 300, // This removes old data from the buffer to keep the browser memory clean. 5 minutes for rewinding
  enableWorker: true, // Enable web worker for better performance (prevents UI freeze)
    smoothQualityChange: true, // For Smooth Switching between video quality
  // Resilience (Network timeouts)
  manifestLoadingTimeOut: 10000, // Increase timeouts for slow Internet speed / 10s is enough
  manifestLoadingMaxRetry: 3, // Retry manifest loads on failure
  fragLoadingTimeOut: 10000, // Increase timeouts for slow Internet speed
  fragLoadingMaxRetry: 5, // Retry segment loads (most common failure)
  // Quality
  capLevelToPlayerSize: true, // Save bandwidth based on UI size
  startFragPrefetch: true, // Starts loading as soon as the first segment is ready
  abrEwmaDefaultEstimate: 500000, // Initial bitrate estimate (0.5 Mbps)
  abrEwmaFastVoD: 3,      // React faster to bandwidth changes
    abrEwmaSlowVoD: 5,       // React slower to avoid fluctuations
};
