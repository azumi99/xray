import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { VStack, FormControl, Input, InputField, Button, Box, HStack, LinearGradient, FormControlLabel, FormControlLabelText, Badge } from '@gluestack-ui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraIcon, ImageIcon, PlusIcon, PackageIcon, MapPinIcon, UserIcon, CalendarIcon } from 'lucide-react-native';
import { launchCameraAsync, MediaTypeOptions, requestCameraPermissionsAsync } from 'expo-image-picker';
import PhotoItem from '@/components/PhotoItem';
import { mockAwbDetail } from '@/mocks/awbList';

const DetailScreen = () => {
  const params = useLocalSearchParams();
  const { id } = params;
  const [awbNumber, setAwbNumber] = useState('');
  const [photoAirwaybill, setPhotoAirwaybill] = useState<string | null>(null); // Airwaybill photo
  const [xrayPhotos, setXrayPhotos] = useState<string[]>([]); // Multiple X-ray photos
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null);

  useEffect(() => {
    // Load initial photo from params if provided
    const initialPhotoParam = params.initialPhoto as string | undefined;
    if (initialPhotoParam) {
      setInitialPhoto(initialPhotoParam);
      // Set as photoAirwaybill if this is the primary airwaybill photo
      setPhotoAirwaybill(initialPhotoParam);
    }

    // Load AWB detail (in real app, this would come from API)
    if (id !== 'new') {
      setAwbNumber(mockAwbDetail.awbNumber);
      // Set photos based on the new structure
      setPhotoAirwaybill(mockAwbDetail.photoAirwaybill || null);
      setXrayPhotos(mockAwbDetail.xrayPhotos || []);
    }
  }, [id]);

  const handleDeletePhoto = (photoType: 'photoAirwaybill' | 'xrayPhotos', index?: number) => {
    // Delete the specified photo type
    if (photoType === 'photoAirwaybill') {
      setPhotoAirwaybill(null);
    } else if (photoType === 'xrayPhotos' && index !== undefined) {
      // Remove photo at the specific index from xrayPhotos array
      const newPhotos = [...xrayPhotos];
      newPhotos.splice(index, 1);
      setXrayPhotos(newPhotos);
    }
  };

  const handleAddPhoto = async (photoType: 'photoAirwaybill' | 'xrayPhotos') => {
    // Request camera permissions
    const { status } = await requestCameraPermissionsAsync();

    if (status === 'granted') {
      // Open camera to capture photo using expo-image-picker
      const result = await launchCameraAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newPhotoUri = result.assets[0].uri;
        // Set the appropriate photo type based on parameter
        if (photoType === 'photoAirwaybill') {
          setPhotoAirwaybill(newPhotoUri);
        } else if (photoType === 'xrayPhotos') {
          // Add to the xrayPhotos array
          setXrayPhotos(prevPhotos => [...prevPhotos, newPhotoUri]);
        }
      }
    } else {
      Alert.alert('Permission required', 'Camera permission is required to add photos.');
    }
  };

  const handleSave = () => {
    // Validate form
    if (!awbNumber.trim()) {
      Alert.alert('Error', 'AWB Number is required');
      return;
    }

    // Create AWB object with the updated structure
    const awbData = {
      awbNumber,
      photoAirwaybill,
      xrayPhotos
    };

    // In UI phase, just show success message
    Alert.alert('Success', 'Saved successfully (dummy)');
    router.back();
  };

  const getStatusBadge = () => {
    if (id === 'new') {
      return (
        <Badge
          bg="$primary100"
          px="$3"
          py="$1"
          borderRadius="$full"
        >
          <Text color="$primary600" fontWeight="$600" fontSize="$sm">
            NEW
          </Text>
        </Badge>
      );
    }
    return (
      <Badge
        bg="$success100"
        px="$3"
        py="$1"
        borderRadius="$full"
      >
        <Text color="$success600" fontWeight="$600" fontSize="$sm">
          COMPLETED
        </Text>
      </Badge>
    );
  };

  return (
    <LinearGradient
      colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 120, // Increased padding for bottom nav
            paddingTop: 20
          }}
        >
          <VStack p={10} space="md">
            {/* Header */}
            <VStack space='md'>
              <HStack alignItems="center" space="md">
                <Box
                  w="$12"
                  h="$12"
                  borderRadius="$xl"
                  bg="linear-gradient(135deg, #0284C7 0%, #0369A1 100%)"
                  alignItems="center"
                  justifyContent="center"
                  shadow="$2"
                >
                  <PackageIcon size={24} color="white" />
                </Box>
                <VStack flex={1}>
                  <Text fontWeight="bold" fontSize="$2xl" color="$text900">
                    {id === 'new' ? 'New AWB' : 'AWB Detail'}
                  </Text>
                  <Text color="$text500" mt="sm">Fill the information below</Text>
                </VStack>
                {getStatusBadge()}
              </HStack>
            </VStack>

            {/* Content Card */}
            <Box 
              bg="$white" 
              borderRadius="$2xl" 
              p="lg" 
              shadowColor="$backgroundLight500"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.1}
              shadowRadius={8}
              borderWidth={1}
              borderColor="$borderLight100"
            >
              <VStack space="md">
                {/* AWB Number Field */}
                <FormControl>
                  <FormControlLabel mb="sm">
                    <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">AWB Number</FormControlLabelText>
                  </FormControlLabel>
                  <Input
                    borderRadius="$lg"
                    borderColor="$borderLight200"
                    borderWidth={1}
                    py="sm"
                    px="md"
                    bg="$background50"
                  >
                    <InputField
                      placeholder="Enter AWB number"
                      value={awbNumber}
                      onChangeText={setAwbNumber}
                      color="$text900"
                    />
                  </Input>
                </FormControl>

                {/* Photo Airwaybill */}
                <FormControl mb="md">
                  <FormControlLabel mb="sm">
                    <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Photo Airwaybill</FormControlLabelText>
                  </FormControlLabel>
                  {photoAirwaybill ? (
                    <Box>
                      <Box
                        borderWidth={1}
                        borderColor="$borderLight300"
                        borderRadius="$xl"
                        overflow="hidden"
                        width="100%"
                        height={200}
                        mb="$3"
                        bg="$background50"
                      >
                        <Image
                          source={{ uri: photoAirwaybill }}
                          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                        />
                      </Box>
                    </Box>
                  ) : (
                    <TouchableOpacity onPress={() => handleAddPhoto('photoAirwaybill')}>
                      <Box
                        borderWidth={1}
                        borderColor="$borderLight300"
                        borderRadius="$xl"
                        borderStyle="dashed"
                        justifyContent="center"
                        alignItems="center"
                        width="100%"
                        height={200}
                        bg="$background50"
                      >
                        <PlusIcon size={40} color="#9CA3AF" />
                        <Text mt="$2" color="$text400">Add Photo Airwaybill</Text>
                      </Box>
                    </TouchableOpacity>
                  )}
                </FormControl>

                {/* X-ray Photos */}
                <FormControl mb="md">
                  <FormControlLabel mb="sm">
                    <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">X-ray Photos</FormControlLabelText>
                  </FormControlLabel>
                  {xrayPhotos.length > 0 ? (
                    <VStack space="sm">
                      {xrayPhotos.map((photo, index) => (
                        <Box key={index}>
                          <Box
                            borderWidth={1}
                            borderColor="$borderLight300"
                            borderRadius="$xl"
                            overflow="hidden"
                            width="100%"
                            height={200}
                            mb="$3"
                            bg="$background50"
                          >
                            <Image
                              source={{ uri: photo }}
                              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                            />
                          </Box>
                          <TouchableOpacity
                            onPress={() => handleDeletePhoto('xrayPhotos', index)}
                            style={{ alignSelf: 'flex-end' }}
                          >
                            <Box
                              bg="$red500"
                              borderRadius="$md"
                              px="$3"
                              py="$2"
                            >
                              <Text color="white" fontSize="$sm">Delete</Text>
                            </Box>
                          </TouchableOpacity>
                        </Box>
                      ))}
                      {/* Add More X-ray Photo Button */}
                      <TouchableOpacity
                        onPress={() => handleAddPhoto('xrayPhotos')}
                        style={{ marginTop: 10 }}
                      >
                        <Box
                          borderWidth={1}
                          borderColor="$borderLight300"
                          borderRadius="$xl"
                          borderStyle="dashed"
                          justifyContent="center"
                          alignItems="center"
                          width="100%"
                          height={100}
                          bg="$background50"
                        >
                          <PlusIcon size={30} color="#9CA3AF" />
                          <Text mt="$2" color="$text400">Add More X-ray Photo</Text>
                        </Box>
                      </TouchableOpacity>
                    </VStack>
                  ) : (
                    <TouchableOpacity onPress={() => handleAddPhoto('xrayPhotos')}>
                      <Box
                        borderWidth={1}
                        borderColor="$borderLight300"
                        borderRadius="$xl"
                        borderStyle="dashed"
                        justifyContent="center"
                        alignItems="center"
                        width="100%"
                        height={200}
                        bg="$background50"
                      >
                        <PlusIcon size={40} color="#9CA3AF" />
                        <Text mt="$2" color="$text400">Add X-ray Photo</Text>
                      </Box>
                    </TouchableOpacity>
                  )}
                </FormControl>
              </VStack>
            </Box>
          </VStack>
        </ScrollView>

        {/* Save Button - Positioned as sticky footer */}
        <Button
          position="absolute"
          bottom={80} // Account for bottom nav height
          left={20}
          right={20}
          onPress={handleSave}
          borderRadius="$2xl"
          py="md"
          bg="linear-gradient(135deg, #0284C7 0%, #0369A1 100%)"
          shadow="$4"
          _pressed={{ bg: "linear-gradient(135deg, #0369A1 0%, #075985 100%)" }}
        >
          <Text style={{color: 'white'}} fontWeight="md" fontSize="$md">Save Changes</Text>
        </Button>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default DetailScreen;