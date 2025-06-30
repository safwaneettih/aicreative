import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacesPage from './pages/WorkspacesPage';
import NewWorkspacePage from './pages/NewWorkspacePage';
import WorkspaceLayout from './pages/workspace/WorkspaceLayout';
import VideosPage from './pages/workspace/VideosPage';
import ScriptsPage from './pages/workspace/ScriptsPage';
import VoiceoversPage from './pages/workspace/VoiceoversPage';
import ComposerPage from './pages/workspace/ComposerPage';
import SettingsPage from './pages/workspace/SettingsPage';
import VideoEditorPage from './pages/VideoEditorPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/workspaces" element={
              <ProtectedRoute>
                <WorkspacesPage />
              </ProtectedRoute>
            } />
            <Route path="/workspaces/new" element={
              <ProtectedRoute>
                <NewWorkspacePage />
              </ProtectedRoute>
            } />
            <Route path="/workspaces/:id/*" element={<ProtectedRoute><WorkspaceLayout /></ProtectedRoute>}>
              <Route path="videos" element={<VideosPage />} />
              <Route path="scripts" element={<ScriptsPage />} />
              <Route path="voiceovers" element={<VoiceoversPage />} />
              <Route path="composer" element={<ComposerPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route index element={<Navigate to="videos" replace />} />
            </Route>
            <Route path="/editor/:compositionId" element={
              <ProtectedRoute>
                <VideoEditorPage />
              </ProtectedRoute>
            } />

            {/* Placeholder routes for future features */}
            <Route path="/scripts" element={
              <ProtectedRoute>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Scripts</h2>
                  <p className="text-gray-600">Script management coming soon...</p>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/voices" element={
              <ProtectedRoute>
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Voiceovers</h2>
                  <p className="text-gray-600">Voice generation coming soon...</p>
                </div>
              </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 page */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Page not found</p>
                  <a href="/dashboard" className="text-primary-600 hover:text-primary-500">
                    Go to Dashboard
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
