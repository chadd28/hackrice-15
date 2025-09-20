import React, { useEffect, useState } from 'react';
import { authService } from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      try {
        // First check if token exists locally
        if (!authService.isAuthenticated()) {
          window.location.href = '/';
          return;
        }

        // Then validate with backend
        const isValid = await authService.validateToken();
        
        if (!isValid) {
          // Token is invalid, redirect to home
          window.location.href = '/';
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication validation failed:', error);
        window.location.href = '/';
      } finally {
        setIsValidating(false);
      }
    };

    validateAuth();
  }, []);

  // Show loading while validating
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-300">Validating authentication...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;