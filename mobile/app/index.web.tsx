import { useAuth } from '@/lib/store/auth';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function IndexWebScreen() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      // '/dashboard' hanya ada di web (dashboard.web.tsx) sehingga belum masuk typed routes
      router.replace(session ? ('/dashboard' as never) : '/(auth)/login');
    }
  }, [session, isLoading]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#0284C7" />
    </View>
  );
}
