import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface BatchModeState {
  batchMode: boolean;
  setBatchMode: (on: boolean) => void;
  toggleBatchMode: () => void;
}

/** Mode batch scan: ON = sekali scan insert sebanyak Quantity manifest (job backend). */
export const useBatchModeStore = create<BatchModeState>()(
  persist(
    (set) => ({
      batchMode: false,
      setBatchMode: (on) => set({ batchMode: on }),
      toggleBatchMode: () => set((s) => ({ batchMode: !s.batchMode })),
    }),
    {
      name: 'batch-mode-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
