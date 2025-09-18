import React, { createContext, useContext, useEffect, useState } from 'react';
// import * as stytch from '@stytch/vanilla-js';
// import { User } from '@stytch/vanilla-js';

export interface AuthUser {
  user_id: string;
  email: string;
  name?: string;
  created_at: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stytchPublicToken = import.meta.env.VITE_STYTCH_PUBLIC_TOKEN;

  // Initialize Stytch client (commented out for demo purposes)
  // const stytchClient = React.useMemo(() => {
  //   if (stytchPublicToken) {
  //     return stytch.createStytchClient(stytchPublicToken);
  //   }
  //   return null;
  // }, [stytchPublicToken]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);

      // Check for stored user data (demo implementation)
      const storedUser = localStorage.getItem('mzon_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const createAuthUser = (email: string, name?: string): AuthUser => {
    return {
      user_id: `user_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      created_at: new Date().toISOString(),
    };
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Demo implementation - replace with real Stytch integration
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      // Simple validation for demo
      if (password.length < 6) {
        throw new Error('Invalid credentials');
      }

      const newUser = createAuthUser(email, 'Demo User');
      setUser(newUser);
      localStorage.setItem('mzon_user', JSON.stringify(newUser));
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name?: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Demo implementation - replace with real Stytch integration
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      // Simple validation for demo
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const newUser = createAuthUser(email, name || 'New User');
      setUser(newUser);
      localStorage.setItem('mzon_user', JSON.stringify(newUser));
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithMagicLink = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Demo implementation - replace with real Stytch integration
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call

      // In a real implementation, this would send a magic link
      // For demo purposes, we'll just simulate the success
    } catch (err: any) {
      setError(err.message || 'Magic link send failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Demo implementation - replace with real Stytch integration
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call

      // Clear user data from localStorage
      localStorage.removeItem('mzon_user');
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    loginWithMagicLink,
    logout,
    error,
    clearError,
  };

  // Show loading screen while checking auth status
  if (isLoading && user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;