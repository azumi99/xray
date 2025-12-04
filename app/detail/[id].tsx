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
  const [photos, setPhotos] = useState<string[]>([]);
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null);

  useEffect(() => {
    // Load initial photo from params if provided
    const initialPhotoParam = params.initialPhoto as string | undefined;
    if (initialPhotoParam) {
      setInitialPhoto(initialPhotoParam);
      setPhotos([initialPhotoParam]);
    }

    // Load AWB detail (in real app, this would come from API)
    if (id !== 'new') {
      setAwbNumber(mockAwbDetail.awbNumber);
      setPhotos(mockAwbDetail.photos);
    }
  }, [id]);

  const handleDeletePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleAddPhoto = async () => {
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
        // Add the new photo to the array of additional photos
        setPhotos(prevPhotos => [...prevPhotos, newPhotoUri]);
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

                {/* Main Header Photo */}
                {photos.length > 0 && (
                  <FormControl mb="md">
                    <FormControlLabel mb="sm">
                      <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Header Photo</FormControlLabelText>
                    </FormControlLabel>
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
                        source={{ uri: photos[0] }}
                        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                      />
                    </Box>
                  </FormControl>
                )}

                {/* Additional Photos */}
                <FormControl>
                  <FormControlLabel mb="sm">
                    <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Additional Photos</FormControlLabelText>
                  </FormControlLabel>
                  <HStack flexWrap="wrap" mb="sm">
                    {photos.slice(1).map((photo, index) => (
                      <PhotoItem
                        key={index + 1} // Adjust key to account for the first photo being excluded
                        uri={photo}
                        onDelete={() => handleDeletePhoto(index + 1)} // index+1 because we slice from index 1
                      />
                    ))}
                    {/* Add Photo Card */}
                    <TouchableOpacity onPress={handleAddPhoto}>
                      <Box
                        borderWidth={1}
                        borderColor="$borderLight300"
                        borderRadius="$2xl"
                        borderStyle="dashed"
                        justifyContent="center"
                        alignItems="center"
                        width={100}
                        height={100}
                        mr="$2"
                        mb="$2"
                        bg="$background50"
                      >
                        <PlusIcon size={24} color="#9CA3AF" />
                      </Box>
                    </TouchableOpacity>
                  </HStack>
                </FormControl>

                {/* Add Photo Button */}
                <Button
                  variant="outline"
                  borderColor="$borderLight300"
                  borderWidth={1}
                  borderRadius="$xl"
                  py="sm"
                  bg="$background50"
                  _text={{ color: '$primary600', fontWeight: '600' }}
                  onPress={handleAddPhoto}
                >
                  <HStack alignItems="center" space="sm">
                    <CameraIcon size={16} color="#0284C7" />
                    <Text>Add more photos</Text>
                  </HStack>
                </Button>
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
          <Text color="white" fontWeight="600" fontSize="$md">Save Changes</Text>
        </Button>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default DetailScreen;