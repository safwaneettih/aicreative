
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { videosAPI, RawVideo, VideoClip } from '../../services/api';
import { getStaticFileUrl } from '../../utils/urlHelpers';
import { Upload, Video, Scissors, Wand2, PlayCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

const VideosPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [videos, setVideos] = useState<RawVideo[]>([]);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoClips, setVideoClips] = useState<{ [videoId: number]: VideoClip[] }>({});
  const [processingVideoId, setProcessingVideoId] = useState<number | null>(null);
  const [previewingClip, setPreviewingClip] = useState<VideoClip | null>(null);

  useEffect(() => {
    if (id) {
      fetchVideos();
    }
  }, [id]);

  const fetchVideos = async () => {
    if (!id) return;

    try {
      const response = await videosAPI.getByWorkspace(parseInt(id));
      setVideos(response.data);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid video file (MP4, MOV, AVI, MKV)');
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 100MB');
      return;
    }

    try {
      setIsUploadingVideo(true);
      setUploadProgress(0);

      await videosAPI.upload(parseInt(id), file);

      toast.success('Video uploaded successfully!');
      fetchVideos();
      setUploadProgress(0);
    } catch (error) {
      toast.error('Failed to upload video');
    } finally {
      setIsUploadingVideo(false);
      event.target.value = '';
    }
  };

  const triggerVideoUpload = () => {
    const input = document.getElementById('video-upload') as HTMLInputElement;
    input?.click();
  };

  const fetchVideoClips = async (videoId: number) => {
    try {
      const response = await videosAPI.getClips(videoId);
      setVideoClips(prev => ({
        ...prev,
        [videoId]: response.data
      }));
    } catch (error) {
      console.error('Failed to fetch video clips:', error);
    }
  };

  const handleProcessVideo = async (videoId: number) => {
    try {
      setProcessingVideoId(videoId);
      await videosAPI.process(videoId);
      toast.success('Video processed successfully! AI clips have been generated.');
      await fetchVideos();
      await fetchVideoClips(videoId);
    } catch (error) {
      toast.error('Failed to process video');
    } finally {
      setProcessingVideoId(null);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      await videosAPI.delete(videoId);
      toast.success('Video deleted successfully');
      await fetchVideos();
      setVideoClips(prev => {
        const updated = { ...prev };
        delete updated[videoId];
        return updated;
      });
    } catch (error) {
      toast.error('Failed to delete video');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Videos</h2>
        <div>
          <input
            type="file"
            id="video-upload"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <button
            onClick={triggerVideoUpload}
            disabled={isUploadingVideo}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploadingVideo ? 'Uploading...' : 'Upload Video'}
          </button>
        </div>
      </div>

      {isUploadingVideo && (
        <div className="mb-6">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Uploading video... {uploadProgress}%</p>
        </div>
      )}

      {videos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center flex-1 min-w-0">
                  <Video className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {video.original_name}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs flex-shrink-0 whitespace-nowrap ${video.processed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {video.processed ? 'Processed' : 'Processing'}
                </span>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <div>Size: {(video.file_size / (1024 * 1024)).toFixed(1)} MB</div>
                {video.duration && <div>Duration: {Math.round(video.duration)}s</div>}
                {video.resolution && <div>Resolution: {video.resolution}</div>}
                <div>Uploaded: {new Date(video.created_at).toLocaleDateString()}</div>
              </div>

              <div className="mt-3 flex justify-end space-x-2">
                {!video.processed ? (
                  <button
                    onClick={() => handleProcessVideo(video.id)}
                    disabled={processingVideoId === video.id}
                    className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 disabled:opacity-50 flex items-center whitespace-nowrap"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    {processingVideoId === video.id ? 'Processing...' : 'AI Process'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!videoClips[video.id]) {
                        fetchVideoClips(video.id);
                      }
                    }}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center whitespace-nowrap"
                  >
                    <Scissors className="w-3 h-3 mr-1" />
                    View Clips ({videoClips[video.id]?.length || '?'})
                  </button>
                )}
                <button
                  onClick={() => handleDeleteVideo(video.id)}
                  className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>

              {video.processed && videoClips[video.id] && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-700 mb-2">AI Generated Clips:</p>
                  <div className="space-y-1">
                    {videoClips[video.id].map((clip) => (
                      <div key={clip.id} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 truncate">{clip.name}</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setPreviewingClip(clip)}
                            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                            title="Preview Clip"
                          >
                            <PlayCircle className="w-4 h-4 text-gray-500" />
                          </button>
                          <span className={`px-1 py-0.5 rounded text-xs ${clip.category.toLowerCase() === 'hook' ? 'bg-blue-100 text-blue-700' :
                            clip.category.toLowerCase() === 'body' ? 'bg-green-100 text-green-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                            {clip.category.toString().charAt(0).toUpperCase() + clip.category.toString().slice(1)}
                          </span>
                          <span className="text-gray-500">{clip.duration.toFixed(1)}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
          <p className="text-gray-600 mb-4">Upload your first video to get started with AI creative generation.</p>
          <div>
            <input
              type="file"
              id="video-upload-empty"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
            <button
              onClick={() => {
                const input = document.getElementById('video-upload-empty') as HTMLInputElement;
                input?.click();
              }}
              disabled={isUploadingVideo}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploadingVideo ? 'Uploading...' : 'Upload Video'}
            </button>
          </div>
        </div>
      )}

      {previewingClip && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl relative overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Preview: {previewingClip.name}</h3>
              <button
                onClick={() => setPreviewingClip(null)}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <video
                src={getStaticFileUrl(previewingClip.file_path)}
                controls
                autoPlay
                className="w-full h-auto max-h-[70vh] rounded-md shadow"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setPreviewingClip(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideosPage;
