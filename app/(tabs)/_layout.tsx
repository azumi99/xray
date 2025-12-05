import { Tabs } from 'expo-router';
import { View } from 'react-native';
import React, { useEffect } from 'react';
import { useAuth } from '@/lib/store/auth';
import { router } from 'expo-router';
import BottomNav from '@/components/BottomNav';

const TabLayout = () => {
  const { session, isLoading } = useAuth();

  // Redirect to login if no session exists
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/(auth)/login');
    }
  }, [session, isLoading]);

  // Don't render anything while checking auth status
  if (isLoading || !session) {
    return null; // Or render a loading screen
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none', // We'll implement custom tab bar
          },
          // Apply consistent background
          cardStyle: { backgroundColor: '#F0F9FF' },
        }}
      >
        <Tabs.Screen
          name="list"
          options={{
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            headerShown: false,
          }}
        />
      </Tabs>
      <BottomNav />
    </>
  );
};

export default TabLayout;