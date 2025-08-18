import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  username: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  savedCredentials: { username: string; password: string } | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
  loadUser: () => Promise<void>;
  clearSavedCredentials: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      rememberMe: false,
      savedCredentials: null,

      login: async (username: string, password: string, rememberMe = false) => {
        try {
          console.log('AuthStore - Attempting login with:', { username, password: password ? '****' : 'empty' });
          
          const params = new URLSearchParams();
          params.append('username', username);
          params.append('password', password);

          console.log('AuthStore - Sending request to:', '/api/token');
          const response = await api.post('/api/token', params, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          console.log('AuthStore - Login response:', response.status);
          const { access_token } = response.data;
          
          if (!access_token) {
            throw new Error('No access token received');
          }
          
          console.log('AuthStore - Token received, setting auth state');
          set({ 
            token: access_token, 
            isAuthenticated: true,
            rememberMe,
            savedCredentials: rememberMe ? { username, password } : null
          });
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          // Load user data
          await get().loadUser();
          console.log('AuthStore - Login successful');
        } catch (error: any) {
          console.error('AuthStore - Login error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
          });
          throw error;
        }
      },

      register: async (email: string, username: string, password: string) => {
        try {
          await api.post('/api/register', {
            email,
            username,
            password,
          });

          // Auto login after registration
          await get().login(username, password);
        } catch (error) {
          console.error('Registration error:', error);
          throw error;
        }
      },

      logout: () => {
        const currentState = get();
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          // Manter credenciais salvas se "lembrar de mim" estava ativo
          rememberMe: currentState.rememberMe,
          savedCredentials: currentState.rememberMe ? currentState.savedCredentials : null
        });
        delete api.defaults.headers.common['Authorization'];
      },

      clearSavedCredentials: () => {
        set({ 
          rememberMe: false,
          savedCredentials: null
        });
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      loadUser: async () => {
        try {
          const token = get().token;
          console.log('AuthStore - loadUser called with token:', token ? 'exists' : 'missing');
          
          if (!token) {
            console.log('AuthStore - No token, skipping loadUser');
            return;
          }

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          console.log('AuthStore - Calling /api/users/me');
          const response = await api.get('/api/users/me');
          
          console.log('AuthStore - User loaded successfully:', response.data);
          set({ user: response.data, isAuthenticated: true });
        } catch (error: any) {
          console.error('AuthStore - Load user error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
          console.log('AuthStore - Logging out due to loadUser error');
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        rememberMe: state.rememberMe,
        savedCredentials: state.savedCredentials
      }),
      onRehydrateStorage: () => (state) => {
        console.log('AuthStore - Rehydrating from localStorage:', state);
        if (state?.token && !state?.isAuthenticated) {
          console.log('AuthStore - Found token during rehydration, setting authenticated');
          state.isAuthenticated = true;
        }
      },
    }
  )
);
