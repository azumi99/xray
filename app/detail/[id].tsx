import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { VStack, FormControl, Input, InputField, Button, Box, HStack, LinearGradient, FormControlLabel, FormControlLabelText, Badge } from '@gluestack-ui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraIcon, ImageIcon, PlusIcon, PackageIcon, MapPinIcon, UserIcon, CalendarIcon } from 'lucide-react-native';
import PhotoItem from '@/components/PhotoItem';
import { mockAwbDetail } from '@/mocks/awbList';

const DetailScreen = () => {
  const { id } = useLocalSearchParams();
  const [awbNumber, setAwbNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null);

  useEffect(() => {
    // Load initial photo from params if provided
    const initialPhotoParam = router.getState()?.params?.initialPhoto;
    if (initialPhotoParam) {
      setInitialPhoto(initialPhotoParam as string);
      setPhotos([initialPhotoParam as string]);
    }

    // Load AWB detail (in real app, this would come from API)
    if (id !== 'new') {
      setAwbNumber(mockAwbDetail.awbNumber);
      setCustomerName(mockAwbDetail.customerName || '');
      setOrigin(mockAwbDetail.origin || '');
      setDestination(mockAwbDetail.destination || '');
      setWeight(mockAwbDetail.weight || '');
      setDimensions(mockAwbDetail.dimensions || '');
      setNotes(mockAwbDetail.notes || '');
      setPhotos(mockAwbDetail.photos);
    }
  }, [id]);

  const handleDeletePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
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
          <VStack px="md" space="md">
            {/* Header */}
            <VStack mb="lg" px="sm">
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

                {/* Customer and Origin/Destination Fields */}
                <HStack space="md">
                  <FormControl flex={1}>
                    <FormControlLabel mb="sm">
                      <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Customer</FormControlLabelText>
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
                        placeholder="Customer name"
                        value={customerName}
                        onChangeText={setCustomerName}
                        color="$text900"
                      />
                    </Input>
                  </FormControl>
                </HStack>

                <HStack space="md">
                  <FormControl flex={1}>
                    <FormControlLabel mb="sm">
                      <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Origin</FormControlLabelText>
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
                        placeholder="Origin city"
                        value={origin}
                        onChangeText={setOrigin}
                        color="$text900"
                      />
                    </Input>
                  </FormControl>

                  <FormControl flex={1}>
                    <FormControlLabel mb="sm">
                      <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Destination</FormControlLabelText>
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
                        placeholder="Destination city"
                        value={destination}
                        onChangeText={setDestination}
                        color="$text900"
                      />
                    </Input>
                  </FormControl>
                </HStack>

                {/* Weight and Dimensions Fields */}
                <HStack space="md">
                  <FormControl flex={1}>
                    <FormControlLabel mb="sm">
                      <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Weight</FormControlLabelText>
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
                        placeholder="e.g. 2.5 kg"
                        value={weight}
                        onChangeText={setWeight}
                        color="$text900"
                      />
                    </Input>
                  </FormControl>

                  <FormControl flex={1}>
                    <FormControlLabel mb="sm">
                      <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Dimensions</FormControlLabelText>
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
                        placeholder="e.g. 30x20x15 cm"
                        value={dimensions}
                        onChangeText={setDimensions}
                        color="$text900"
                      />
                    </Input>
                  </FormControl>
                </HStack>

                <FormControl>
                  <FormControlLabel mb="sm">
                    <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Notes</FormControlLabelText>
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
                      placeholder="Additional notes"
                      value={notes}
                      onChangeText={setNotes}
                      color="$text900"
                    />
                  </Input>
                </FormControl>

                {/* Photo Gallery */}
                <FormControl>
                  <FormControlLabel mb="sm">
                    <FormControlLabelText fontWeight="600" color="$text900" fontSize="$sm">Photos</FormControlLabelText>
                  </FormControlLabel>
                  <HStack flexWrap="wrap" mb="sm">
                    {photos.map((photo, index) => (
                      <PhotoItem
                        key={index}
                        uri={photo}
                        onDelete={() => handleDeletePhoto(index)}
                      />
                    ))}
                    {/* Add Photo Card */}
                    <TouchableOpacity>
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