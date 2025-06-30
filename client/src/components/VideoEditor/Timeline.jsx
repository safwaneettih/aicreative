import React, { useRef, useEffect } from 'react';

const Timeline = ({ captions = [], currentFrame, onSeek, duration = 300, fps = 30 }) => {
    const timelineRef = useRef();
    const isDragging = useRef(false);

    // Get primary caption track
    const primaryTrack = captions.find(track => track.is_primary) || { caption_data: [] };
    const captionSegments = primaryTrack.caption_data || [];

    const frameToPercent = (frame) => (frame / duration) * 100;
    const timeToFrame = (time) => Math.floor(time * fps);
    const frameToTime = (frame) => frame / fps;

    const handleTimelineClick = (e) => {
        if (!timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newFrame = Math.floor(percentage * duration);

        onSeek(Math.max(0, Math.min(duration, newFrame)));
    };

    const handleMouseDown = (e) => {
        isDragging.current = true;
        handleTimelineClick(e);

        const handleMouseMove = (e) => {
            if (isDragging.current) {
                handleTimelineClick(e);
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-medium">Timeline</h3>
                <div className="text-gray-400 text-sm mt-1">
                    {formatTime(frameToTime(currentFrame))} / {formatTime(frameToTime(duration))}
                </div>
            </div>

            {/* Timeline Container */}
            <div className="flex-1 p-4">
                <div className="space-y-4">
                    {/* Time Ruler */}
                    <div className="relative h-6 bg-gray-800 rounded">
                        {/* Time markers */}
                        {Array.from({ length: Math.ceil(duration / fps / 5) + 1 }, (_, i) => {
                            const timeInSeconds = i * 5;
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

                    {/* Main Timeline */}
                    <div
                        ref={timelineRef}
                        className="relative h-16 bg-gray-800 rounded cursor-pointer select-none"
                        onMouseDown={handleMouseDown}
                    >
                        {/* Caption Segments */}
                        {captionSegments.map((caption, index) => {
                            const startFrame = timeToFrame(caption.start);
                            const endFrame = timeToFrame(caption.end);
                            const leftPercent = frameToPercent(startFrame);
                            const width = frameToPercent(endFrame - startFrame);

                            return (
                                <div
                                    key={caption.id || index}
                                    className="absolute top-2 h-12 bg-blue-600 rounded border border-blue-500 overflow-hidden"
                                    style={{
                                        left: `${leftPercent}%`,
                                        width: `${width}%`,
                                        minWidth: '4px'
                                    }}
                                    title={caption.text}
                                >
                                    <div className="p-1 text-xs text-white overflow-hidden whitespace-nowrap text-ellipsis">
                                        {caption.text}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Current Frame Indicator */}
                        <div
                            className="absolute top-0 w-0.5 h-full bg-red-500 z-10"
                            style={{ left: `${frameToPercent(currentFrame)}%` }}
                        >
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                    </div>

                    {/* Zoom Controls */}
                    <div className="flex justify-between items-center">
                        <div className="text-gray-400 text-sm">
                            Frame: {currentFrame} / {duration}
                        </div>
                        <div className="flex space-x-2">
                            <button className="text-gray-400 hover:text-white text-sm">
                                Zoom In
                            </button>
                            <button className="text-gray-400 hover:text-white text-sm">
                                Zoom Out
                            </button>
                            <button className="text-gray-400 hover:text-white text-sm">
                                Fit
                            </button>
                        </div>
                    </div>

                    {/* Caption List */}
                    <div className="space-y-2">
                        <h4 className="text-gray-400 text-sm font-medium">Caption Segments</h4>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {captionSegments.map((caption, index) => (
                                <div
                                    key={caption.id || index}
                                    className="flex items-center justify-between bg-gray-700 p-2 rounded text-sm cursor-pointer hover:bg-gray-600"
                                    onClick={() => onSeek(timeToFrame(caption.start))}
                                >
                                    <div className="flex-1 truncate">
                                        <div className="text-white">{caption.text}</div>
                                        <div className="text-gray-400 text-xs">
                                            {formatTime(caption.start)} - {formatTime(caption.end)}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <div
                                            className="w-3 h-3 bg-blue-600 rounded-sm"
                                            title="Caption segment"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
