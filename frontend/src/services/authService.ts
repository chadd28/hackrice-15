const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/auth`;

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  register: async (firstName: string, lastName: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await res.json();
    
    // Store auth data in localStorage
    if (data.session?.access_token && data.user) {
      localStorage.setItem('token', data.session.access_token);
      localStorage.setItem('user', JSON.stringify({
        name: `${firstName} ${lastName}`,
        email: data.user.email
      }));
    }

    return data;
  },

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await res.json();
    
    // Store auth data in localStorage
    if (data.session?.access_token && data.user) {
      localStorage.setItem('token', data.session.access_token);
      localStorage.setItem('user', JSON.stringify({
        name: data.user.user_metadata?.name || data.user.email || 'User',
        email: data.user.email
      }));
    }

    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  getCurrentUser: () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  // Validate token with backend
  validateToken: async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const res = await fetch(`${API_URL}/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        // Token is invalid, clear localStorage
        authService.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      authService.logout();
      return false;
    }
  },

  // Check if user should be redirected to home
  checkAuthAndRedirect: async (): Promise<boolean> => {
    const isValid = await authService.validateToken();
    if (!isValid) {
      // Redirect to home page
      window.location.href = '/';
      return false;
    }
    return true;
  }
};
