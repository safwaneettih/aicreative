
import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { scriptsAPI, voicesAPI, Script, Workspace, Voice } from '../../services/api';
import { Wand2, Mic, X, Edit, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const ScriptsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace } = useOutletContext<{ workspace: Workspace }>();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [expandedScripts, setExpandedScripts] = useState<Set<number>>(new Set());
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [selectedScriptForVoice, setSelectedScriptForVoice] = useState<Script | null>(null);
  const [isUpdatingScript, setIsUpdatingScript] = useState(false);
  const [scriptForm, setScriptForm] = useState({
    title: '',
    style: 'conversational',
    tone: 'engaging',
    target_audience: '',
    prompt: ''
  });
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    style: 'conversational',
    tone: 'engaging',
    target_audience: ''
  });

  useEffect(() => {
    if (id) {
      fetchScripts();
      fetchAvailableVoices();
    }
  }, [id]);

  const fetchScripts = async () => {
    if (!id) return;

    try {
      const response = await scriptsAPI.getByWorkspace(parseInt(id));
      setScripts(response.data);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
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

  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;

    try {
      setIsGeneratingScript(true);
      await scriptsAPI.generate({
        workspaceId: workspace.id,
        title: scriptForm.title,
        style: scriptForm.style,
        tone: scriptForm.tone,
        target_audience: scriptForm.target_audience || workspace.target_market,
        prompt: scriptForm.prompt
      });

      toast.success('AI script generated successfully!');
      setShowScriptModal(false);
      setScriptForm({
        title: '',
        style: 'conversational',
        tone: 'engaging',
        target_audience: '',
        prompt: ''
      });
      await fetchScripts();
    } catch (error) {
      toast.error('Failed to generate script');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleDeleteScript = async (scriptId: number) => {
    if (!window.confirm('Are you sure you want to delete this script?')) {
      return;
    }

    try {
      await scriptsAPI.delete(scriptId);
      toast.success('Script deleted successfully');
      await fetchScripts();
    } catch (error) {
      toast.error('Failed to delete script');
    }
  };

  const handleEditScript = (script: Script) => {
    setEditingScript(script);
    setEditForm({
      title: script.title,
      content: script.content,
      style: script.style || 'conversational',
      tone: script.tone || 'engaging',
      target_audience: script.target_audience || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScript) return;

    try {
      setIsUpdatingScript(true);
      await scriptsAPI.update(editingScript.id, {
        title: editForm.title,
        content: editForm.content,
        style: editForm.style,
        tone: editForm.tone,
        target_audience: editForm.target_audience
      });

      toast.success('Script updated successfully!');
      setShowEditModal(false);
      setEditingScript(null);
      setEditForm({
        title: '',
        content: '',
        style: 'conversational',
        tone: 'engaging',
        target_audience: ''
      });
      await fetchScripts();
    } catch (error) {
      toast.error('Failed to update script');
    } finally {
      setIsUpdatingScript(false);
    }
  };

  const handleDuplicateScript = async (scriptId: number) => {
    try {
      await scriptsAPI.duplicate(scriptId);
      toast.success('Script duplicated successfully!');
      await fetchScripts();
    } catch (error) {
      toast.error('Failed to duplicate script');
    }
  };

  const handleGenerateVoiceover = (script: Script) => {
    // Open voiceover generation modal with the selected script
    setSelectedScriptForVoice(script);
    setShowVoiceModal(true);
  };

  const handleVoiceoverGeneration = async (voiceId: string) => {
    if (!selectedScriptForVoice) return;

    try {
      setIsGeneratingVoice(true);
      await voicesAPI.generate(selectedScriptForVoice.id, voiceId);
      toast.success('AI voiceover generated successfully!');
      setShowVoiceModal(false);
      setSelectedScriptForVoice(null);
      await fetchScripts(); // Refresh to update voiceover count
    } catch (error) {
      toast.error('Failed to generate voiceover');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const toggleScriptExpansion = (scriptId: number) => {
    setExpandedScripts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scriptId)) {
        newSet.delete(scriptId);
      } else {
        newSet.add(scriptId);
      }
      return newSet;
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">AI Scripts</h2>
        <button
          onClick={() => setShowScriptModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Generate AI Script
        </button>
      </div>

      {scripts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scripts.map((script) => (
            <div key={script.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-end mb-3">
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleGenerateVoiceover(script)}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center whitespace-nowrap"
                    title="Generate AI voiceover for this script"
                  >
                    <Mic className="w-3 h-3 mr-1" />
                    Voice
                  </button>
                  {script.voiceover_count && script.voiceover_count > 0 ? (
                    <button
                      disabled
                      title="Cannot edit script after voiceover has been generated. Generate a new script or duplicate this one to make changes."
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-400 rounded cursor-not-allowed flex items-center whitespace-nowrap"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEditScript(script)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center whitespace-nowrap"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDuplicateScript(script.id)}
                    className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 flex items-center whitespace-nowrap"
                    title="Create a copy of this script"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </button>
                  <button
                    onClick={() => handleDeleteScript(script.id)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 whitespace-nowrap"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <h3 className="font-medium text-gray-900">{script.title}</h3>
              </div>

              <div className="text-sm text-gray-600 mb-3">
                <div className={`${expandedScripts.has(script.id) ? '' : 'line-clamp-3'}`}>
                  {script.content}
                </div>
                {script.content.length > 150 && (
                  <button
                    onClick={() => toggleScriptExpansion(script.id)}
                    className="text-primary-600 hover:text-primary-700 text-xs mt-2 flex items-center"
                  >
                    {expandedScripts.has(script.id) ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Read more
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex space-x-3">
                  {script.style && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {script.style}
                    </span>
                  )}
                  {script.tone && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {script.tone}
                    </span>
                  )}
                  {script.voiceover_count && script.voiceover_count > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                      {script.voiceover_count} voiceover{script.voiceover_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span>{new Date(script.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Wand2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No AI scripts yet</h3>
          <p className="text-gray-600 mb-4">Generate AI-powered scripts tailored to your product and target audience.</p>
          <button
            onClick={() => setShowScriptModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Generate AI Script
          </button>
        </div>
      )}

      {showScriptModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowScriptModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Wand2 className="w-5 h-5 mr-2" />
                  Generate AI Script
                </h3>
                <button
                  onClick={() => setShowScriptModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateScript} className="space-y-4">
                <div>
                  <label htmlFor="script-title" className="block text-sm font-medium text-gray-700">
                    Script Title *
                  </label>
                  <input
                    type="text"
                    id="script-title"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={scriptForm.title}
                    onChange={(e) => setScriptForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Product Launch Script"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="script-style" className="block text-sm font-medium text-gray-700">
                      Style
                    </label>
                    <select
                      id="script-style"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={scriptForm.style}
                      onChange={(e) => setScriptForm(prev => ({ ...prev, style: e.target.value }))}
                    >
                      <option value="conversational">Conversational</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="script-tone" className="block text-sm font-medium text-gray-700">
                      Tone
                    </label>
                    <select
                      id="script-tone"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={scriptForm.tone}
                      onChange={(e) => setScriptForm(prev => ({ ...prev, tone: e.target.value }))}
                    >
                      <option value="engaging">Engaging</option>
                      <option value="persuasive">Persuasive</option>
                      <option value="informative">Informative</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="script-audience" className="block text-sm font-medium text-gray-700">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    id="script-audience"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={scriptForm.target_audience}
                    onChange={(e) => setScriptForm(prev => ({ ...prev, target_audience: e.target.value }))}
                    placeholder={workspace?.target_market || "e.g., Young professionals, 25-35"}
                  />
                </div>

                <div>
                  <label htmlFor="script-prompt" className="block text-sm font-medium text-gray-700">
                    Custom Instructions (Optional)
                  </label>
                  <textarea
                    id="script-prompt"
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={scriptForm.prompt}
                    onChange={(e) => setScriptForm(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="e.g., Focus on the key benefits, include a strong call-to-action..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowScriptModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingScript}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 flex items-center"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isGeneratingScript ? 'Generating...' : 'Generate Script'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingScript && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowEditModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Edit className="w-5 h-5 mr-2" />
                  Edit Script
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateScript} className="space-y-4">
                <div>
                  <label htmlFor="edit-script-title" className="block text-sm font-medium text-gray-700">
                    Script Title *
                  </label>
                  <input
                    type="text"
                    id="edit-script-title"
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Product Launch Script"
                  />
                </div>

                <div>
                  <label htmlFor="edit-script-content" className="block text-sm font-medium text-gray-700">
                    Script Content *
                  </label>
                  <textarea
                    id="edit-script-content"
                    required
                    rows={8}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={editForm.content}
                    onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your script content..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-script-style" className="block text-sm font-medium text-gray-700">
                      Style
                    </label>
                    <select
                      id="edit-script-style"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={editForm.style}
                      onChange={(e) => setEditForm(prev => ({ ...prev, style: e.target.value }))}
                    >
                      <option value="conversational">Conversational</option>
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="edit-script-tone" className="block text-sm font-medium text-gray-700">
                      Tone
                    </label>
                    <select
                      id="edit-script-tone"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={editForm.tone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tone: e.target.value }))}
                    >
                      <option value="engaging">Engaging</option>
                      <option value="persuasive">Persuasive</option>
                      <option value="informative">Informative</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-script-audience" className="block text-sm font-medium text-gray-700">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    id="edit-script-audience"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={editForm.target_audience}
                    onChange={(e) => setEditForm(prev => ({ ...prev, target_audience: e.target.value }))}
                    placeholder={workspace?.target_market || "e.g., Young professionals, 25-35"}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingScript}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isUpdatingScript ? 'Updating...' : 'Update Script'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showVoiceModal && selectedScriptForVoice && (
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
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{selectedScriptForVoice.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-3">{selectedScriptForVoice.content}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Choose Voice</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {availableVoices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => handleVoiceoverGeneration(voice.id)}
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

export default ScriptsPage;
