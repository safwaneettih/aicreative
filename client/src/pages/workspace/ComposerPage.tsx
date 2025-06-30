
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { compositionsAPI, videosAPI, voicesAPI, VideoComposition, VideoClip, Voiceover, CompositionJob, CaptionStyle } from '../../services/api';
import { getStaticFileUrl } from '../../utils/urlHelpers';
import { Plus, Trash2, PlayCircle, Download, Edit, Clock, AlertCircle, CheckCircle, Clapperboard, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ComposerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [compositions, setCompositions] = useState<VideoComposition[]>([]);
  const [allClips, setAllClips] = useState<VideoClip[]>([]);
  const [voiceovers, setVoiceovers] = useState<Voiceover[]>([]);
  const [selectedClips, setSelectedClips] = useState<{
    hook: VideoClip | null;
    body: VideoClip[];
    cat: VideoClip | null;
  }>({
    hook: null,
    body: [],
    cat: null
  });
  const [selectedVoiceover, setSelectedVoiceover] = useState<Voiceover | null>(null);
  const [isGeneratingCompositions, setIsGeneratingCompositions] = useState(false);
  const [compositionJob, setCompositionJob] = useState<CompositionJob | null>(null);
  const [showComposerModal, setShowComposerModal] = useState(false);
  const [compositionName, setCompositionName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('top-right');
  const [logoOpacity, setLogoOpacity] = useState<number>(0.8);
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [captionType, setCaptionType] = useState<'none' | 'basic' | 'tiktok'>('none');
  const [captionStyle, setCaptionStyle] = useState<'default' | 'modern' | 'bold' | 'minimal'>('default');
  const [tiktokCaptionStyle, setTiktokCaptionStyle] = useState<string>('modern');
  const [availableCaptionStyles, setAvailableCaptionStyles] = useState<CaptionStyle[]>([]);
  const [selectedCompositions, setSelectedCompositions] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCompositions();
      fetchAllClips();
      fetchVoiceovers();
      fetchCaptionStyles();
    }
  }, [id]);

  const fetchCompositions = async () => {
    if (!id) return;
    try {
      const response = await compositionsAPI.getByWorkspace(parseInt(id));
      setCompositions(response.data);
    } catch (error) {
      console.error('Failed to fetch compositions:', error);
    }
  };

  const fetchAllClips = async () => {
    if (!id) return;
    try {
      const videosResponse = await videosAPI.getByWorkspace(parseInt(id));
      const videos = videosResponse.data;
      const clipsPromises = videos
        .filter(video => video.processed)
        .map(video => videosAPI.getClips(video.id));
      const clipsResponses = await Promise.all(clipsPromises);
      const allClips = clipsResponses.flatMap(response => response.data);
      setAllClips(allClips);
    } catch (error) {
      console.error('Failed to fetch all clips:', error);
    }
  };

  const fetchVoiceovers = async () => {
    if (!id) return;
    try {
      const response = await voicesAPI.getByWorkspace(parseInt(id));
      setVoiceovers(response.data);
    } catch (error) {
      console.error('Failed to fetch voiceovers:', error);
    }
  };

  const fetchCaptionStyles = async () => {
    try {
      const response = await compositionsAPI.getCaptionStyles();
      if (response.data.success) {
        setAvailableCaptionStyles(response.data.styles);
      }
    } catch (error) {
      console.error('Error fetching caption styles:', error);
    }
  };

  const handleCreateCompositions = async () => {
    if (!id || !selectedVoiceover) {
      toast.error('Please select a voiceover');
      return;
    }

    if (!selectedClips.hook && selectedClips.body.length === 0 && !selectedClips.cat) {
      toast.error('Please select at least one clip');
      return;
    }

    if (!compositionName.trim()) {
      toast.error('Please enter a composition name');
      return;
    }

    try {
      setIsGeneratingCompositions(true);

      let logoPath = null;
      if (logoFile) {
        try {
          const logoResponse = await compositionsAPI.uploadLogo(parseInt(id), logoFile);
          logoPath = logoResponse.data.logoPath;
        } catch (error) {
          console.error('Logo upload failed:', error);
          toast.error('Failed to upload logo, proceeding without logo');
        }
      }

      const combinations = [{
        hook_clip_id: selectedClips.hook?.id,
        body_clip_ids: selectedClips.body.map(clip => clip.id),
        cat_clip_id: selectedClips.cat?.id,
        voiceover_id: selectedVoiceover.id,
        logo_overlay_path: logoPath,
        logo_position: logoFile ? logoPosition : undefined,
        logo_opacity: logoFile ? logoOpacity : undefined,
        logo_size: logoFile ? logoSize : undefined,
        enable_captions: captionType === 'basic',
        caption_style: captionType === 'basic' ? captionStyle : undefined,
        tiktok_captions_enabled: captionType === 'tiktok',
        tiktok_caption_style: captionType === 'tiktok' ? tiktokCaptionStyle : undefined,
      }];

      const response = await compositionsAPI.create(parseInt(id), {
        name: compositionName,
        combinations
      });

      setCompositionJob(response.data);
      toast.success('Video composition started!');
      setShowComposerModal(false);

      // Reset form
      setSelectedClips({ hook: null, body: [], cat: null });
      setSelectedVoiceover(null);
      setCompositionName('');
      setLogoFile(null);
      setLogoPreview(null);
      setCaptionType('none');

      pollCompositionJob(response.data.id);

    } catch (error) {
      toast.error('Failed to create compositions');
    } finally {
      setIsGeneratingCompositions(false);
    }
  };

  const pollCompositionJob = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await compositionsAPI.getJob(jobId);
        setCompositionJob(response.data);

        if (response.data.status === 'completed' || response.data.status === 'failed') {
          clearInterval(pollInterval);
          await fetchCompositions();

          if (response.data.status === 'completed') {
            toast.success(`Successfully generated ${response.data.completed_count} videos!`);
          } else {
            toast.error(`Job failed. ${response.data.failed_count} videos failed to generate.`);
          }
        }
      } catch (error) {
        clearInterval(pollInterval);
        console.error('Failed to poll job status:', error);
      }
    }, 2000);
  };

  const handleDeleteComposition = async (compositionId: number) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await compositionsAPI.delete(compositionId);
      toast.success('Video deleted successfully');
      await fetchCompositions();
    } catch (error) {
      toast.error('Failed to delete video');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCompositions.size === 0) {
      toast.error('No videos selected');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedCompositions.size} video${selectedCompositions.size > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setIsBulkDeleting(true);
      const compositionIds = Array.from(selectedCompositions);
      await compositionsAPI.bulkDelete(parseInt(id!), compositionIds);

      toast.success(`Successfully deleted ${selectedCompositions.size} video${selectedCompositions.size > 1 ? 's' : ''}`);
      setSelectedCompositions(new Set());
      setIsSelectionMode(false);
      await fetchCompositions();
    } catch (error) {
      toast.error('Failed to delete selected videos');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleToggleSelection = (compositionId: number) => {
    const newSelected = new Set(selectedCompositions);
    if (newSelected.has(compositionId)) {
      newSelected.delete(compositionId);
    } else {
      newSelected.add(compositionId);
    }
    setSelectedCompositions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCompositions.size === compositions.length) {
      setSelectedCompositions(new Set());
    } else {
      setSelectedCompositions(new Set(compositions.map(c => c.id)));
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedCompositions(new Set());
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Video Composer</h2>
          {compositions.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleSelectionMode}
                className={`px-3 py-1 text-sm rounded-md border ${isSelectionMode
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                {isSelectionMode ? 'Cancel Selection' : 'Select Videos'}
              </button>
              {isSelectionMode && (
                <>
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedCompositions.size === compositions.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">
                    {selectedCompositions.size} selected
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex space-x-3">
          {isSelectionMode && selectedCompositions.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isBulkDeleting ? 'Deleting...' : `Delete ${selectedCompositions.size} Video${selectedCompositions.size > 1 ? 's' : ''}`}
            </button>
          )}
          <button
            onClick={() => {
              if (allClips.length === 0) {
                toast.error('Process videos first to generate clips');
                return;
              }
              if (voiceovers.length === 0) {
                toast.error('Generate voiceovers first');
                return;
              }
              setShowComposerModal(true);
            }}
            disabled={allClips.length === 0 || voiceovers.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Video
          </button>
        </div>
      </div>

      {compositionJob && compositionJob.status !== 'completed' && compositionJob.status !== 'failed' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  {compositionJob.status === 'processing' ? 'Processing Videos...' : 'Videos Queued'}
                </h3>
                <p className="text-sm text-blue-700">
                  {compositionJob.completed_count} of {compositionJob.total_count} completed
                </p>
              </div>
            </div>
            <div className="w-32 bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(compositionJob.completed_count / compositionJob.total_count) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {compositions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {compositions.map((composition) => (
            <div
              key={composition.id}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all relative ${isSelectionMode && selectedCompositions.has(composition.id)
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : ''
                }`}
            >
              {isSelectionMode && (
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedCompositions.has(composition.id)}
                    onChange={() => handleToggleSelection(composition.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>
              )}

              <div className={`flex justify-between items-start mb-3 ${isSelectionMode ? 'ml-6' : ''}`}>
                <h3 className="font-medium text-gray-900 truncate">{composition.name}</h3>
                <div className="flex items-center space-x-1">
                  {composition.status === 'completed' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {composition.status === 'processing' && (
                    <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {composition.status === 'failed' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs ${composition.status === 'completed' ? 'bg-green-100 text-green-800' :
                    composition.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      composition.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {composition.status}
                  </span>
                  {composition.duration && (
                    <span className="text-gray-500">{composition.duration.toFixed(1)}s</span>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-3">
                Created: {new Date(composition.created_at).toLocaleDateString()}
              </div>

              <div className="flex justify-end space-x-2">
                {composition.status === 'completed' && composition.file_path && (
                  <>
                    <a
                      href={getStaticFileUrl(composition.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center"
                    >
                      <PlayCircle className="w-3 h-3 mr-1" />
                      Play
                    </a>
                    <a
                      href={getStaticFileUrl(composition.file_path)}
                      download
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </a>
                  </>
                )}
                <button
                  onClick={() => navigate(`/editor/${composition.id}`)}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center"
                  title="Edit captions and styles"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </button>
                {!isSelectionMode && (
                  <button
                    onClick={() => handleDeleteComposition(composition.id)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Clapperboard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos created yet</h3>
          <p className="text-gray-600 mb-4">
            {allClips.length === 0
              ? 'Process your raw videos first to generate clips, then create AI-powered video compositions.'
              : voiceovers.length === 0
                ? 'Generate voiceovers first, then create video compositions.'
                : 'Create your first AI-powered video composition.'
            }
          </p>
          {allClips.length > 0 && voiceovers.length > 0 && (
            <button
              onClick={() => setShowComposerModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Video
            </button>
          )}
        </div>
      )}

      {showComposerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowComposerModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Clapperboard className="w-5 h-5 mr-2" />
                  Create Video Composition
                </h3>
                <button
                  onClick={() => setShowComposerModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Name *
                  </label>
                  <input
                    type="text"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={compositionName}
                    onChange={(e) => setCompositionName(e.target.value)}
                    placeholder="e.g., Product Launch Video v1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">hook Clips</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {allClips.filter(clip => clip.category.toLowerCase() === 'hook').map((clip) => (
                        <button
                          key={clip.id}
                          onClick={() => setSelectedClips(prev => ({
                            ...prev,
                            hook: prev.hook?.id === clip.id ? null : clip
                          }))}
                          className={`w-full p-2 text-left border rounded-md text-xs ${selectedClips.hook?.id === clip.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <div className="font-medium truncate">{clip.name}</div>
                          <div className="text-gray-500">{clip.duration.toFixed(1)}s</div>
                        </button>
                      ))}
                      {allClips.filter(clip => clip.category.toLowerCase() === 'hook').length === 0 && (
                        <p className="text-xs text-gray-500 italic">No hook clips available</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Body Clips (Select Multiple)</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {allClips.filter(clip => clip.category.toLowerCase() === 'body').map((clip) => (
                        <button
                          key={clip.id}
                          onClick={() => setSelectedClips(prev => ({
                            ...prev,
                            body: prev.body.some(c => c.id === clip.id)
                              ? prev.body.filter(c => c.id !== clip.id)
                              : [...prev.body, clip]
                          }))}
                          className={`w-full p-2 text-left border rounded-md text-xs ${selectedClips.body.some(c => c.id === clip.id)
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <div className="font-medium truncate">{clip.name}</div>
                          <div className="text-gray-500">{clip.duration.toFixed(1)}s</div>
                        </button>
                      ))}
                      {allClips.filter(clip => clip.category.toLowerCase() === 'body').length === 0 && (
                        <p className="text-xs text-gray-500 italic">No body clips available</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Call-to-Action Clips</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {allClips.filter(clip => clip.category.toLowerCase() === 'cat').map((clip) => (
                        <button
                          key={clip.id}
                          onClick={() => setSelectedClips(prev => ({
                            ...prev,
                            cat: prev.cat?.id === clip.id ? null : clip
                          }))}
                          className={`w-full p-2 text-left border rounded-md text-xs ${selectedClips.cat?.id === clip.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          <div className="font-medium truncate">{clip.name}</div>
                          <div className="text-gray-500">{clip.duration.toFixed(1)}s</div>
                        </button>
                      ))}
                      {allClips.filter(clip => clip.category.toLowerCase() === 'cat').length === 0 && (
                        <p className="text-xs text-gray-500 italic">No CTA clips available</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowComposerModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCompositions}
                    disabled={isGeneratingCompositions}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isGeneratingCompositions ? 'Creating...' : 'Create Video'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComposerPage;
