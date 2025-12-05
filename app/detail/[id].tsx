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
  const [ocrResult, setOcrResult] = useState<any>(null);

  useEffect(() => {
    // Load initial photo from params if provided
    const initialPhotoParam = params.initialPhoto as string | undefined;
    if (initialPhotoParam) {
      setInitialPhoto(initialPhotoParam);
      // Set as photoAirwaybill if this is the primary airwaybill photo
      setPhotoAirwaybill(initialPhotoParam);

      // Initialize xrayPhotos with the captured photo
      setXrayPhotos([initialPhotoParam]);
    }

    // Handle OCR result if provided
    const ocrResultParam = params.ocrResult as string | undefined;
    if (ocrResultParam) {
      try {
        const parsedOcrResult = JSON.parse(ocrResultParam);
        setOcrResult(parsedOcrResult);

        // Auto-fill AWB number if OCR was successful
        if (parsedOcrResult?.data?.awb_numbers && parsedOcrResult.data.awb_numbers.length > 0) {
          const detectedAwbNumber = parsedOcrResult.data.awb_numbers[0];
          setAwbNumber(detectedAwbNumber);

          // Show success alert
          setTimeout(() => {
            Alert.alert(
              '✅ AWB Detected',
              `Found: ${detectedAwbNumber}\nConfidence: 95%`,
              [{ text: 'OK' }]
            );
          }, 500);
        }
      } catch (error) {
        console.error('Error parsing OCR result:', error);
      }
    }

    // Load AWB detail (in real app, this would come from API)
    if (id !== 'new') {
      setAwbNumber(mockAwbDetail.awbNumber);
      // Set photos based on the new structure
      setPhotoAirwaybill(mockAwbDetail.photoAirwaybill || null);
      setXrayPhotos(mockAwbDetail.xrayPhotos || []);
    }
  }, [id, params.initialPhoto, params.ocrResult]);

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
      Alert.alert('Add Photo', 'Choose source', [
        {
          text: 'Camera',
          onPress: async () => {
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
                // Also add to xrayPhotos if it's not already there
                if (!xrayPhotos.includes(newPhotoUri)) {
                  setXrayPhotos(prevPhotos => [newPhotoUri, ...prevPhotos]);
                }
              } else if (photoType === 'xrayPhotos') {
                // Add to the xrayPhotos array
                setXrayPhotos(prevPhotos => [...prevPhotos, newPhotoUri]);
              }
            }
          }
        },
        {
          text: 'Gallery',
          onPress: async () => {
            // For gallery, we'd need to use launchImageLibraryAsync
            // For now, let's focus on camera functionality
            Alert.alert('Coming Soon', 'Gallery access will be available soon');
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
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
                  <HStack justifyContent="space-between" alignItems="center" mb="sm">
                    <FormControlLabel>
                      <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">X-ray Photos ({xrayPhotos.length})</FormControlLabelText>
                    </FormControlLabel>
                    <TouchableOpacity onPress={() => handleAddPhoto('xrayPhotos')}>
                      <Box
                        bg="$primary100"
                        borderRadius="$sm"
                        px="$2"
                        py="$1"
                        flexDirection="row"
                        alignItems="center"
                        gap="$1"
                      >
                        <PlusIcon size={16} color="$primary600" />
                        <Text color="$primary600" fontWeight="600" fontSize="$xs">Add</Text>
                      </Box>
                    </TouchableOpacity>
                  </HStack>

                  {xrayPhotos.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                      {xrayPhotos.map((photo, index) => (
                        <Box key={index} style={{ marginRight: 12 }}>
                          <Box
                            width={100}
                            height={100}
                            borderRadius="$md"
                            overflow="hidden"
                            position="relative"
                            borderWidth={1}
                            borderColor="$borderLight200"
                          >
                            <Image
                              source={{ uri: photo }}
                              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                            />
                            {index === 0 && (
                              <Box
                                position="absolute"
                                top={4}
                                left={4}
                                bg="$primary600"
                                px="$2"
                                py={1}
                                borderRadius="$xs"
                              >
                                <Text color="$white" fontSize={10} fontWeight="bold">MAIN</Text>
                              </Box>
                            )}
                            {index !== 0 && (
                              <TouchableOpacity
                                onPress={() => handleDeletePhoto('xrayPhotos', index)}
                                style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                  padding: 4,
                                  borderRadius: 12,
                                }}
                              >
                                <Text color="white" fontSize={12} fontWeight="bold">×</Text>
                              </TouchableOpacity>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </ScrollView>
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