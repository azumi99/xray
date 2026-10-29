import { router } from 'expo-router';
import { useEffect } from 'react';

// Fallback non-web untuk dashboard/[section].web.tsx (Metro butuh sibling tanpa ekstensi platform).
export default function DashboardSectionFallback() {
  useEffect(() => {
    router.replace('/(tabs)/list');
  }, []);
  return null;
}
