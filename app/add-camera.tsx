import React, { useState, useRef, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { VStack, HStack, Box } from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { XIcon, CameraIcon, RotateCcwIcon, ImageIcon, PackageIcon } from 'lucide-react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';

const AddCameraScreen = () => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permissions, requestPermissions] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permissions) {
      requestPermissions();
    }
  }, []);

  if (!permissions) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Requesting camera permissions...</Text>
      </SafeAreaView>
    );
  }

  if (!permissions.granted) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Box bg="$red100" p="$4" borderRadius="$md" mb="$4">
          <Text color="$red900" textAlign="center" fontWeight="$medium">
            Camera permissions are required to use this feature
          </Text>
        </Box>
        <TouchableOpacity onPress={requestPermissions} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={[styles.permissionButton, styles.cancelButton]}>
          <Text style={[styles.permissionButtonText, { color: '#6B7280' }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleCapture = async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

        // Navigate to detail screen with captured photo
        router.push({
          pathname: '/detail/new',
          params: { initialPhoto: photo.uri }
        });
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Box flex={1} bg="$background0" position="relative">
        {/* Camera View */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          enableTorch={false}
          active={true}
        />

        {/* Top overlay */}
        <HStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          pt={Platform.OS === 'ios' ? "$xl" : "$md"}
          px="sm"
          zIndex={10}
          justifyContent="space-between"
        >
          <TouchableOpacity onPress={handleBack}>
            <Box bg="rgba(0,0,0,0.5)" p="$3" borderRadius="$full" style={styles.overlayButton}>
              <XIcon color="#FFFFFF" size={20} />
            </Box>
          </TouchableOpacity>
          <HStack alignItems="center" space="md">
            <PackageIcon size={20} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Capture AWB</Text>
          </HStack>
          <TouchableOpacity onPress={toggleCameraFacing}>
            <Box bg="rgba(0,0,0,0.5)" p="$3" borderRadius="$full" style={styles.overlayButton}>
              <RotateCcwIcon color="#FFFFFF" size={20} />
            </Box>
          </TouchableOpacity>
        </HStack>

        {/* Center overlay - AWB frame guide */}
        <VStack
          position="absolute"
          top="30%"
          left="10%"
          right="10%"
          height={220}
          justifyContent="center"
          alignItems="center"
        >
          {/* Frame guide */}
          <Box
            width="100%"
            height="100%"
            borderWidth={2}
            borderColor="rgba(2, 132, 199, 0.8)"
            borderStyle="dashed"
            borderRadius="$lg"
            alignItems="center"
            justifyContent="center"
            bg="transparent"
          >
            <View style={styles.frameInner} />
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', marginTop: 20, fontWeight: '600', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 } }}>
              Align the AWB inside the frame
            </Text>
          </Box>
        </VStack>

        {/* Bottom overlay */}
        <VStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          pb={Platform.OS === 'ios' ? "$xl" : "$md"}
          px="sm"
          zIndex={10}
          backgroundColor="transparent"
          pt="$6"
        >
          {/* Gallery placeholder */}
          <HStack justifyContent="center" mb="lg">
            <TouchableOpacity style={styles.galleryButton}>
              <Box bg="rgba(255,255,255,0.2)" borderRadius="$full" p="$3">
                <ImageIcon color="#FFFFFF" size={20} />
              </Box>
            </TouchableOpacity>
          </HStack>

          {/* Capture button */}
          <VStack alignItems="center">
            <TouchableOpacity onPress={handleCapture} style={styles.captureButton}>
              <Box
                width={80}
                height={80}
                borderRadius={40}
                bg="$white"
                alignItems="center"
                justifyContent="center"
                borderWidth={4}
                borderColor="rgba(255,255,255,0.3)"
                shadow="$4"
              >
                <Box
                  width={64}
                  height={64}
                  borderRadius={32}
                  bg="$white"
                />
              </Box>
            </TouchableOpacity>
          </VStack>
        </VStack>
      </Box>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  frameInner: {
    position: 'absolute',
    width: '90%',
    height: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'solid',
    borderRadius: 8,
  },
  cornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 4,
  },
  overlayButton: {
    backdropFilter: 'blur(10px)',
  },
  permissionButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 200,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  galleryButton: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  captureButton: {
    borderRadius: 40,
    overflow: 'hidden',
  },
});

export default AddCameraScreen;