import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Settings } from 'lucide-react';

const ExportModal = ({ compositionId, editorState, onClose }) => {
    const [exportSettings, setExportSettings] = useState({
        resolution: '1080x1920',
        fps: 30,
        codec: 'h264',
        quality: 'high',
        format: 'mp4'
    });

    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState('idle'); // idle, processing, completed, failed

    const pollIntervalRef = useRef(null);
    const timeoutRef = useRef(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    const resolutionOptions = [
        { label: '1080x1920 (Full HD)', value: '1080x1920' },
        { label: '720x1280 (HD)', value: '720x1280' },
        { label: '480x854 (SD)', value: '480x854' }
    ];

    const qualityOptions = [
        { label: 'High (Best Quality)', value: 'high', crf: 18 },
        { label: 'Medium (Balanced)', value: 'medium', crf: 23 },
        { label: 'Low (Smaller File)', value: 'low', crf: 28 }
    ];

    const handleExport = async () => {
        try {
            setIsExporting(true);
            setExportStatus('processing');
            setExportProgress(0);

            // Prepare render settings
            const renderSettings = {
                ...exportSettings,
                inputProps: {
                    videoSrc: editorState.videoSrc,
                    captionTracks: editorState.captionTracks,
                    styles: editorState.styles,
                    animations: editorState.animations
                },
                compositionWidth: parseInt(exportSettings.resolution.split('x')[0]),
                compositionHeight: parseInt(exportSettings.resolution.split('x')[1]),
                crf: qualityOptions.find(q => q.value === exportSettings.quality)?.crf || 23
            };

            // Start the render job
            const response = await fetch('/api/editor/render', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    compositionId,
                    settings: renderSettings
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start render');
            }

            const { jobId } = await response.json();

            // Poll for progress
            if (isMountedRef.current) {
                pollRenderProgress(jobId);
            }

        } catch (error) {
            if (isMountedRef.current) {
                console.error('Export failed:', error);
                setExportStatus('failed');
                setIsExporting(false);
            }
        }
    };

    const pollRenderProgress = async (jobId) => {
        // Clear any existing intervals/timeouts
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        pollIntervalRef.current = setInterval(async () => {
            if (!isMountedRef.current) {
                clearInterval(pollIntervalRef.current);
                return;
            }

            try {
                const response = await fetch(`/api/editor/render/${jobId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to get render status');
                }

                const job = await response.json();

                if (isMountedRef.current) {
                    setExportProgress(Math.round(job.progress * 100));

                    if (job.status === 'completed') {
                        setExportStatus('completed');
                        setIsExporting(false);
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;

                        // Trigger download
                        if (job.output_path) {
                            const downloadUrl = `/uploads/${job.output_path.split('/').pop()}`;
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = `export_${Date.now()}.mp4`;
                            link.click();
                        }
                    } else if (job.status === 'failed') {
                        setExportStatus('failed');
                        setIsExporting(false);
                        clearInterval(pollIntervalRef.current);
                        pollIntervalRef.current = null;
                    }
                }
            } catch (error) {
                if (isMountedRef.current) {
                    console.error('Failed to poll render progress:', error);
                    setExportStatus('failed');
                    setIsExporting(false);
                }
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        }, 2000); // Poll every 2 seconds

        // Cleanup after 5 minutes
        timeoutRef.current = setTimeout(() => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            if (isMountedRef.current && isExporting) {
                setExportStatus('failed');
                setIsExporting(false);
            }
        }, 5 * 60 * 1000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white text-xl font-semibold">Export Video</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                        disabled={isExporting}
                    >
                        <X size={24} />
                    </button>
                </div>

                {exportStatus === 'idle' && (
                    <>
                        {/* Export Settings */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Resolution</label>
                                <select
                                    value={exportSettings.resolution}
                                    onChange={(e) => setExportSettings({
                                        ...exportSettings,
                                        resolution: e.target.value
                                    })}
                                    className="w-full bg-gray-700 text-white p-2 rounded"
                                >
                                    {resolutionOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Frame Rate</label>
                                <select
                                    value={exportSettings.fps}
                                    onChange={(e) => setExportSettings({
                                        ...exportSettings,
                                        fps: parseInt(e.target.value)
                                    })}
                                    className="w-full bg-gray-700 text-white p-2 rounded"
                                >
                                    <option value={24}>24 FPS</option>
                                    <option value={30}>30 FPS</option>
                                    <option value={60}>60 FPS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Quality</label>
                                <select
                                    value={exportSettings.quality}
                                    onChange={(e) => setExportSettings({
                                        ...exportSettings,
                                        quality: e.target.value
                                    })}
                                    className="w-full bg-gray-700 text-white p-2 rounded"
                                >
                                    {qualityOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Format</label>
                                <select
                                    value={exportSettings.format}
                                    onChange={(e) => setExportSettings({
                                        ...exportSettings,
                                        format: e.target.value
                                    })}
                                    className="w-full bg-gray-700 text-white p-2 rounded"
                                >
                                    <option value="mp4">MP4</option>
                                    <option value="mov">MOV</option>
                                    <option value="webm">WebM</option>
                                </select>
                            </div>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 rounded flex items-center justify-center space-x-2"
                        >
                            <Download size={20} />
                            <span>Start Export</span>
                        </button>
                    </>
                )}

                {exportStatus === 'processing' && (
                    <div className="text-center">
                        <div className="mb-4">
                            <div className="w-16 h-16 mx-auto mb-4">
                                <svg className="animate-spin w-full h-full text-blue-500" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="32">
                                        <animate attributeName="stroke-dasharray" dur="2s" values="0 64;32 32;0 64" repeatCount="indefinite" />
                                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-32;-64" repeatCount="indefinite" />
                                    </circle>
                                </svg>
                            </div>
                            <p className="text-white text-lg mb-2">Exporting Video...</p>
                            <p className="text-gray-400 text-sm">This may take a few minutes</p>
                        </div>

                        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${exportProgress}%` }}
                            />
                        </div>

                        <p className="text-gray-400 text-sm">{exportProgress}% complete</p>
                    </div>
                )}

                {exportStatus === 'completed' && (
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 text-green-500">
                            <svg fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                        </div>
                        <p className="text-white text-lg mb-2">Export Complete!</p>
                        <p className="text-gray-400 text-sm mb-4">Your video has been exported and downloaded.</p>
                        <button
                            onClick={onClose}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                        >
                            Close
                        </button>
                    </div>
                )}

                {exportStatus === 'failed' && (
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 text-red-500">
                            <svg fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                            </svg>
                        </div>
                        <p className="text-white text-lg mb-2">Export Failed</p>
                        <p className="text-gray-400 text-sm mb-4">There was an error exporting your video. Please try again.</p>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    setExportStatus('idle');
                                    setExportProgress(0);
                                }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportModal;
