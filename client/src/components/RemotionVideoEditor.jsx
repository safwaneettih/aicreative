import React, { useState, useEffect } from 'react';
import { ExternalLink, Play, Settings, CheckCircle, AlertCircle } from 'lucide-react';

const RemotionVideoEditor = ({ compositionId, onClose }) => {
    const [studioStatus, setStudioStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [videoData, setVideoData] = useState(null);

    // Check Remotion Studio status
    const checkStudioStatus = async () => {
        try {
            const response = await fetch('/api/remotion/status');
            const data = await response.json();
            setStudioStatus(data);
        } catch (error) {
            console.error('Error checking studio status:', error);
            setStudioStatus({ studioRunning: false, error: 'Connection failed' });
        }
    };

    // Load composition data
    const loadComposition = async () => {
        try {
            const response = await fetch(`/api/compositions/${compositionId}`);
            const data = await response.json();
            setVideoData(data);
        } catch (error) {
            console.error('Error loading composition:', error);
            setMessage('Failed to load composition data');
        }
    };

    useEffect(() => {
        checkStudioStatus();
        loadComposition();

        // Check studio status every 10 seconds
        const interval = setInterval(checkStudioStatus, 10000);
        return () => clearInterval(interval);
    }, [compositionId]);

    // Prepare video for Remotion editing
    const prepareForRemotion = async () => {
        setLoading(true);
        setMessage('Preparing video for Remotion Studio...');

        try {
            const response = await fetch('/api/remotion/prepare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoPath: videoData.video_path,
                    captionTracks: videoData.caption_tracks
                })
            });

            const result = await response.json();

            if (result.success) {
                setMessage(result.message);
                await checkStudioStatus(); // Refresh status
            } else {
                setMessage(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error preparing for Remotion:', error);
            setMessage('Failed to prepare video for Remotion');
        }

        setLoading(false);
    };

    // Process video automatically with Remotion
    const processWithRemotion = async () => {
        setLoading(true);
        setMessage('Processing video with Remotion (this may take a few minutes)...');

        try {
            const response = await fetch('/api/remotion/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoPath: videoData.video_path,
                    captionTracks: videoData.caption_tracks,
                    outputName: `composition-${compositionId}-${Date.now()}.mp4`
                })
            });

            const result = await response.json();

            if (result.success) {
                setMessage(`Video processed successfully! Output: ${result.outputPath}`);
            } else {
                setMessage(`Processing failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Error processing with Remotion:', error);
            setMessage('Failed to process video with Remotion');
        }

        setLoading(false);
    };

    // Open Remotion Studio
    const openStudio = () => {
        if (studioStatus?.studioUrl) {
            window.open(studioStatus.studioUrl, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Remotion Video Editor
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Studio Status */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            {studioStatus?.studioRunning ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                            )}
                            <div>
                                <h3 className="font-medium text-gray-900">
                                    Remotion Studio Status
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {studioStatus?.message || 'Checking...'}
                                </p>
                                {studioStatus?.studioUrl && (
                                    <p className="text-xs text-blue-600">
                                        {studioStatus.studioUrl}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Video Info */}
                    {videoData && (
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-2">
                                Current Composition
                            </h3>
                            <div className="text-sm text-gray-600 space-y-1">
                                <p><strong>Video:</strong> {videoData.video_path}</p>
                                <p><strong>Captions:</strong> {videoData.caption_tracks?.length || 0} tracks</p>
                                <p><strong>Duration:</strong> {videoData.duration || 'Unknown'} frames</p>
                            </div>
                        </div>
                    )}

                    {/* Options */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900">
                            Choose Your Editing Approach
                        </h3>

                        {/* Option 1: Manual Editing */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <Settings className="h-5 w-5 text-blue-500 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">
                                        Manual Editing (Recommended)
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Use Remotion Studio's professional interface for full control over your video editing.
                                    </p>
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={prepareForRemotion}
                                            disabled={loading}
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                                        >
                                            Prepare for Editing
                                        </button>
                                        {studioStatus?.studioRunning && (
                                            <button
                                                onClick={openStudio}
                                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center space-x-2"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                <span>Open Studio</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Option 2: Automatic Processing */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <Play className="h-5 w-5 text-purple-500 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">
                                        Automatic Processing
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Let Remotion automatically render your video with the current captions.
                                    </p>
                                    <button
                                        onClick={processWithRemotion}
                                        disabled={loading || !videoData}
                                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
                                    >
                                        Process Automatically
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    {message && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-700">{message}</p>
                        </div>
                    )}

                    {/* Setup Instructions */}
                    {!studioStatus?.studioRunning && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-medium text-yellow-800 mb-2">
                                Start Remotion Studio
                            </h4>
                            <p className="text-sm text-yellow-700 mb-2">
                                To use the professional video editor, start Remotion Studio:
                            </p>
                            <code className="block bg-yellow-100 p-2 rounded text-sm text-yellow-800">
                                cd remotion-tiktok-template && npm run dev
                            </code>
                        </div>
                    )}

                    {/* Benefits */}
                    <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">
                            Why Use Remotion?
                        </h4>
                        <ul className="text-sm text-green-700 space-y-1">
                            <li>✅ Rock-solid stability (no browser crashes)</li>
                            <li>✅ Professional video editing interface</li>
                            <li>✅ Frame-accurate timeline and controls</li>
                            <li>✅ Advanced caption styling and positioning</li>
                            <li>✅ High-quality video rendering</li>
                            <li>✅ Real-time preview with smooth playback</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RemotionVideoEditor;
