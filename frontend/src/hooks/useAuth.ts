import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  logout: () => void;
  validateToken: () => Promise<boolean>;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check authentication status on mount and set up periodic validation
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Quick local check first
        if (!authService.isAuthenticated()) {
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Validate with backend
        const isValid = await authService.validateToken();
        setIsAuthenticated(isValid);
        
        if (isValid) {
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up periodic token validation (every 5 minutes)
    const validationInterval = setInterval(async () => {
      if (authService.isAuthenticated()) {
        try {
          const isValid = await authService.validateToken();
          if (!isValid) {
            setIsAuthenticated(false);
            setUser(null);
            // The authService.validateToken already handles redirect
          }
        } catch (error) {
          console.error('Periodic token validation failed:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(validationInterval);
    };
  }, []);

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = '/';
  };

  const validateToken = async (): Promise<boolean> => {
    try {
      const isValid = await authService.validateToken();
      setIsAuthenticated(isValid);
      if (!isValid) {
        setUser(null);
      }
      return isValid;
    } catch (error) {
      console.error('Token validation failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    logout,
    validateToken,
  };
};