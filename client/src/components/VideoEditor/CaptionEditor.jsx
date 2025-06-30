import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, Users } from 'lucide-react';

const CaptionEditor = ({
    captions = [],
    onUpdateCaptions,
    currentFrame,
    onSeek,
    websocketActions
}) => {
    const [selectedCaption, setSelectedCaption] = useState(null);
    const [editingCaption, setEditingCaption] = useState(null);
    const [realtimeEditing, setRealtimeEditing] = useState({});
    const timeoutsRef = useRef(new Map());

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            timeoutsRef.current.forEach(timeoutId => {
                clearTimeout(timeoutId);
            });
            timeoutsRef.current.clear();
        };
    }, []);

    // Get primary caption track or create one
    const primaryTrack = captions.find(track => track.is_primary) || {
        id: 'primary',
        language: 'en',
        is_primary: true,
        caption_data: []
    };

    const captionSegments = primaryTrack.caption_data || [];

    const handleAddCaption = () => {
        const newCaption = {
            id: Date.now(),
            text: 'New caption',
            start: currentFrame / 30, // Convert frame to seconds
            end: (currentFrame + 60) / 30, // 2 seconds duration
            position: { x: 0.5, y: 0.8 },
            styles: {}
        };

        const updatedSegments = [...captionSegments, newCaption];
        updateCaptionTrack(updatedSegments);
        setEditingCaption(newCaption.id);
    };

    const handleEditCaption = (caption) => {
        setEditingCaption(caption.id);
        setSelectedCaption(caption);
    };

    const handleDeleteCaption = (captionId) => {
        const updatedSegments = captionSegments.filter(cap => cap.id !== captionId);
        updateCaptionTrack(updatedSegments);
    };

    const handleUpdateCaption = (captionId, updates) => {
        const updatedSegments = captionSegments.map(cap =>
            cap.id === captionId ? { ...cap, ...updates } : cap
        );
        updateCaptionTrack(updatedSegments);

        // Send real-time update to other users
        if (websocketActions) {
            websocketActions.updateCaption(captionId, updates);
        }
    };

    const handleTextChange = (captionId, newText) => {
        // Update locally immediately for responsive editing
        handleUpdateCaption(captionId, { text: newText });

        // Mark as being edited in real-time
        setRealtimeEditing(prev => ({
            ...prev,
            [captionId]: true
        }));

        // Clear any existing timeout for this caption
        const existingTimeout = timeoutsRef.current.get(captionId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Debounce WebSocket updates to avoid spam
        const timeoutId = setTimeout(() => {
            setRealtimeEditing(prev => ({
                ...prev,
                [captionId]: false
            }));
            timeoutsRef.current.delete(captionId);
        }, 500);

        timeoutsRef.current.set(captionId, timeoutId);
    };

    const handleSeekToCaption = (caption) => {
        const startFrame = Math.floor(caption.start * 30); // Convert seconds to frame
        if (onSeek) {
            onSeek(startFrame);
        }
    };

    const updateCaptionTrack = (segments) => {
        const updatedTracks = captions.map(track =>
            track.is_primary ? { ...track, caption_data: segments } : track
        );

        // If no primary track exists, create one
        if (!captions.find(track => track.is_primary)) {
            updatedTracks.push({
                id: 'primary',
                language: 'en',
                is_primary: true,
                caption_data: segments,
                style_config: {}
            });
        }

        onUpdateCaptions(updatedTracks);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, '0')}`;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">Captions</h3>
                    <button
                        onClick={handleAddCaption}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Caption List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {captionSegments.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">
                        <p>No captions yet</p>
                        <button
                            onClick={handleAddCaption}
                            className="mt-2 text-blue-400 hover:text-blue-300"
                        >
                            Add your first caption
                        </button>
                    </div>
                ) : (
                    captionSegments.map((caption) => (
                        <div
                            key={caption.id}
                            className={`bg-gray-700 rounded p-3 border ${selectedCaption?.id === caption.id
                                ? 'border-blue-500'
                                : 'border-gray-600'
                                }`}
                            onClick={() => setSelectedCaption(caption)}
                        >
                            {editingCaption === caption.id ? (
                                <CaptionEditForm
                                    caption={caption}
                                    onSave={(updates) => {
                                        handleUpdateCaption(caption.id, updates);
                                        setEditingCaption(null);
                                    }}
                                    onCancel={() => setEditingCaption(null)}
                                    onTextChange={(newText) => handleTextChange(caption.id, newText)}
                                />
                            ) : (
                                <CaptionDisplay
                                    caption={caption}
                                    onEdit={() => handleEditCaption(caption)}
                                    onDelete={() => handleDeleteCaption(caption.id)}
                                    onSeek={() => handleSeekToCaption(caption)}
                                    formatTime={formatTime}
                                    isBeingEdited={realtimeEditing[caption.id]}
                                />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const CaptionDisplay = ({ caption, onEdit, onDelete, onSeek, formatTime, isBeingEdited }) => (
    <>
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                    <p className="text-white text-sm flex-1">{caption.text}</p>
                    {isBeingEdited && (
                        <div className="flex items-center space-x-1">
                            <Users size={12} className="text-blue-400" />
                            <span className="text-blue-400 text-xs">Live edit</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center text-gray-400 text-xs space-x-2">
                    <Clock size={12} />
                    <span>{formatTime(caption.start)} - {formatTime(caption.end)}</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSeek();
                        }}
                        className="text-blue-400 hover:text-blue-300 underline"
                    >
                        Go to
                    </button>
                </div>
            </div>
            <div className="flex items-center space-x-1 ml-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="text-gray-400 hover:text-white p-1"
                >
                    <Edit2 size={14} />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="text-gray-400 hover:text-red-400 p-1"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    </>
);

const CaptionEditForm = ({ caption, onSave, onCancel, onTextChange }) => {
    const [text, setText] = useState(caption.text);
    const [start, setStart] = useState(caption.start);
    const [end, setEnd] = useState(caption.end);

    const handleTextChange = (newText) => {
        setText(newText);
        // Send real-time text updates if handler is provided
        if (onTextChange) {
            onTextChange(newText);
        }
    };

    const handleSave = () => {
        onSave({
            text,
            start: parseFloat(start),
            end: parseFloat(end)
        });
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <textarea
                    value={text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="w-full bg-gray-600 text-white p-2 rounded text-sm resize-none"
                    rows="2"
                    placeholder="Caption text..."
                />
                <div className="absolute top-1 right-1 text-xs text-gray-400">
                    Real-time sync
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-gray-400 text-xs">Start (s)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        className="w-full bg-gray-600 text-white p-1 rounded text-sm"
                    />
                </div>
                <div>
                    <label className="text-gray-400 text-xs">End (s)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        className="w-full bg-gray-600 text-white p-1 rounded text-sm"
                    />
                </div>
            </div>
            <div className="flex justify-end space-x-2">
                <button
                    onClick={onCancel}
                    className="px-2 py-1 text-gray-400 hover:text-white text-sm"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default CaptionEditor;
