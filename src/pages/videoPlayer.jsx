import { useRef, useEffect, useState } from "react"
import Hls from "hls.js"
import { hlsConfig } from "/src/config/hls.config.js";

const VideoPlayer = ({ src }) => {
    // For Video Configuration
    const videoRef = useRef(null);
    // For Quality Change Configuration
    const hlsRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setduration] = useState(0);

    const [levels, setLevels] = useState([]);
    const [currentLevel, setcurrentLevel] = useState(-1) // -1 == "auto"

    const [currentTime, setCurrentTime] = useState(0)

    const [isBuffering, setIsBuffering] = useState(false);

    useEffect(() => {
        let hls;
        if (!videoRef.current) return;

        if (Hls.isSupported()) {
            // Initialize Hls.js
            hls = new Hls(hlsConfig);
            hlsRef.current = hls // Store it for global component access

            hls.loadSource(src);
            hls.attachMedia(videoRef.current);
            // Triggers Play After manifest Ready
            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                console.log("manifest parsed :", event)
                hls.startLoad(); // This i sImportant when autoStartLoad: false
                // save the availabe format in levels state
                setLevels(data.levels);
            })

            videoRef.current.addEventListener('waiting', () => setIsBuffering(true));
            videoRef.current.addEventListener('playing', () => setIsBuffering(false));
            videoRef.current.addEventListener('canplay', () => setIsBuffering(false));

            // Update UI when HLS automatically switches quality
            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                console.log("level switched :", event)
                console.log("Switched to level:", data.level);
                // Only update if the uswer is in auto mode
                if (hls.autoLevelEnabled) {
                    setcurrentLevel(-1);
                } else {
                    // Keep Showing the Manual selected option
                    setcurrentLevel(hls.currentLevel);
                }
            })

            // Error Handling for real-time errors
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.log("error :", event)
                console.warn("Hls Error:", data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad(); // try to recover from netwrok issues
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError(); // Reattach media
                            break;
                        default:
                            hls.destroy();
                            break;
                    }
                }
            })
        }
        // Fallback for Safari/IOS 
        else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = src;
        }
        // Cleanup on component unmount
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src]); // re-run if Video Changes

        // Event Listeners for buffering
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);
        const handleCanPlay = () => setIsBuffering(false);

        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, []);

    // Load saved position when video is ready
    useEffect(() => {
        if (!videoRef.current) return;

        const savedPosition = localStorage.getItem(`video-${src}`);
        if (savedPosition && videoRef.current.readyState > 0) {
            videoRef.current.currentTime = parseFloat(savedPosition);
        }
    }, [src])

    // Save position every 5 seconds when playing
    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current && !videoRef.current.currentTime) {
                localStorage.setItem(`video-${src}`, videoRef.current.currentTime);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [src])

    // Play / Pause Logic
    const togglePlay = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        }
        else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };
    // Use these to keep React State perfectly in sync with the actual hardware
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    // Progress Bar ( Related to onTimeUpdate prop )
    const handleTimeUpdate = () => {
        const video = videoRef.current;

        if (video) {
            setProgress((video.currentTime / video.duration) * 100);
            setduration(video.duration)
            setCurrentTime(video.currentTime);
        }
    }

    // Seek Logic ( Forward / Backward / Up / Down )
    const handleSeek = (e) => {
        const seekTime = (e.target.value / 100) * videoRef.current.duration;
        videoRef.current.currentTime = seekTime
    }

    // Quality Switchin Logic
    const changeQuality = (e) => {
        const newLevel = Number(e.target.value);
        setcurrentLevel(newLevel)

        if (hlsRef.current) {
            // currentLevel = -1 enables ABR (Auto)
            // currentLevel = 0,1,2 forces that specific level
            hlsRef.current.currentLevel = newLevel;
        }
    }

    // Time Fomater ( seconds to 00:00 )
    const timeFormator = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${mins}:${sec < 10 ? '0' : ''}${sec}`;

    }

    return (
        <div className="group relative w-full max-w-4xl mx-auto bg-black overflow-hidden rounded-lg shadow-2xl">
            <video
                ref={videoRef}
                onTimeUpdate={handleTimeUpdate}
                onPlay={onPlay}
                onPause={onPause}
                onClick={togglePlay}
                // controls
                className="w-full aspect-video cursor-pointer"
            />

            {isBuffering && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-full">
                    ⏳ Buffering...
                </div>
            )}
            {/* Bottom Gradient Overlay (YouTube Style) */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-black/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Controls Container */}
            <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-linear-to-t from-black/60 to-transparent">

                {/* 1. Progress Bar (YouTube Red) */}
                <div className="relative w-full h-1 group/bar flex items-center">
                    <input
                        type="range"
                        min="0" max="100"
                        value={progress}
                        onChange={handleSeek}
                        className="absolute w-full h-1 z-10 opacity-0 cursor-pointer"
                    />
                    {/* Visual Track */}
                    <div className="absolute w-full h-1 bg-white/30" />
                    {/* Red Progress Track */}
                    <div
                        className="absolute h-1 bg-red-600 transition-all pointer-events-none"
                        style={{ width: `${progress}%` }}
                    />
                    {/* Red Dot (YouTube Scrubber) */}
                    <div
                        className="absolute h-3 w-3 bg-red-600 rounded-full scale-0 group-hover/bar:scale-100 transition-transform pointer-events-none"
                        style={{ left: `calc(${progress}% - 6px)` }}
                    />
                </div>

                {/* 2. Buttons & Labels Row */}
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="hover:scale-110 transition-transform text-2xl w-8">
                            {isPlaying ? "||" : "▶"}
                        </button>

                        <div className="text-sm font-medium tracking-tight">
                            {timeFormator(currentTime)} / {timeFormator(duration)}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Quality Select Wrapper */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase text-zinc-400 font-bold">HD</span>
                            <select
                                onChange={changeQuality}
                                value={currentLevel}
                                className="bg-transparent text-sm outline-none cursor-pointer border-none hover:text-red-500 transition-colors"
                            >
                                <option className="bg-zinc-900" value="-1">Auto</option>
                                {levels.map((level, index) => (
                                    <option className="bg-zinc-900" key={index} value={index}>
                                        {level.height}p
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default VideoPlayer