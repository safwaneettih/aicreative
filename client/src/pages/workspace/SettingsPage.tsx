
import React, { useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { workspacesAPI, Workspace } from '../../services/api';
import { Trash2, Upload, Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace: initialWorkspace } = useOutletContext<{ workspace: Workspace }>();
  const [workspace, setWorkspace] = useState<Workspace>(initialWorkspace);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: initialWorkspace.name,
    description: initialWorkspace.description || '',
    product_category: initialWorkspace.product_category || '',
    target_market: initialWorkspace.target_market || ''
  });

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;

    try {
      setIsUpdating(true);
      const response = await workspacesAPI.update(workspace.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        product_category: editForm.product_category || undefined,
        target_market: editForm.target_market || undefined,
      });

      setWorkspace(response.data);
      toast.success('Workspace updated successfully!');
    } catch (error) {
      toast.error('Failed to update workspace');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace || !window.confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return;
    }

    try {
      await workspacesAPI.delete(workspace.id);
      toast.success('Workspace deleted successfully');
      navigate('/workspaces');
    } catch (error) {
      toast.error('Failed to delete workspace');
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workspace) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, SVG)');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setIsUploadingLogo(true);
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Workspace Settings</h2>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleUpdateWorkspace} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  id="edit-name"
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="edit-product-category" className="block text-sm font-medium text-gray-700">
                  Product Category
                </label>
                <select
                  id="edit-product-category"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={editForm.product_category}
                  onChange={(e) => setEditForm(prev => ({ ...prev, product_category: e.target.value }))}
                >
                  <option value="">Select a category</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Tech">Tech</option>
                  <option value="Food">Food</option>
                  <option value="Travel">Travel</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Home">Home</option>
                  <option value="Business">Business</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-target-market" className="block text-sm font-medium text-gray-700">
                  Target Market
                </label>
                <select
                  id="edit-target-market"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={editForm.target_market}
                  onChange={(e) => setEditForm(prev => ({ ...prev, target_market: e.target.value }))}
                >
                  <option value="">Select target market</option>
                  <option value="18-24">18-24 years</option>
                  <option value="25-34">25-34 years</option>
                  <option value="35-44">35-44 years</option>
                  <option value="45-54">45-54 years</option>
                  <option value="55+">55+ years</option>
                  <option value="All Ages">All Ages</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Logo
            </label>
            <div className="flex items-center space-x-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                    title="Remove Logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('logo-upload') as HTMLInputElement;
                    input?.click();
                  }}
                  disabled={isUploadingLogo}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update Workspace'}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h3>
          <button
            onClick={handleDeleteWorkspace}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Workspace
          </button>
          <p className="mt-2 text-sm text-gray-500">
            This action cannot be undone. This will permanently delete the workspace and all associated data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
