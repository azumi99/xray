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
    email?: string;
    /** Hak akses gudang: 'bgd' | 'cas' | 'all' */
    warehouse?: string;
  } | null;
  isLoading: boolean;
  login: (token: string, user?: { name?: string; id?: number; email?: string; warehouse?: string }) => void;
  logout: () => void;
};

/** Sinkronkan gudang aktif (header x-warehouse + SSE) dengan user yang login.
 *  'all' → bgd (default). Dipanggil login/logout/refresh me. */
const applyWarehouse = (user?: { warehouse?: string } | null) => {
  const wh = user?.warehouse && user.warehouse !== 'all' ? user.warehouse : 'bgd';
  void import('@/graphql/client').then(({ setGraphqlWarehouse }) => setGraphqlWarehouse(wh));
  void import('@/lib/api/awbEvents').then(({ resetAwbSnapshotSource }) => resetAwbSnapshotSource());
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isLoading: true,

      login: (token: string, user?: { name?: string; id?: number }) => {
        set({ session: token, user: user || null, isLoading: false });
        applyWarehouse(user);
      },

      logout: () => {
        set({ session: null, user: null, isLoading: false });
        applyWarehouse(null);
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),

      partialize: (state) => ({ session: state.session, user: state.user }),

      onRehydrateStorage: () => async (state) => {
        useAuthStore.setState({ isLoading: false });
        // Sesi lama dengan user tersimpan: langsung sinkronkan gudang aktif
        if (state?.user) applyWarehouse(state.user);
        // Session ada tapi user belum terisi (login lama): ambil dari backend via query me
        if (state?.session && !state?.user) {
          try {
            const { getCurrentUser } = await import("../api/authAPI");
            const me = await getCurrentUser();
            if (me) {
              const user = { id: Number(me.id), name: me.name, email: me.email, warehouse: me.warehouse ?? 'bgd' };
              useAuthStore.setState({ user });
              applyWarehouse(user);
            }
          } catch {
            // token invalid biarkan apa adanya
          }
        }
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