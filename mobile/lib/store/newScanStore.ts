import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface NewScanState {
  newScan: boolean;
  setNewScan: (on: boolean) => void;
}

/** Mode scan baru: barcode berformat MAWB_PART_TOTAL (dipisah underscore). */
export const useNewScanStore = create<NewScanState>()(
  persist(
    (set) => ({
      newScan: false,
      setNewScan: (on) => set({ newScan: on }),
    }),
    {
      name: 'new-scan-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
