import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ShaderLanding from '../views/ShaderLanding';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show shader landing page
  if (!isAuthenticated) {
    return <ShaderLanding onAuthSuccess={() => window.location.reload()} />;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;