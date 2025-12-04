import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/* ---------- Zustand Store ---------- */
type AuthState = {
  session: string | null;
  user: {
    name?: string;
    id?: number;
  } | null;
  isLoading: boolean;
  login: (token: string, user?: { name?: string; id?: number }) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isLoading: true,

      login: (token: string, user?: { name?: string; id?: number }) =>
        set({ session: token, user: user || null, isLoading: false }),

      logout: () => set({ session: null, user: null, isLoading: false }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({ session: state.session, user: state.user }),

      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isLoading: false });
      },
    }
  )
);

/* ---------- Provider (simplified) ---------- */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

/* ---------- Hook ---------- */
export const useAuth = () => {
  const store = useAuthStore();
  return store;
};