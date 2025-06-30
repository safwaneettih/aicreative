import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const AdvancedTimeline = ({
    captions = [],
    currentFrame,
    onSeek,
    duration = 300,
    fps = 30,
    audioSrc = null,
    onCaptionUpdate,
    onCaptionReposition,
    websocketActions
}) => {
    const timelineRef = useRef();
    const waveformRef = useRef();
    const waveSurferRef = useRef();
    const isDragging = useRef(false);
    const dragData = useRef(null);
    const [selectedCaption, setSelectedCaption] = useState(null);
    const [isWaveformLoaded, setIsWaveformLoaded] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);

    // Get primary caption track
    const primaryTrack = captions.find(track => track.is_primary) || { caption_data: [] };
    const captionSegments = primaryTrack.caption_data || [];

    const frameToPercent = (frame) => (frame / duration) * 100;
    const timeToFrame = (time) => Math.floor(time * fps);
    const frameToTime = (frame) => frame / fps;
    const percentToFrame = (percent) => Math.floor((percent / 100) * duration);

    // Initialize WaveSurfer with proper cleanup and abort handling
    useEffect(() => {
        let isComponentMounted = true;
        const abortController = new AbortController();

        if (!waveformRef.current || !audioSrc) {
            console.log('🎵 No waveform container or audio source:', { waveformRef: !!waveformRef.current, audioSrc });
            return;
        }

        const audioUrl = audioSrc.startsWith('http') ? audioSrc : `http://localhost:5000/${audioSrc}`;
        console.log('🎵 Loading audio for waveform:', audioUrl);

        const waveSurfer = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#4f46e5',
            progressColor: '#6366f1',
            cursorColor: '#ef4444',
            barWidth: 2,
            barRadius: 3,
            responsive: true,
            height: 60,
            normalize: true,
            splitChannels: false,
            backend: 'WebAudio'
        });

        // Load audio with error handling
        try {
            waveSurfer.load(audioUrl);
        } catch (error) {
            console.warn('WaveSurfer load error:', error);
            return () => {
                // Silent cleanup
                if (waveSurferRef.current) {
                    try {
                        waveSurferRef.current.destroy();
                    } catch { }
                    waveSurferRef.current = null;
                }
            };
        }

        waveSurfer.on('ready', () => {
            if (isComponentMounted) {
                console.log('🎵 Waveform loaded successfully');
                setIsWaveformLoaded(true);
            }
        });

        waveSurfer.on('error', (error) => {
            if (isComponentMounted) {
                console.error('🎵 Waveform error:', error);
            }
        });

        waveSurfer.on('audioprocess', (currentTime) => {
            if (isComponentMounted) {
                const newFrame = timeToFrame(currentTime);
                onSeek(newFrame);
            }
        });

        waveSurfer.on('seek', (position) => {
            if (isComponentMounted) {
                const newFrame = percentToFrame(position * 100);
                onSeek(newFrame);

                // Send real-time position update to other users
                if (websocketActions) {
                    websocketActions.seekTimeline(newFrame);
                }
            }
        });

        waveSurferRef.current = waveSurfer;

        return () => {
            isComponentMounted = false;
            abortController.abort(); // Cancel any pending requests

            if (waveSurferRef.current) {
                try {
                    // More defensive WaveSurfer cleanup
                    const waveSurfer = waveSurferRef.current;

                    // First pause safely
                    if (typeof waveSurfer.pause === 'function') {
                        waveSurfer.pause();
                    }

                    // Skip empty() as it's causing DOM manipulation errors
                    // and go straight to destroy which handles cleanup better
                    if (typeof waveSurfer.destroy === 'function') {
                        waveSurfer.destroy();
                    }

                    waveSurferRef.current = null;
                } catch (error) {
                    // Completely silent cleanup - these errors are safe to ignore
                    waveSurferRef.current = null;
                }
            }

            // Also clear the DOM container to prevent orphaned elements
            if (waveformRef.current) {
                try {
                    waveformRef.current.innerHTML = '';
                } catch {
                    // Silent cleanup
                }
            }

            setIsWaveformLoaded(false);
        };
    }, [audioSrc, fps, duration, onSeek, websocketActions, timeToFrame, percentToFrame]);

    // Update WaveSurfer position when currentFrame changes
    useEffect(() => {
        if (waveSurferRef.current && isWaveformLoaded) {
            try {
                const position = frameToPercent(currentFrame) / 100;
                waveSurferRef.current.seekTo(position);
            } catch (error) {
                console.warn('WaveSurfer seek error:', error);
            }
        }
    }, [currentFrame, isWaveformLoaded, frameToPercent]);

    const handleTimelineClick = (e) => {
        if (!timelineRef.current || isDragging.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        const newFrame = percentToFrame(percentage);

        console.log('🎬 Timeline clicked:', { x, percentage, newFrame, duration });

        // Ensure frame accuracy by rounding to nearest frame
        const clampedFrame = Math.max(0, Math.min(duration - 1, Math.round(newFrame)));
        onSeek(clampedFrame);

        // Update waveform position immediately for better sync
        if (waveSurferRef.current && isWaveformLoaded) {
            const position = frameToPercent(clampedFrame) / 100;
            waveSurferRef.current.seekTo(position);
        }

        // Send real-time position update to other users
        if (websocketActions) {
            websocketActions.seekTimeline(clampedFrame);
        }
    };

    // Enhanced seeking with better precision
    const handleTimelineScrub = (e) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        const newFrame = Math.round(percentToFrame(percentage));

        // Clamp to valid range
        const clampedFrame = Math.max(0, Math.min(duration - 1, newFrame));

        // Only trigger seek if frame actually changed (for performance)
        if (clampedFrame !== currentFrame) {
            onSeek(clampedFrame);
        }
    };

    const handleCaptionMouseDown = (e, caption, index) => {
        e.stopPropagation();
        setSelectedCaption(index);

        const rect = timelineRef.current.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const captionElement = e.currentTarget;
        const captionRect = captionElement.getBoundingClientRect();
        const offsetX = e.clientX - captionRect.left;

        isDragging.current = true;
        dragData.current = {
            caption,
            index,
            startX,
            offsetX,
            originalStart: caption.start,
            originalEnd: caption.end,
            mode: offsetX < 10 ? 'resize-start' : offsetX > captionRect.width - 10 ? 'resize-end' : 'move'
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current || !dragData.current || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentPercentage = (currentX / rect.width) * 100;
        const currentTime = (currentPercentage / 100) * (duration / fps);

        const { caption, index, mode, originalStart, originalEnd } = dragData.current;
        let newStart = originalStart;
        let newEnd = originalEnd;

        switch (mode) {
            case 'move':
                const captionDuration = originalEnd - originalStart;
                newStart = Math.max(0, currentTime - captionDuration / 2);
                newEnd = Math.min(duration / fps, newStart + captionDuration);
                newStart = newEnd - captionDuration; // Ensure duration is preserved
                break;

            case 'resize-start':
                newStart = Math.max(0, Math.min(currentTime, originalEnd - 0.1));
                break;

            case 'resize-end':
                newEnd = Math.max(originalStart + 0.1, Math.min(currentTime, duration / fps));
                break;
        }

        // Update caption with new timing
        const updatedCaption = {
            ...caption,
            start: newStart,
            end: newEnd
        };

        // Call the reposition callback
        if (onCaptionReposition) {
            onCaptionReposition(index, updatedCaption);
        }
    };

    const handleMouseUp = () => {
        if (isDragging.current && dragData.current) {
            const { caption, index } = dragData.current;

            // Send real-time caption update to other users
            if (websocketActions && onCaptionUpdate) {
                websocketActions.updateCaption(caption.id || index, {
                    start: caption.start,
                    end: caption.end
                });
            }
        }

        isDragging.current = false;
        dragData.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleZoom = (direction) => {
        const newZoomLevel = direction === 'in'
            ? Math.min(zoomLevel * 1.5, 5)
            : Math.max(zoomLevel / 1.5, 0.5);
        setZoomLevel(newZoomLevel);

        if (waveSurferRef.current) {
            waveSurferRef.current.zoom(newZoomLevel * 20);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const snapToGrid = (time) => {
        const gridSize = 0.1; // 100ms grid
        return Math.round(time / gridSize) * gridSize;
    };

    // Global error handler for WaveSurfer DOM errors
    useEffect(() => {
        const handleUnhandledRejection = (event) => {
            if (event.reason?.message?.includes('removeAttribute') ||
                event.reason?.message?.includes('getMediaElement') ||
                event.reason?.name === 'AbortError') {
                // Prevent these specific errors from crashing the app
                event.preventDefault();
                console.warn('WaveSurfer DOM error handled:', event.reason?.message);
            }
        };

        const handleError = (event) => {
            if (event.error?.message?.includes('removeAttribute') ||
                event.error?.message?.includes('getMediaElement')) {
                // Prevent these specific errors from crashing the app
                event.preventDefault();
                console.warn('WaveSurfer DOM error handled:', event.error?.message);
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleError);

        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleError);
        };
    }, []);

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">Advanced Timeline</h3>
                    <div className="flex items-center space-x-4">
                        <div className="text-gray-400 text-sm">
                            {formatTime(frameToTime(currentFrame))} / {formatTime(frameToTime(duration))}
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handleZoom('out')}
                                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                            >
                                Zoom Out
                            </button>
                            <button
                                onClick={() => handleZoom('in')}
                                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                            >
                                Zoom In
                            </button>
                            <button
                                onClick={() => setZoomLevel(1)}
                                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                            >
                                Fit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="flex-1 p-4 overflow-auto">
                <div className="space-y-4">
                    {/* Audio Waveform */}
                    {audioSrc && (
                        <div className="space-y-2">
                            <h4 className="text-gray-400 text-sm font-medium flex items-center">
                                🎵 Audio Waveform
                                {isWaveformLoaded && (
                                    <span className="ml-2 text-green-500 text-xs">● Loaded</span>
                                )}
                            </h4>
                            <div
                                ref={waveformRef}
                                className="bg-gray-800 rounded-lg p-2"
                                style={{ minHeight: '80px' }}
                            />
                        </div>
                    )}

                    {/* Time Ruler */}
                    <div className="relative h-8 bg-gray-800 rounded">
                        {Array.from({ length: Math.ceil(duration / fps / 1) + 1 }, (_, i) => {
                            const timeInSeconds = i * 1;
                            const frame = timeInSeconds * fps;
                            const percent = frameToPercent(frame);

                            if (percent > 100) return null;

                            return (
                                <div
                                    key={i}
                                    className="absolute top-0 h-full flex items-center"
                                    style={{ left: `${percent}%` }}
                                >
                                    <div className="w-px h-full bg-gray-600" />
                                    <div className="absolute top-0 left-1 text-xs text-gray-400">
                                        {formatTime(timeInSeconds)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Caption Track */}
                    <div className="space-y-2">
                        <h4 className="text-gray-400 text-sm font-medium">📝 Caption Track</h4>
                        <div
                            ref={timelineRef}
                            className="relative h-20 bg-gray-800 rounded cursor-pointer select-none"
                            onClick={handleTimelineClick}
                        >
                            {/* Playhead/Current Frame Indicator */}
                            <div
                                className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                                style={{ left: `${frameToPercent(currentFrame)}%` }}
                            >
                                {/* Playhead handle */}
                                <div className="absolute -top-1 -left-2 w-4 h-6 bg-red-500 rounded-sm shadow-lg">
                                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent border-t-red-500"></div>
                                </div>
                            </div>

                            {/* Caption Segments */}
                            {captionSegments.map((caption, index) => {
                                const startFrame = timeToFrame(caption.start);
                                const endFrame = timeToFrame(caption.end);
                                const leftPercent = frameToPercent(startFrame);
                                const width = frameToPercent(endFrame - startFrame);
                                const isSelected = selectedCaption === index;

                                return (
                                    <div
                                        key={caption.id || index}
                                        className={`absolute top-2 h-16 rounded border-2 overflow-hidden cursor-move ${isSelected
                                                ? 'bg-blue-500 border-blue-300 shadow-lg'
                                                : 'bg-blue-600 border-blue-500 hover:bg-blue-500'
                                            }`}
                                        style={{
                                            left: `${leftPercent}%`,
                                            width: `${width}%`,
                                            minWidth: '20px'
                                        }}
                                        title={caption.text}
                                        onMouseDown={(e) => handleCaptionMouseDown(e, caption, index)}
                                    >
                                        {/* Resize handles */}
                                        <div className="absolute left-0 top-0 w-2 h-full bg-blue-300 cursor-ew-resize opacity-0 hover:opacity-100" />
                                        <div className="absolute right-0 top-0 w-2 h-full bg-blue-300 cursor-ew-resize opacity-0 hover:opacity-100" />

                                        {/* Caption content */}
                                        <div className="p-1 text-xs text-white overflow-hidden">
                                            <div className="font-medium truncate">{caption.text}</div>
                                            <div className="text-blue-200 text-xs">
                                                {formatTime(caption.start)} - {formatTime(caption.end)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Current Frame Indicator */}
                            <div
                                className="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"
                                style={{ left: `${frameToPercent(currentFrame)}%` }}
                            >
                                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                                <div className="absolute top-0 left-1 text-xs text-red-400 font-mono bg-gray-900 px-1 rounded">
                                    {formatTime(frameToTime(currentFrame))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Caption Details */}
                    {selectedCaption !== null && captionSegments[selectedCaption] && (
                        <div className="bg-gray-800 rounded-lg p-4">
                            <h4 className="text-white font-medium mb-2">Selected Caption</h4>
                            <div className="space-y-2 text-sm">
                                <div className="text-gray-300">
                                    <strong>Text:</strong> {captionSegments[selectedCaption].text}
                                </div>
                                <div className="text-gray-300">
                                    <strong>Duration:</strong> {formatTime(captionSegments[selectedCaption].end - captionSegments[selectedCaption].start)}
                                </div>
                                <div className="text-gray-300">
                                    <strong>Position:</strong> {formatTime(captionSegments[selectedCaption].start)} - {formatTime(captionSegments[selectedCaption].end)}
                                </div>
                                <div className="text-gray-400 text-xs">
                                    💡 Drag to move • Drag edges to resize • Click timeline to seek
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedTimeline;
