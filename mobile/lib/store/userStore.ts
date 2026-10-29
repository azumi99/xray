import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UserState {
  user: any;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (authData: {
    user: any;
    accessToken: string | null;
    refreshToken: string | null;
  }) => void;
  clearAuth: () => void;
  updateUser: (userData: any) => void;
  updateToken: (token: string | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (authData: {
        user: any;
        accessToken: string | null;
        refreshToken: string | null;
      }) => {
        console.log("Setting auth data:", authData);
        set({
          user: authData.user,
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
        });
      },
      clearAuth: () => {
        console.log("Clearing auth data");
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      },

      updateUser: (userData: any) => {
        set({ user: userData });
      },

      updateToken: (token: string | null) => {
        set({ accessToken: token });
      },
    }),
    {
      name: "user-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: (state) => {
        console.log("User store hydration started");
        return (state, error) => {
          if (error) {
            console.error("User store hydration failed:", error);
          } else {
            console.log("User store hydrated successfully:", {
              hasUser: !!state?.user,
              hasAccessToken: !!state?.accessToken,
              hasRefreshToken: !!state?.refreshToken,
            });
          }
        };
      },
    }
  )
);
