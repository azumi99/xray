import { Tabs } from 'expo-router';
import { View } from 'react-native';
import React, { useState }, { useEffect } from 'react';
import { useAuth } from '@/lib/store/auth';
import { router } from 'expo-router';
import BottomNav from '@/components/BottomNav';
import CameraModal from '@/components/CameraModal';

const TabLayout = () => {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none', // We'll implement custom tab bar
          },
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
      <BottomNav onAddPress={handleAddPress} />

      {/* Camera Modal */}
      <CameraModal
        visible={showCameraModal}
        onClose={handleCloseCamera}
      />
    </>
  );
};

export default TabLayout;