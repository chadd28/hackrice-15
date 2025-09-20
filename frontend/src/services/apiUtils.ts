import { authService } from './authService';

const API_BASE_URL = 'http://localhost:3000';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Enhanced fetch wrapper that handles authentication and token validation
 */
export const apiCall = async (url: string, options: ApiOptions = {}): Promise<Response> => {
  const { requireAuth = false, ...fetchOptions } = options;
  
  // Add authorization header if authentication is required or token exists
  if (requireAuth || authService.isAuthenticated()) {
    const token = localStorage.getItem('token');
    if (token) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${token}`,
      };
    } else if (requireAuth) {
      // No token but auth required - redirect to home
      window.location.href = '/';
      throw new Error('Authentication required');
    }
  }

  try {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, fetchOptions);
    
    // Handle 401 Unauthorized responses
    if (response.status === 401) {
      console.warn('Received 401 Unauthorized - redirecting to home page');
      authService.logout();
      window.location.href = '/';
      throw new Error('Authentication failed');
    }
    
    return response;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('Network error - unable to reach server');
    }
    throw error;
  }
};

/**
 * Convenience wrapper for GET requests
 */
export const apiGet = (url: string, options: ApiOptions = {}) => {
  return apiCall(url, { ...options, method: 'GET' });
};

/**
 * Convenience wrapper for POST requests
 */
export const apiPost = (url: string, body?: any, options: ApiOptions = {}) => {
  return apiCall(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * Convenience wrapper for PUT requests
 */
export const apiPut = (url: string, body?: any, options: ApiOptions = {}) => {
  return apiCall(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * Convenience wrapper for DELETE requests
 */
export const apiDelete = (url: string, options: ApiOptions = {}) => {
  return apiCall(url, { ...options, method: 'DELETE' });
};