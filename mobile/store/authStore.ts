import { create } from 'zustand';

interface AuthState {
  session: any | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  
  login: async (email, password) => {
    // This will be implemented in the future
    set({ session: { userId: '1', email }, isLoading: false });
  },
  
  logout: async () => {
    // This will be implemented in the future
    set({ session: null, isLoading: false });
  },
  
  checkSession: async () => {
    // This will be implemented in the future
    set({ isLoading: false });
  }
}));