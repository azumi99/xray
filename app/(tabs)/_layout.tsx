import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import BottomNav from '@/components/BottomNav';
import CameraModal from '@/components/CameraModal';

const TabLayout = () => {
  const [showCameraModal, setShowCameraModal] = useState(false);

  const handleAddPress = () => {
    setShowCameraModal(true);
  };

  const handleCloseCamera = () => {
    setShowCameraModal(false);
  };

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