import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import IsolatedPlayer from './IsolatedPlayer';

const EditorPreview = forwardRef(({
    compositionId,
    inputProps,
    onPlay,
    onPause,
    onFrameUpdate,
    width = 360,
    height = 640
}, ref) => {
    const playerRef = useRef();
    const [isComponentReady, setIsComponentReady] = useState(false);

    // Delayed component initialization for maximum stability
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsComponentReady(true);
        }, 300); // Give more time for DOM to stabilize

        return () => {
            clearTimeout(timer);
            setIsComponentReady(false);
        };
    }, []);

    // Forward all methods to the isolated player with safe calls
    useImperativeHandle(ref, () => ({
        play: () => {
            try {
                playerRef.current?.play?.();
            } catch {
                // Silent error handling
            }
        },
        pause: () => {
            try {
                playerRef.current?.pause?.();
            } catch {
                // Silent error handling
            }
        },
        seekTo: (frame) => {
            try {
                playerRef.current?.seekTo?.(frame);
            } catch {
                // Silent error handling
            }
        },
        getCurrentFrame: () => {
            try {
                return playerRef.current?.getCurrentFrame?.() || 0;
            } catch {
                return 0;
            }
        },
        isPlaying: () => {
            try {
                return playerRef.current?.isPlaying?.() || false;
            } catch {
                return false;
            }
        },
        getProgress: () => {
            try {
                return playerRef.current?.getProgress?.() || 0;
            } catch {
                return 0;
            }
        },
        getDuration: () => inputProps.duration || 300,
        cleanup: () => {
            try {
                playerRef.current?.cleanup?.();
            } catch {
                // Silent error handling
            }
        }
    }), [inputProps.duration]);

    const containerStyle = {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000'
    };

    return (
        <div style={containerStyle}>
            <div className="relative rounded-lg overflow-hidden bg-black border border-gray-600 shadow-xl max-w-full max-h-full">
                {isComponentReady ? (
                    <IsolatedPlayer
                        ref={playerRef}
                        compositionId={compositionId}
                        inputProps={inputProps}
                        onPlay={onPlay}
                        onPause={onPause}
                        onFrameUpdate={onFrameUpdate}
                        width={width}
                        height={height}
                    />
                ) : (
                    <div
                        style={{ width: width, height: height }}
                        className="flex items-center justify-center bg-gray-900 rounded-lg"
                    >
                        <div className="text-center text-gray-300">
                            <div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-sm">Initializing video player...</p>
                        </div>
                    </div>
                )}

                {/* Simple loading overlay for when no video */}
                {!inputProps.videoSrc && isComponentReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg">
                        <div className="text-gray-300 text-center">
                            <div className="animate-spin w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-sm">Loading video...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

EditorPreview.displayName = 'EditorPreview';

export default EditorPreview;
