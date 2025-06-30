import { useState, useEffect, useRef, useCallback } from 'react';

export const useRemotionPlayer = (compositionId, inputProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [duration, setDuration] = useState(300);
    const [isBuffering, setIsBuffering] = useState(false);
    const [error, setError] = useState(null);

    const playerRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Update current frame when playing
    useEffect(() => {
        if (isPlaying && playerRef.current) {
            const updateFrame = () => {
                if (playerRef.current) {
                    const frame = playerRef.current.getCurrentFrame();
                    setCurrentFrame(frame);

                    if (frame >= duration) {
                        setIsPlaying(false);
                        setCurrentFrame(0);
                        if (playerRef.current) {
                            playerRef.current.seekTo(0);
                        }
                    } else {
                        animationFrameRef.current = requestAnimationFrame(updateFrame);
                    }
                }
            };

            animationFrameRef.current = requestAnimationFrame(updateFrame);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, duration]);

    // Player controls
    const play = useCallback(() => {
        if (playerRef.current) {
            try {
                playerRef.current.play();
                setIsPlaying(true);
                setError(null);
            } catch (err) {
                console.error('Failed to play:', err);
                setError(err.message);
            }
        }
    }, []);

    const pause = useCallback(() => {
        if (playerRef.current) {
            try {
                playerRef.current.pause();
                setIsPlaying(false);
            } catch (err) {
                console.error('Failed to pause:', err);
                setError(err.message);
            }
        }
    }, []);

    const stop = useCallback(() => {
        if (playerRef.current) {
            try {
                playerRef.current.pause();
                playerRef.current.seekTo(0);
                setIsPlaying(false);
                setCurrentFrame(0);
            } catch (err) {
                console.error('Failed to stop:', err);
                setError(err.message);
            }
        }
    }, []);

    const seekTo = useCallback((frame) => {
        if (playerRef.current) {
            try {
                const clampedFrame = Math.max(0, Math.min(frame, duration));
                playerRef.current.seekTo(clampedFrame);
                setCurrentFrame(clampedFrame);
                setError(null);
            } catch (err) {
                console.error('Failed to seek:', err);
                setError(err.message);
            }
        }
    }, [duration]);

    const seekToTime = useCallback((seconds, fps = 30) => {
        const frame = Math.floor(seconds * fps);
        seekTo(frame);
    }, [seekTo]);

    // Toggle play/pause
    const togglePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, play, pause]);

    // Handle player events
    const handlePlayerReady = useCallback(() => {
        setIsBuffering(false);
        setError(null);
    }, []);

    const handlePlayerError = useCallback((error) => {
        console.error('Player error:', error);
        setError(error.message || 'Player error occurred');
        setIsPlaying(false);
        setIsBuffering(false);
    }, []);

    const handleBuffering = useCallback((buffering) => {
        setIsBuffering(buffering);
    }, []);

    // Calculate playback progress
    const progress = duration > 0 ? (currentFrame / duration) * 100 : 0;

    // Format time for display
    const formatTime = useCallback((frame, fps = 30) => {
        const totalSeconds = frame / fps;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const frames = frame % fps;

        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
    }, []);

    // Get current time display
    const currentTimeDisplay = formatTime(currentFrame);
    const durationDisplay = formatTime(duration);

    return {
        // Refs
        playerRef,

        // State
        isPlaying,
        currentFrame,
        duration,
        isBuffering,
        error,
        progress,

        // Controls
        play,
        pause,
        stop,
        seekTo,
        seekToTime,
        togglePlayPause,

        // Event handlers
        handlePlayerReady,
        handlePlayerError,
        handleBuffering,

        // Utils
        formatTime,
        currentTimeDisplay,
        durationDisplay,

        // Setters (for external control)
        setDuration,
        setCurrentFrame,
        setIsPlaying
    };
};
