import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import React from 'react';
import BottomNav from '@/components/BottomNav';

const TabLayout = () => {
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