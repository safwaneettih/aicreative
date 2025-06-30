import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspacesAPI } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const NewWorkspacePage: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const categories = [
    'Fashion & Apparel',
    'Beauty & Cosmetics',
    'Technology & Electronics',
    'Health & Fitness',
    'Food & Beverage',
    'Home & Garden',
    'Automotive',
    'Travel & Tourism',
    'Education',
    'Finance',
    'Other'
  ];

  const markets = [
    'Gen Z (18-24)',
    'Millennials (25-40)',
    'Gen X (41-56)',
    'Baby Boomers (57+)',
    'B2B Professionals',
    'Small Business Owners',
    'Enterprise',
    'Global',
    'US Market',
    'European Market',
    'Asian Market',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await workspacesAPI.create({
        name,
        description: description || undefined,
        product_category: productCategory || undefined,
        target_market: targetMarket || undefined,
      });

      toast.success('Workspace created successfully!');
      navigate(`/workspaces/${response.data.id}`);
    } catch (error) {
      toast.error('Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/workspaces')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Workspaces
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Workspace</h1>
        <p className="text-gray-600">Set up a new project for your creative campaigns</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Workspace Name *
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="e.g., Summer Campaign 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Describe your project, goals, or campaign details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="mt-2 text-sm text-gray-500">
              This helps AI generate better scripts and content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="productCategory" className="block text-sm font-medium text-gray-700">
                Product Category
              </label>
              <select
                id="productCategory"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="targetMarket" className="block text-sm font-medium text-gray-700">
                Target Market
              </label>
              <select
                id="targetMarket"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
              >
                <option value="">Select target market</option>
                {markets.map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/workspaces')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewWorkspacePage;
