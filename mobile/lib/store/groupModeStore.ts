import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface GroupModeState {
  groupMode: boolean;
  setGroupMode: (on: boolean) => void;
  toggleGroupMode: () => void;
}

/** Mode grouping di AWB list mobile: ON = list dikelompokkan per MAWB+HAWB. */
export const useGroupModeStore = create<GroupModeState>()(
  persist(
    (set) => ({
      groupMode: true,
      setGroupMode: (on) => set({ groupMode: on }),
      toggleGroupMode: () => set((s) => ({ groupMode: !s.groupMode })),
    }),
    {
      name: 'group-mode-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
