
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { voicesAPI, scriptsAPI, Voiceover, Voice, Script } from '../../services/api';
import { getStaticFileUrl } from '../../utils/urlHelpers';
import { Mic, Play, Pause, X } from 'lucide-react';
import toast from 'react-hot-toast';

const VoiceoversPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [voiceovers, setVoiceovers] = useState<Voiceover[]>([]);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingVoiceoverId, setPlayingVoiceoverId] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchVoiceovers();
      fetchAvailableVoices();
      fetchScripts();
    }

    return () => {
      if (currentAudio) {
        currentAudio.pause();
      }
    };
  }, [id]);

  const fetchVoiceovers = async () => {
    if (!id) return;
    try {
      const response = await voicesAPI.getByWorkspace(parseInt(id));
      setVoiceovers(response.data);
    } catch (error) {
      console.error('Failed to fetch voiceovers:', error);
    }
  };

  const fetchAvailableVoices = async () => {
    try {
      const response = await voicesAPI.getAvailable();
      setAvailableVoices(response.data);
    } catch (error) {
      console.error('Failed to fetch available voices:', error);
    }
  };

  const fetchScripts = async () => {
    if (!id) return;
    try {
      const response = await scriptsAPI.getByWorkspace(parseInt(id));
      setScripts(response.data);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    }
  };

  const handleGenerateVoiceover = async (voiceId: string) => {
    if (!selectedScript) return;

    try {
      setIsGeneratingVoice(true);
      await voicesAPI.generate(selectedScript.id, voiceId);
      toast.success('AI voiceover generated successfully!');
      setShowVoiceModal(false);
      setSelectedScript(null);
      await fetchVoiceovers();
    } catch (error) {
      toast.error('Failed to generate voiceover');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleDeleteVoiceover = async (voiceoverId: number) => {
    if (!window.confirm('Are you sure you want to delete this voiceover?')) {
      return;
    }

    try {
      await voicesAPI.delete(voiceoverId);
      toast.success('Voiceover deleted successfully');
      await fetchVoiceovers();
    } catch (error) {
      toast.error('Failed to delete voiceover');
    }
  };

  const handleAudioPlayPause = async (voiceover: Voiceover) => {
    if (playingVoiceoverId === voiceover.id && currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setPlayingVoiceoverId(null);
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
    }

    const audioUrl = getStaticFileUrl(voiceover.file_path);
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    setPlayingVoiceoverId(voiceover.id);
    audio.play();
    audio.onended = () => {
      setPlayingVoiceoverId(null);
      setCurrentAudio(null);
    };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">AI Voiceovers</h2>
        <button
          onClick={() => {
            if (scripts.length === 0) {
              toast.error('Generate a script first to create voiceovers');
              return;
            }
            setShowVoiceModal(true);
          }}
          disabled={scripts.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
        >
          <Mic className="w-4 h-4 mr-2" />
          Generate Voiceover
        </button>
      </div>

      {voiceovers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {voiceovers.map((voiceover) => (
            <div key={voiceover.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-end mb-3">
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleAudioPlayPause(voiceover)}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center whitespace-nowrap"
                  >
                    {playingVoiceoverId === voiceover.id ? (
                      <>
                        <Pause className="w-3 h-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        Play
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteVoiceover(voiceover.id)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 whitespace-nowrap"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <h3 className="font-medium text-gray-900">{voiceover.script_title}</h3>
                <p className="text-sm text-gray-600">{voiceover.voice_name}</p>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                {voiceover.duration && <div>Duration: {voiceover.duration.toFixed(1)}s</div>}
                {voiceover.voice_info && (
                  <div className="flex space-x-2">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {voiceover.voice_info.gender}
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {voiceover.voice_info.style}
                    </span>
                  </div>
                )}
                <div>Created: {new Date(voiceover.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Mic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No AI voiceovers yet</h3>
          <p className="text-gray-600 mb-4">
            {scripts.length === 0
              ? 'Generate a script first, then create professional AI voiceovers.'
              : 'Generate professional AI voiceovers from your scripts.'
            }
          </p>
          <button
            onClick={() => {
              if (scripts.length === 0) {
                toast.error('Generate a script first to create voiceovers');
                return;
              }
              setShowVoiceModal(true);
            }}
            disabled={scripts.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            <Mic className="w-4 h-4 mr-2" />
            Generate Voiceover
          </button>
        </div>
      )}

      {showVoiceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowVoiceModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Mic className="w-5 h-5 mr-2" />
                  Generate AI Voiceover
                </h3>
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Script
                  </label>
                  <select
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={selectedScript?.id || ''}
                    onChange={(e) => {
                      const script = scripts.find(s => s.id === parseInt(e.target.value));
                      setSelectedScript(script || null);
                    }}
                  >
                    <option value="">Choose a script...</option>
                    {scripts.map((script) => (
                      <option key={script.id} value={script.id}>
                        {script.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedScript && (
                  <div className="bg-gray-50 p-3 rounded-lg mt-3">
                    <h4 className="font-medium text-gray-900 mb-2">{selectedScript.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-3">{selectedScript.content}</p>
                  </div>
                )}
              </div>

              {selectedScript && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Choose Voice</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {availableVoices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => handleGenerateVoiceover(voice.id)}
                        disabled={isGeneratingVoice}
                        className="p-3 border rounded-lg text-left hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-gray-900">{voice.name}</h5>
                          <div className="flex space-x-1">
                            <span className={`px-2 py-1 text-xs rounded ${voice.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                              }`}>
                              {voice.gender}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{voice.description}</p>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {voice.style}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceoversPage;
