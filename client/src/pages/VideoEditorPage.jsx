import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoEditor from '../components/VideoEditor/VideoEditor';
import RemotionStudioLauncher from '../components/RemotionStudioLauncher';

const VideoEditorPage = () => {
    const { compositionId } = useParams();
    const navigate = useNavigate();
    const [composition, setComposition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [useStableEditor, setUseStableEditor] = useState(true);

    const handleClose = () => {
        navigate('/dashboard');
    };

    useEffect(() => {
        if (compositionId) {
            fetchComposition();
        }
    }, [compositionId]);

    const fetchComposition = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/compositions/${compositionId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch composition');
            }

            const data = await response.json();
            setComposition(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!compositionId) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center">
                    <h1 className="text-2xl font-bold mb-4">Invalid Composition</h1>
                    <p className="text-gray-400 mb-4">No composition ID provided.</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading composition...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Video Editor</h1>
                        <p className="text-gray-600">
                            Editing: {composition?.name || `Composition ${compositionId}`}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-600">Editor:</label>
                            <select
                                value={useStableEditor ? 'stable' : 'legacy'}
                                onChange={(e) => setUseStableEditor(e.target.value === 'stable')}
                                className="border border-gray-300 rounded px-3 py-1 text-sm"
                            >
                                <option value="stable">Remotion Studio (Stable)</option>
                                <option value="legacy">Legacy Editor (Experimental)</option>
                            </select>
                        </div>
                        <button
                            onClick={handleClose}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Content */}
            <div className="p-6">
                {useStableEditor ? (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h3 className="text-blue-800 font-medium mb-2">🎬 Recommended: Remotion Studio</h3>
                            <p className="text-blue-700 text-sm">
                                For the best editing experience with professional tools and zero crashes,
                                we recommend using Remotion Studio. It's specifically designed for TikTok-style
                                videos with captions and provides a stable, feature-rich editing environment.
                            </p>
                        </div>

                        <RemotionStudioLauncher
                            videoId={compositionId}
                            videoPath={composition?.video_url}
                            captionsPath={composition?.captions_path}
                        />

                        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Workflow:</h3>
                            <ol className="list-decimal list-inside space-y-2 text-gray-600">
                                <li>Click "Open in Remotion Studio" to launch the professional editor</li>
                                <li>Edit your video with advanced tools and real-time preview</li>
                                <li>Render your final video directly in Remotion Studio</li>
                                <li>Download or export your finished video</li>
                            </ol>
                        </div>
                    </div>
                ) : (
                    <div className="fixed inset-0 top-16 bg-gray-900 overflow-hidden">
                        <div className="bg-yellow-50 border border-yellow-200 p-4 m-4 rounded-lg">
                            <div className="text-yellow-800 text-sm">
                                <strong>⚠️ Experimental Editor:</strong> This editor may have stability issues.
                                We recommend using Remotion Studio for the best experience.
                            </div>
                        </div>
                        <VideoEditor
                            compositionId={compositionId}
                            onClose={handleClose}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoEditorPage;
