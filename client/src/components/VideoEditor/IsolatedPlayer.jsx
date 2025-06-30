import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import { Player } from '@remotion/player';
import MinimalRemotionComposition from './MinimalRemotionComposition';

// Completely isolated Player component with maximum error protection
const IsolatedPlayer = forwardRef(({
    compositionId,
    inputProps,
    onPlay,
    onPause,
    onFrameUpdate,
    width = 360,
    height = 640
}, ref) => {
    const playerRef = useRef();
    const containerRef = useRef();
    const [isReady, setIsReady] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const isMountedRef = useRef(true);

    // Delayed mounting to ensure DOM stability
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isMountedRef.current) {
                setHasMounted(true);
                // Additional delay for Player mounting
                setTimeout(() => {
                    if (isMountedRef.current) {
                        setIsReady(true);
                    }
                }, 100);
            }
        }, 50);

        return () => {
            clearTimeout(timer);
            isMountedRef.current = false;
            setIsReady(false);
            setHasMounted(false);
        };
    }, []);

    // Cleanup on composition change
    useEffect(() => {
        setIsReady(false);
        const timer = setTimeout(() => {
            if (isMountedRef.current) {
                setIsReady(true);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [compositionId, inputProps.videoSrc]);

    // Safe player methods with extensive error catching
    const safePlayerCall = useCallback((method, ...args) => {
        if (!playerRef.current || !isMountedRef.current || !isReady) {
            return null;
        }

        try {
            return playerRef.current[method](...args);
        } catch (error) {
            // Completely silent - no logging to avoid console spam
            return null;
        }
    }, [isReady]);

    const handlePlay = useCallback(() => {
        safePlayerCall('play');
    }, [safePlayerCall]);

    const handlePause = useCallback(() => {
        safePlayerCall('pause');
    }, [safePlayerCall]);

    const handleSeekTo = useCallback((frame) => {
        const safeFrame = Math.max(0, Math.min(frame, (inputProps.duration || 300) - 1));
        safePlayerCall('seekTo', safeFrame);
    }, [safePlayerCall, inputProps.duration]);

    const handleGetCurrentFrame = useCallback(() => {
        return safePlayerCall('getCurrentFrame') || 0;
    }, [safePlayerCall]);

    useImperativeHandle(ref, () => ({
        play: handlePlay,
        pause: handlePause,
        seekTo: handleSeekTo,
        getCurrentFrame: handleGetCurrentFrame,
        isPlaying: () => safePlayerCall('isPlaying') || false,
        getProgress: () => safePlayerCall('getProgress') || 0,
        getDuration: () => inputProps.duration || 300,
        cleanup: () => {
            safePlayerCall('pause');
        }
    }), [handlePlay, handlePause, handleSeekTo, handleGetCurrentFrame, safePlayerCall, inputProps.duration]);

    // Ultra-minimal Player configuration
    const playerStyle = {
        width: width,
        height: height,
        backgroundColor: '#000000',
        borderRadius: '8px'
    };

    // Static key to prevent re-mounting
    const playerKey = `isolated-player-${compositionId || 'default'}`;

    if (!hasMounted || !isReady) {
        return (
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%', backgroundColor: '#000000', borderRadius: '8px' }}
                className="flex items-center justify-center"
            >
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <Player
                key={playerKey}
                ref={playerRef}
                component={MinimalRemotionComposition}
                inputProps={inputProps}
                durationInFrames={inputProps.duration || 300}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={30}
                style={playerStyle}
                // Absolute minimal configuration
                controls={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
                spaceKeyToPlayOrPause={false}
                allowFullscreen={false}
                showVolumeControls={false}
                numberOfSharedAudioTags={0}
                muted={true}
                loop={false}
                playbackRate={1}
                initiallyShowControls={false}
                moveToBeginningWhenEnded={false}
                showPosterWhenUnplayed={false}
                showPosterWhenPaused={false}
                showPosterWhenEnded={false}
                // Completely silent error handling
                onError={() => { }}
                onPlay={() => {
                    if (isMountedRef.current && onPlay) {
                        try {
                            onPlay();
                        } catch { }
                    }
                }}
                onPause={() => {
                    if (isMountedRef.current && onPause) {
                        try {
                            onPause();
                        } catch { }
                    }
                }}
                onFrameUpdate={(frame) => {
                    if (isMountedRef.current && onFrameUpdate) {
                        try {
                            onFrameUpdate(frame);
                        } catch { }
                    }
                }}
                renderLoading={() => (
                    <div className="flex items-center justify-center w-full h-full bg-gray-900">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                )}
            />
        </div>
    );
});

IsolatedPlayer.displayName = 'IsolatedPlayer';

export default IsolatedPlayer;
