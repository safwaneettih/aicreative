import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Download, Save, Users } from 'lucide-react';
import EditorPreview from './EditorPreview';
import CaptionEditor from './CaptionEditor';
import StylePanel from './StylePanel';
import Timeline from './Timeline';
import AdvancedTimeline from './AdvancedTimeline';
import SimpleTimeline from './SimpleTimeline';
import ExportModal from './ExportModal';
import { useEditorState } from '../../hooks/useEditorState';
import { useWebSocket } from '../../hooks/useWebSocket';

const VideoEditor = ({ compositionId, onClose }) => {
    const {
        editorState,
        updateCaptions,
        updateStyles,
        saveSession,
        isLoading,
        isDirty
    } = useEditorState(compositionId);

    const {
        // socket, // Will be used for advanced features
        isConnected,
        error,
        emit,
        joinEditor,
        leaveEditor,
        sendEditorUpdate
    } = useWebSocket();

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [showExportModal, setShowExportModal] = useState(false);
    const [activePanel, setActivePanel] = useState('captions'); // captions, styles
    const [useAdvancedTimeline, setUseAdvancedTimeline] = useState(true);
    const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

    const playerRef = useRef();

    // Create WebSocket actions for real-time collaboration
    const websocketActions = {
        updateCaption: (captionId, changes) => {
            if (emit && isConnected) {
                emit('caption-update', {
                    compositionId,
                    captionId,
                    changes
                });
            }
        },

        seekTimeline: (currentFrame) => {
            if (emit && isConnected) {
                emit('timeline-seek', {
                    compositionId,
                    currentFrame
                });
            }
        },

        updateStyle: (styleChanges) => {
            if (emit && isConnected) {
                emit('style-update', {
                    compositionId,
                    styleChanges
                });
            }
        }
    };

    // Mock connectedUsers and lastUpdate for now
    const connectedUsers = [];
    const lastUpdate = null;

    // Debug logging
    console.log('🎬 VideoEditor state:', {
        compositionId,
        editorState,
        isLoading,
        isConnected,
        error
    });

    // Handle real-time collaboration
    useEffect(() => {
        if (isConnected && compositionId) {
            joinEditor(compositionId);

            return () => {
                leaveEditor(compositionId);
            };
        }
    }, [isConnected, compositionId, joinEditor, leaveEditor]);

    // Handle real-time collaboration updates (placeholder for when WebSocket events are properly set up)
    useEffect(() => {
        if (lastUpdate) {
            const { type, data } = lastUpdate;

            switch (type) {
                case 'caption-update':
                    console.log('📝 Applying caption update from another user:', data);
                    break;

                case 'timeline-seek':
                    console.log('⏱️ Another user moved timeline to:', data.currentFrame);
                    break;

                case 'style-update':
                    console.log('🎨 Applying style update from another user:', data);
                    if (data.styleChanges) {
                        updateStyles(data.styleChanges);
                    }
                    break;

                default:
                    break;
            }
        }
    }, [lastUpdate, updateStyles]);

    // Auto-save functionality
    useEffect(() => {
        if (isDirty) {
            const timer = setTimeout(() => {
                saveSession();
            }, 2000); // Save after 2 seconds of no changes

            return () => clearTimeout(timer);
        }
    }, [isDirty, saveSession]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Ignore if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
                return;
            }

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    handlePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleFrameStep(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleFrameStep(1);
                    break;
                case 'Home':
                    e.preventDefault();
                    handleTimelineSeek(0);
                    break;
                case 'End':
                    e.preventDefault();
                    handleTimelineSeek((editorState.duration || 300) - 1);
                    break;
                case 'j':
                    e.preventDefault();
                    handleFrameStep(-10);
                    break;
                case 'k':
                    e.preventDefault();
                    handlePlay();
                    break;
                case 'l':
                    e.preventDefault();
                    handleFrameStep(10);
                    break;
                case '?':
                    e.preventDefault();
                    setShowKeyboardShortcuts(!showKeyboardShortcuts);
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying, currentFrame, editorState.duration]);

    const handlePlay = () => {
        if (playerRef.current) {
            if (isPlaying) {
                playerRef.current.pause();
            } else {
                playerRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleStop = () => {
        if (playerRef.current) {
            playerRef.current.pause();
            playerRef.current.seekTo(0);
            setCurrentFrame(0);
            setIsPlaying(false);
        }
    };

    const handleFrameStep = (direction) => {
        const newFrame = Math.max(0, Math.min((editorState.duration || 300) - 1, currentFrame + direction));
        setCurrentFrame(newFrame);
        if (playerRef.current) {
            playerRef.current.seekTo(newFrame);
        }
    };

    const handleSeek = (frame) => {
        console.log('🎬 Player seek to frame:', frame);
        if (playerRef.current) {
            playerRef.current.seekTo(frame);
            setCurrentFrame(frame);
        }
    };

    const handleSave = async () => {
        try {
            await saveSession();
            // Show success toast
        } catch (error) {
            console.error('Failed to save:', error);
            // Show error toast
        }
    };

    const handleExport = () => {
        setShowExportModal(true);
    };

    const handleCaptionReposition = (captionIndex, updatedCaption) => {
        // Update local state immediately for smooth UX
        const updatedCaptions = [...(editorState.captions || [])];
        if (updatedCaptions[0] && updatedCaptions[0].caption_data) {
            updatedCaptions[0].caption_data[captionIndex] = updatedCaption;
            updateCaptions(updatedCaptions);
        }
    };

    const handleCaptionUpdate = (captionId, changes) => {
        // Send updates to other users via WebSocket
        if (websocketActions) {
            websocketActions.updateCaption(captionId, changes);
        }
    };

    const handleStyleChange = (newStyles) => {
        updateStyles(newStyles);

        // Send style updates to other users
        if (websocketActions) {
            websocketActions.updateStyle(newStyles);
        }
    };

    const handleTimelineSeek = (frame) => {
        console.log('🎬 Timeline seek to frame:', frame);
        setCurrentFrame(frame);
        if (playerRef.current) {
            playerRef.current.seekTo(frame);
        }

        // Send timeline position to other users (debounced)
        if (websocketActions) {
            websocketActions.seekTimeline(frame);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="text-white">Loading video editor...</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-gray-900 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-600 shadow-lg">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center space-x-2"
                    >
                        <span>←</span>
                        <span>Back</span>
                    </button>
                    <div className="flex items-center space-x-3">
                        <h1 className="text-white font-semibold text-lg">Video Editor</h1>
                        {isDirty && (
                            <span className="text-yellow-400 text-sm bg-yellow-400/10 px-2 py-1 rounded-full">
                                Unsaved changes
                            </span>
                        )}
                    </div>

                    {/* Collaboration Status */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-gray-300 text-sm">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        {connectedUsers.length > 0 && (
                            <button
                                onClick={() => setShowCollaborationPanel(!showCollaborationPanel)}
                                className="flex items-center space-x-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg transition-colors duration-200"
                            >
                                <Users size={16} />
                                <span className="text-sm">{connectedUsers.length + 1}</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                        className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded transition-colors duration-200"
                        title="Keyboard Shortcuts (? to toggle)"
                    >
                        ⌨️
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded flex items-center space-x-1"
                    >
                        <Save size={16} />
                        <span>Save</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center space-x-1"
                    >
                        <Download size={16} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Left Panel - Editor Controls */}
                <div className="w-80 bg-gray-800 border-r border-gray-600 flex flex-col min-h-0">
                    {/* Panel Tabs */}
                    <div className="flex border-b border-gray-600 flex-shrink-0 bg-gray-700">
                        {[
                            { id: 'captions', label: 'Captions' },
                            { id: 'styles', label: 'Styles' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActivePanel(tab.id)}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 ${activePanel === tab.id
                                    ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Panel Content */}
                    <div className="flex-1 overflow-hidden min-h-0">
                        {activePanel === 'captions' && (
                            <CaptionEditor
                                captions={editorState.captionTracks}
                                onUpdateCaptions={updateCaptions}
                                currentFrame={currentFrame}
                                onSeek={handleTimelineSeek}
                                websocketActions={websocketActions}
                            />
                        )}
                        {activePanel === 'styles' && (
                            <StylePanel
                                styles={editorState.styles}
                                onUpdateStyles={handleStyleChange}
                                websocketActions={websocketActions}
                            />
                        )}
                    </div>
                </div>

                {/* Center Panel - Video Preview */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Video Preview Container - properly constrained */}
                    <div className="flex-1 bg-gray-900 flex items-center justify-center min-h-0 p-4 overflow-hidden">
                        <div
                            className="relative w-auto h-auto bg-black rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
                            style={{
                                maxWidth: 'min(400px, calc(100% - 2rem))',
                                maxHeight: 'calc(100% - 2rem)',
                                aspectRatio: '9/16', // TikTok aspect ratio
                                minHeight: '200px' // Ensure minimum readable size
                            }}
                        >
                            <EditorPreview
                                ref={playerRef}
                                compositionId={compositionId}
                                inputProps={{
                                    videoSrc: editorState.videoSrc,
                                    captionTracks: editorState.captionTracks,
                                    styles: editorState.styles,
                                    animations: editorState.animations,
                                    duration: editorState.duration
                                }}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onFrameUpdate={(frame) => {
                                    console.log('🎥 Frame update from player:', frame);
                                    setCurrentFrame(frame);
                                }}
                                width={360}
                                height={640}
                            />
                        </div>
                    </div>

                    {/* Transport Controls - Always visible at bottom with guaranteed space */}
                    <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-600 flex-shrink-0 min-h-[80px] z-10 shadow-lg">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => handleFrameStep(-1)}
                                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded transition-colors duration-200"
                                title="Previous Frame"
                            >
                                ⏪
                            </button>
                            <button
                                onClick={handlePlay}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors duration-200 shadow-lg hover:shadow-blue-500/25"
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                            </button>
                            <button
                                onClick={() => handleFrameStep(1)}
                                className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded transition-colors duration-200"
                                title="Next Frame"
                            >
                                ⏩
                            </button>
                            <button
                                onClick={handleStop}
                                className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full transition-colors duration-200 hover:shadow-lg"
                                title="Stop"
                            >
                                <Square size={24} />
                            </button>
                        </div>

                        <div className="flex items-center space-x-6 text-gray-300">
                            <span className="text-sm font-mono bg-gray-700 px-3 py-2 rounded border border-gray-600">
                                Frame: <span className="text-blue-300">{currentFrame}</span>
                            </span>
                            <span className="text-sm bg-gray-700 px-3 py-2 rounded border border-gray-600">
                                Duration: <span className="text-green-300">{Math.floor((editorState.duration || 300) / 30)}s</span>
                            </span>
                            {editorState.compositionName && (
                                <span className="text-sm text-gray-400 bg-gray-700 px-3 py-2 rounded border border-gray-600">
                                    {editorState.compositionName}
                                </span>
                            )}

                            {/* Connection Status */}
                            <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-xs text-gray-400">
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Timeline Section */}
            <div className="bg-gray-800 border-t border-gray-600 flex-shrink-0">
                {/* Timeline Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-600 bg-gray-700">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-white font-medium">Timeline</h3>
                        <button
                            onClick={() => setUseAdvancedTimeline(!useAdvancedTimeline)}
                            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
                            title={useAdvancedTimeline ? 'Switch to Basic Timeline' : 'Switch to Advanced Timeline'}
                        >
                            {useAdvancedTimeline ? '🎵 Advanced' : '📊 Basic'}
                        </button>

                        {/* Zoom Controls for Advanced Timeline */}
                        {useAdvancedTimeline && (
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => {/* Zoom out functionality - will be implemented in AdvancedTimeline */ }}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
                                    title="Zoom Out"
                                >
                                    🔍-
                                </button>
                                <button
                                    onClick={() => {/* Zoom in functionality - will be implemented in AdvancedTimeline */ }}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
                                    title="Zoom In"
                                >
                                    🔍+
                                </button>
                                <button
                                    onClick={() => {/* Fit to timeline functionality */ }}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
                                    title="Fit Timeline"
                                >
                                    📏
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-300">
                        <span>Duration: {Math.floor((editorState.duration || 300) / 30)}s</span>
                        <span>•</span>
                        <span>Frame: <span className="text-blue-300 font-mono">{currentFrame}</span></span>
                        <span>•</span>
                        <span>Time: <span className="text-green-300 font-mono">{(currentFrame / 30).toFixed(2)}s</span></span>
                        {isConnected && (
                            <>
                                <span>•</span>
                                <span className="text-green-400">🔗 Live</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Timeline Content */}
                <div className="h-48 overflow-hidden">
                    {useAdvancedTimeline ? (
                        <AdvancedTimeline
                            captions={editorState.captionTracks}
                            currentFrame={currentFrame}
                            onSeek={handleTimelineSeek}
                            duration={editorState.duration || 300}
                            audioSrc={editorState.audioSrc}
                            onCaptionUpdate={handleCaptionUpdate}
                            onCaptionReposition={handleCaptionReposition}
                            websocketActions={websocketActions}
                        />
                    ) : (
                        <SimpleTimeline
                            captions={editorState.captionTracks}
                            currentFrame={currentFrame}
                            onSeek={handleTimelineSeek}
                            duration={editorState.duration || 300}
                            onCaptionUpdate={handleCaptionUpdate}
                            onCaptionReposition={handleCaptionReposition}
                            websocketActions={websocketActions}
                        />
                    )}
                </div>
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <ExportModal
                    compositionId={compositionId}
                    editorState={editorState}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {/* Collaboration Panel */}
            {showCollaborationPanel && (
                <div className="fixed top-16 right-4 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-4">
                        <h3 className="text-white font-medium mb-3">Collaboration</h3>

                        <div className="space-y-2">
                            <div className="text-sm text-gray-300">
                                <span className="text-green-500">● You</span> (Editor)
                            </div>

                            {connectedUsers.map((userId, index) => (
                                <div key={userId} className="text-sm text-gray-300">
                                    <span className="text-blue-500">●</span> User {index + 1}
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-700">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Real-time sync</span>
                                <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
                                    {isConnected ? 'ON' : 'OFF'}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowCollaborationPanel(false)}
                            className="mt-3 w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {/* Keyboard Shortcuts Help Panel */}
            {showKeyboardShortcuts && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-medium text-lg">Keyboard Shortcuts</h3>
                            <button
                                onClick={() => setShowKeyboardShortcuts(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-blue-300 font-medium mb-2">Playback</h4>
                                    <div className="space-y-1 text-gray-300">
                                        <div className="flex justify-between">
                                            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Space</kbd>
                                            <span>Play/Pause</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">K</kbd>
                                            <span>Play/Pause</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">Home</kbd>
                                            <span>Go to Start</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">End</kbd>
                                            <span>Go to End</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-green-300 font-medium mb-2">Navigation</h4>
                                    <div className="space-y-1 text-gray-300">
                                        <div className="flex justify-between">
                                            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">←</kbd>
                                            <span>Previous Frame</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">→</kbd>
                                            <span>Next Frame</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">J</kbd>
                                            <span>-10 Frames</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <kbd className="bg-gray-700 px-2 py-1 rounded text-xs">L</kbd>
                                            <span>+10 Frames</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-gray-700">
                                <div className="text-gray-400 text-xs">
                                    💡 <strong>Pro tip:</strong> Use J-K-L for professional video editing navigation (rewind, play/pause, fast forward)
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowKeyboardShortcuts(false)}
                            className="mt-4 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200"
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoEditor;
