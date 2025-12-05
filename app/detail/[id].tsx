import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, Image, Dimensions } from 'react-native';
import { VStack, Box, HStack, LinearGradient, Badge, Pressable } from '@gluestack-ui/themed';
import { router, useLocalSearchParams } from 'expo-router';
import { PackageIcon, CalendarIcon, CameraIcon, ArrowLeftIcon } from 'lucide-react-native';
import { useQuery, gql } from '@apollo/client';
import { useAuth } from '@/lib/store/auth';
import StatusBarSafeArea from '@/components/StatusBarSafeArea';

// GraphQL query for AWB detail
const GET_AWB_DETAIL = gql`
  query GetAirwaybillXrayWithDetails($id: ID!) {
    airwaybillXrayWithDetails(id: $id) {
      id
      airwaybill_number
      photo_airwaybill
      created_at
      xray_photos_count
      airwaybillXrayDetails {
        id
        id_airwaybill
        xray_photo
        created_at
      }
    }
  }
`;

const DetailScreen = () => {
  const params = useLocalSearchParams();
  const { id } = params;
  const { session } = useAuth();
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // GraphQL query for AWB detail
  const {
    data,
    loading: graphQLLoading,
    error,
  } = useQuery(GET_AWB_DETAIL, {
    variables: { id },
    skip: !session || id === 'new',
    fetchPolicy: 'network-only',
  });

  const awbData = data?.airwaybillXrayWithDetails;
  const xrayPhotos = awbData?.airwaybillXrayDetails?.map((detail: any) => detail.xray_photo).filter(Boolean) || [];

  const handleImageLoad = () => {
    Image.getSize(awbData?.photo_airwaybill || '', (width, height) => {
      const screenWidth = Dimensions.get('window').width - 40; // Account for padding
      const aspectRatio = height / width;
      setImageDimensions({
        width: screenWidth,
        height: screenWidth * aspectRatio
      });
    });
  };

  useEffect(() => {
    if (awbData?.photo_airwaybill) {
      handleImageLoad();
    }
  }, [awbData?.photo_airwaybill]);

  // Loading state
  if (graphQLLoading) {
    return (
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={{ flex: 1 }}
      >
        <StatusBarSafeArea>
          <VStack flex={1} alignItems="center" justifyContent="center">
            <Box
              w="$16"
              h="$16"
              borderRadius="$xl"
              bg="rgba(2, 132, 199, 0.1)"
              alignItems="center"
              justifyContent="center"
            >
              <PackageIcon size={40} color="#0284C7" />
            </Box>
            <Text mt="$4" color="$text500" fontSize="$lg">
              Loading AWB Detail...
            </Text>
          </VStack>
        </StatusBarSafeArea>
      </LinearGradient>
    );
  }

  // Error state
  if (error) {
    return (
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={{ flex: 1 }}
      >
        <StatusBarSafeArea>
          <VStack flex={1} alignItems="center" justifyContent="center" p="$4">
            <Box
              w="$16"
              h="$16"
              borderRadius="$xl"
              bg="rgba(239, 68, 68, 0.1)"
              alignItems="center"
              justifyContent="center"
            >
              <PackageIcon size={40} color="#EF4444" />
            </Box>
            <Text mt="$4" color="$text500" fontSize="$lg" textAlign="center">
              Error loading AWB detail
            </Text>
            <Text mt="$2" color="$text400" fontSize="$sm" textAlign="center">
              {error.message}
            </Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
              <Box bg="$primary600" px="$6" py="$3" borderRadius="$md">
                <Text color="white" fontWeight="600">Go Back</Text>
              </Box>
            </Pressable>
          </VStack>
        </StatusBarSafeArea>
      </LinearGradient>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <LinearGradient
      colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
      style={{ flex: 1 }}
    >
      <StatusBarSafeArea>
        {/* Header */}
        <Box
          bg="rgba(255, 255, 255, 0.9)"
          borderBottomWidth={1}
          borderBottomColor="$borderLight200"
          p="$4"
        >
          <HStack alignItems="center" space="md">
            <Pressable onPress={() => router.back()}>
              <Box
                w="$10"
                h="$10"
                borderRadius="$full"
                bg="$primary100"
                alignItems="center"
                justifyContent="center"
              >
                <ArrowLeftIcon size={20} color="#0284C7" />
              </Box>
            </Pressable>

            <VStack flex={1}>
              <Text fontWeight="bold" fontSize="$lg" color="$text900">
                AWB Details
              </Text>
              <Text color="$text500" fontSize="$sm">
                {awbData?.airwaybill_number || 'N/A'}
              </Text>
            </VStack>

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
          </HStack>
        </Box>

        <ScrollView
          contentContainerStyle={{
            paddingBottom: 120,
            paddingTop: 20
          }}
          showsVerticalScrollIndicator={false}
        >
          <VStack space="lg" px="$4">
            {/* AWB Information Card */}
            <Box
              bg="$white"
              borderRadius="$2xl"
              p="$5"
              shadow="$2"
              borderWidth={1}
              borderColor="$borderLight100"
            >
              <VStack space="md">
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
                      {awbData?.airwaybill_number || 'N/A'}
                    </Text>
                    <Text color="$text500" fontSize="$sm">
                      AWB Number
                    </Text>
                  </VStack>
                </HStack>

                <Box
                  h="$1"
                  bg="$borderLight200"
                  my="$2"
                />

                <VStack space="sm">
                  <HStack alignItems="center" space="sm">
                    <CalendarIcon size={16} color="$text400" />
                    <Text color="$text600" fontSize="$sm">Created:</Text>
                    <Text color="$text900" fontSize="$sm" fontWeight="500">
                      {formatDate(awbData?.created_at)}
                    </Text>
                  </HStack>

                  <HStack alignItems="center" space="sm">
                    <CameraIcon size={16} color="$text400" />
                    <Text color="$text600" fontSize="$sm">Total X-ray Photos:</Text>
                    <Text color="$text900" fontSize="$sm" fontWeight="500">
                      {awbData?.xray_photos_count || 0}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </Box>

            {/* Airwaybill Photo */}
            {awbData?.photo_airwaybill && (
              <Box
                bg="$white"
                borderRadius="$2xl"
                p="$5"
                shadow="$2"
                borderWidth={1}
                borderColor="$borderLight100"
              >
                <VStack space="md">
                  <Text fontWeight="600" color="$text900" fontSize="$lg">
                    Airwaybill Photo
                  </Text>

                  <Box
                    borderRadius="$xl"
                    overflow="hidden"
                    shadow="$1"
                  >
                    <Image
                      source={{ uri: awbData.photo_airwaybill }}
                      style={{
                        width: '100%',
                        height: imageDimensions.height || 250,
                        resizeMode: 'contain',
                        backgroundColor: '#F9FAFB'
                      }}
                    />
                  </Box>
                </VStack>
              </Box>
            )}

            {/* X-ray Photos */}
            {xrayPhotos.length > 0 && (
              <Box
                bg="$white"
                borderRadius="$2xl"
                p="$5"
                shadow="$2"
                borderWidth={1}
                borderColor="$borderLight100"
              >
                <VStack space="md">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontWeight="600" color="$text900" fontSize="$lg">
                      X-ray Photos
                    </Text>
                    <Text color="$text500" fontSize="$sm">
                      {xrayPhotos.length} photos
                    </Text>
                  </HStack>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                  >
                    {xrayPhotos.map((photo, index) => (
                      <Box key={index} style={{ marginRight: 12 }}>
                        <Box
                          width={120}
                          height={120}
                          borderRadius="$md"
                          overflow="hidden"
                          borderWidth={1}
                          borderColor="$borderLight200"
                          shadow="$1"
                        >
                          <Image
                            source={{ uri: photo }}
                            style={{
                              width: '100%',
                              height: '100%',
                              resizeMode: 'cover',
                              backgroundColor: '#F9FAFB'
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </ScrollView>
                </VStack>
              </Box>
            )}

            {/* No Photos State */}
            {!awbData?.photo_airwaybill && xrayPhotos.length === 0 && (
              <Box
                bg="$white"
                borderRadius="$2xl"
                p="$8"
                shadow="$2"
                borderWidth={1}
                borderColor="$borderLight100"
                alignItems="center"
              >
                <Box
                  w="$16"
                  h="$16"
                  borderRadius="$xl"
                  bg="rgba(156, 163, 175, 0.1)"
                  alignItems="center"
                  justifyContent="center"
                  mb="$4"
                >
                  <CameraIcon size={32} color="#9CA3AF" />
                </Box>
                <Text color="$text500" fontSize="$lg" fontWeight="600" textAlign="center">
                  No Photos Available
                </Text>
                <Text color="$text400" fontSize="$sm" textAlign="center" mt="$2">
                  This AWB doesn't have any photos yet
                </Text>
              </Box>
            )}
          </VStack>
        </ScrollView>
      </StatusBarSafeArea>
    </LinearGradient>
  );
};

export default DetailScreen;