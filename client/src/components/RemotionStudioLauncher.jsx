import React, { useState, useEffect } from 'react';

const RemotionStudioLauncher = ({ videoId, videoPath, captionsPath }) => {
  const [studioStatus, setStudioStatus] = useState('checking');
  const [studioUrl, setStudioUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStudioStatus();
  }, []);

  const checkStudioStatus = async () => {
    try {
      const response = await fetch('/api/remotion-studio/status');
      const data = await response.json();

      if (data.success) {
        setStudioStatus(data.running ? 'running' : 'stopped');
        if (data.running) {
          setStudioUrl(data.studioUrl);
        }
      } else {
        setStudioStatus('error');
        setError(data.error);
      }
    } catch (err) {
      setStudioStatus('error');
      setError('Failed to check Remotion Studio status');
    }
  };

  const prepareVideoForEditing = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/remotion-studio/prepare-existing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoPath,
          captionsPath,
          options: {
            width: 1080,
            height: 1920,
            fps: 30
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStudioUrl(data.studioUrl);
        // Open Remotion Studio in new window
        window.open(data.studioUrl, '_blank');
      } else {
        setError(data.error || 'Failed to prepare video for editing');
      }
    } catch (err) {
      setError('Failed to prepare video for editing');
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'running':
        return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
      case 'stopped':
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
      case 'checking':
        return <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-500 rounded-full"></div>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Professional Video Editor
        </h3>
        <div className="flex items-center space-x-2">
          <StatusIcon status={studioStatus} />
          <span className="text-sm text-gray-600">
            {studioStatus === 'running' ? 'Ready' :
              studioStatus === 'stopped' ? 'Not Running' :
                studioStatus === 'checking' ? 'Checking...' : 'Error'}
          </span>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Edit your video with professional tools using Remotion Studio - a stable,
        feature-rich editor designed specifically for TikTok-style videos with captions.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {studioStatus === 'stopped' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="text-yellow-800 text-sm">
            <strong>Remotion Studio is not running.</strong>
            <br />
            To start it, run the following command in your terminal:
            <div className="bg-gray-100 p-2 mt-2 rounded font-mono text-xs">
              cd remotion-tiktok-template && npm run dev
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {studioStatus === 'running' ? (
          <>
            <button
              onClick={prepareVideoForEditing}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Preparing Video...
                </div>
              ) : (
                'Open in Remotion Studio'
              )}
            </button>

            {studioUrl && (
              <button
                onClick={() => window.open(studioUrl, '_blank')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Open Studio Direct
              </button>
            )}
          </>
        ) : (
          <button
            onClick={checkStudioStatus}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Check Studio Status
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Features:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Professional timeline editing</li>
          <li>• Real-time preview</li>
          <li>• TikTok-optimized captions</li>
          <li>• High-quality rendering</li>
          <li>• No browser crashes or errors</li>
        </ul>
      </div>
    </div>
  );
};

export default RemotionStudioLauncher;
