import { router } from 'expo-router';
import { useEffect } from 'react';

// Fallback non-web untuk dashboard/detail/[id].web.tsx (Metro butuh sibling tanpa ekstensi platform).
export default function DashboardDetailFallback() {
  useEffect(() => {
    router.replace('/(tabs)/list');
  }, []);
  return null;
}
