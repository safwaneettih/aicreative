
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { workspacesAPI, Workspace } from '../../services/api';
import { ArrowLeft, Video, Wand2, Mic, Clapperboard, Settings, Edit, Trash2, Calendar, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const WorkspaceLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchWorkspace = async () => {
      try {
        setIsLoading(true);
        const response = await workspacesAPI.getById(parseInt(id));
        setWorkspace(response.data);
      } catch (error) {
        toast.error('Failed to load workspace');
        navigate('/workspaces');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspace();
  }, [id, navigate]);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/videos')) return 'videos';
    if (path.includes('/scripts')) return 'scripts';
    if (path.includes('/voiceovers')) return 'voiceovers';
    if (path.includes('/composer')) return 'composer';
    if (path.includes('/settings')) return 'settings';
    return 'videos';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: string) => {
    navigate(`/workspaces/${id}/${tab}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Workspace Not Found</h2>
        <p className="text-gray-600 mb-8">The workspace you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/workspaces')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Workspaces
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/workspaces')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Workspaces
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-gray-600 mt-2">{workspace.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
              {workspace.product_category && (
                <span className="inline-flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  {workspace.product_category}
                </span>
              )}
              {workspace.target_market && (
                <span className="inline-flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  {workspace.target_market}
                </span>
              )}
              <span className="inline-flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Created {new Date(workspace.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabClick('videos')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'videos'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Video className="w-4 h-4 inline mr-2" />
            Videos
          </button>
          <button
            onClick={() => handleTabClick('scripts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'scripts'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Wand2 className="w-4 h-4 inline mr-2" />
            Scripts
          </button>
          <button
            onClick={() => handleTabClick('voiceovers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'voiceovers'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Mic className="w-4 h-4 inline mr-2" />
            Voiceovers
          </button>
          <button
            onClick={() => handleTabClick('composer')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'composer'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Clapperboard className="w-4 h-4 inline mr-2" />
            Video Composer
          </button>
          <button
            onClick={() => handleTabClick('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'settings'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </button>
        </nav>
      </div>

      <Outlet context={{ workspace }} />
    </div>
  );
};

export default WorkspaceLayout;
