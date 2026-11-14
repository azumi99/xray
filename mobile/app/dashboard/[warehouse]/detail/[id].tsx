import { router } from 'expo-router';
import { useEffect } from 'react';

// Fallback non-web untuk dashboard/[warehouse]/detail/[id].web.tsx (Metro butuh sibling tanpa ekstensi platform).
export default function WarehouseDetailFallback() {
  useEffect(() => {
    router.replace('/(tabs)/list');
  }, []);
  return null;
}
