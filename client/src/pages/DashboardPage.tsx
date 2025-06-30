import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { workspacesAPI, Workspace } from '../services/api';
import { Plus, Video, FileText, Mic, BarChart } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await workspacesAPI.getAll();
      setWorkspaces(response.data);
    } catch (error) {
      toast.error('Failed to fetch workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      name: 'Total Workspaces',
      value: workspaces.length,
      icon: Video,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Projects',
      value: workspaces.filter(w => w.description).length,
      icon: FileText,
      color: 'bg-green-500',
    },
    {
      name: 'Created This Month',
      value: workspaces.filter(w => {
        const created = new Date(w.created_at);
        const now = new Date();
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length,
      icon: BarChart,
      color: 'bg-purple-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your creative projects.</p>
        </div>
        <Link
          to="/workspaces/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Workspace
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Workspaces */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Workspaces</h2>
            <Link
              to="/workspaces"
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="px-6 py-4">
          {workspaces.length === 0 ? (
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No workspaces</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first workspace.
              </p>
              <div className="mt-6">
                <Link
                  to="/workspaces/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Workspace
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.slice(0, 6).map((workspace) => (
                <Link
                  key={workspace.id}
                  to={`/workspaces/${workspace.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900 mb-2">{workspace.name}</h3>
                  {workspace.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{workspace.description}</p>
                  )}
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded">
                      {workspace.product_category || 'General'}
                    </span>
                    <span className="ml-2">
                      {new Date(workspace.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/workspaces/new"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-8 h-8 text-primary-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">New Workspace</h3>
                <p className="text-sm text-gray-600">Create a new project</p>
              </div>
            </Link>
            <Link
              to="/workspaces"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Video className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Upload Video</h3>
                <p className="text-sm text-gray-600">Add raw footage</p>
              </div>
            </Link>
            <Link
              to="/scripts"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Generate Script</h3>
                <p className="text-sm text-gray-600">Create AI content</p>
              </div>
            </Link>
            <Link
              to="/voices"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Mic className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Create Voiceover</h3>
                <p className="text-sm text-gray-600">Generate AI voices</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
