import React, { useRef, useState } from 'react';

const SimpleTimeline = ({
    captions = [],
    currentFrame,
    onSeek,
    duration = 300,
    fps = 30,
    onCaptionUpdate,
    onCaptionReposition,
    websocketActions
}) => {
    const timelineRef = useRef();
    const isDragging = useRef(false);
    const [selectedCaption, setSelectedCaption] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    // Get primary caption track
    const primaryTrack = captions.find(track => track.is_primary) || { caption_data: [] };
    const captionSegments = primaryTrack.caption_data || [];

    const frameToPercent = (frame) => (frame / duration) * 100;
    const timeToFrame = (time) => Math.floor(time * fps);
    const frameToTime = (frame) => frame / fps;
    const percentToFrame = (percent) => Math.floor((percent / 100) * duration);

    const handleTimelineClick = (e) => {
        if (!timelineRef.current || isDragging.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = (clickX / rect.width) * 100;
        const newFrame = percentToFrame(percent);

        if (newFrame >= 0 && newFrame < duration) {
            onSeek(newFrame);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const handleCaptionClick = (caption, index, e) => {
        e.stopPropagation();
        setSelectedCaption(index);

        if (onSeek) {
            const captionStartFrame = timeToFrame(caption.start);
            onSeek(captionStartFrame);
        }
    };

    const handleZoomChange = (newZoom) => {
        setZoomLevel(Math.max(0.1, Math.min(5, newZoom)));
    };

    return (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
            {/* Timeline Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <h3 className="text-sm font-medium text-gray-300">Simple Timeline</h3>
                    <div className="text-xs text-gray-400">
                        Frame: {currentFrame} | Time: {formatTime(frameToTime(currentFrame))}
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => handleZoomChange(zoomLevel - 0.2)}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Zoom Out"
                    >
                        -
                    </button>
                    <span className="text-xs text-gray-400 w-12 text-center">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                        onClick={() => handleZoomChange(zoomLevel + 0.2)}
                        className="p-1 text-gray-400 hover:text-white"
                        title="Zoom In"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Timeline Container */}
            <div className="relative">
                {/* Timeline Track */}
                <div
                    ref={timelineRef}
                    className="relative h-20 bg-gray-900 rounded-lg cursor-pointer overflow-x-auto"
                    onClick={handleTimelineClick}
                    style={{
                        minWidth: `${100 * zoomLevel}%`,
                        maxWidth: `${500 * zoomLevel}%`
                    }}
                >
                    {/* Time Markers */}
                    <div className="absolute inset-0 flex">
                        {Array.from({ length: Math.ceil(duration / fps / 5) }, (_, i) => {
                            const timeInSeconds = i * 5;
                            const percent = (timeInSeconds / (duration / fps)) * 100;

                            return (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-l border-gray-600"
                                    style={{ left: `${percent}%` }}
                                >
                                    <div className="text-xs text-gray-400 mt-1 ml-1">
                                        {formatTime(timeInSeconds)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Caption Segments */}
                    {captionSegments.map((caption, index) => {
                        const startPercent = (caption.start / (duration / fps)) * 100;
                        const endPercent = (caption.end / (duration / fps)) * 100;
                        const widthPercent = endPercent - startPercent;

                        if (widthPercent <= 0) return null;

                        return (
                            <div
                                key={`caption-${index}`}
                                className={`absolute top-12 h-6 rounded cursor-pointer transition-all duration-200 ${selectedCaption === index
                                        ? 'bg-blue-500 border-2 border-blue-300'
                                        : 'bg-blue-600 hover:bg-blue-500 border border-blue-400'
                                    }`}
                                style={{
                                    left: `${startPercent}%`,
                                    width: `${Math.max(widthPercent, 0.5)}%`
                                }}
                                onClick={(e) => handleCaptionClick(caption, index, e)}
                                title={caption.text}
                            >
                                <div className="px-1 py-1 text-xs text-white truncate">
                                    {caption.text}
                                </div>
                            </div>
                        );
                    })}

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
                        style={{
                            left: `${frameToPercent(currentFrame)}%`,
                            boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                        }}
                    >
                        {/* Playhead Handle */}
                        <div className="absolute top-0 -left-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
                    </div>
                </div>

                {/* Timeline Info */}
                <div className="mt-2 flex justify-between text-xs text-gray-400">
                    <span>0:00</span>
                    <span>{formatTime(duration / fps)}</span>
                </div>
            </div>
        </div>
    );
};

export default SimpleTimeline;
