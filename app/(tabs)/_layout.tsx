import { Tabs } from 'expo-router';
import { View } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/store/auth';
import { router } from 'expo-router';
import BottomNav from '@/components/BottomNav';
import CameraModal from '@/components/CameraModal';
import OCRCameraModal from '@/components/OCRCameraModal';

const TabLayout = () => {
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);

  const handleAddPress = () => {
    setShowCameraModal(true);
  };

  const handleCloseCamera = () => {
    setShowCameraModal(false);
  };

  const handleOcrPress = () => {
    setShowOCRModal(true);
  };

  const handleCloseOCR = () => {
    setShowOCRModal(false);
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
      <BottomNav onAddPress={handleAddPress} onOcrPress={handleOcrPress} />

      {/* Camera Modal */}
      <CameraModal
        // visible={showCameraModal}
        // onClose={handleCloseCamera}

        visible={showOCRModal}
        onClose={handleCloseOCR}
      />

      {/* OCR Camera Modal */}
      <OCRCameraModal
        visible={showOCRModal}
        onClose={handleCloseOCR}
      />
    </>
  );
};

export default TabLayout;