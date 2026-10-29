import BottomNav from '@/components/BottomNav';
import OCRCameraModal from '@/components/OCRCameraModal';
import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

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
     

      {/* OCR Camera Modal */}
       <OCRCameraModal
         visible={showOCRModal}
         onClose={handleCloseOCR}
         onCaptureComplete={() => {
           DeviceEventEmitter.emit('awb-list-refresh');
           handleCloseOCR();
         }}
       />
    </>
  );
};

export default TabLayout;