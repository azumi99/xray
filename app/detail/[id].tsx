import { useAuth } from '@/lib/store/auth';
import { gql, useQuery } from '@apollo/client';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { CalendarIcon, CameraIcon, PackageIcon } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';

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

// Define styles outside component to prevent undefined error
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statusBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeText: {
    color: '#16A34A',
    fontWeight: '600',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
    minWidth: 80,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: ((Dimensions.get('window').width - 48) / 2) - 6,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});

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

  // Update document title for web and potentially other platforms
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = awbData?.airwaybill_number || 'AWB Details';
    }
  }, [awbData?.airwaybill_number]);

  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '/storage');

const imageUrl = `${baseUrl}/${awbData?.photo_airwaybill}`;

  // Loading state
  if (graphQLLoading) {
    return (
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={styles.container}
      >
        <View style={[styles.scrollView, styles.emptyState]}>
          <View style={styles.emptyIcon}>
            <PackageIcon size={32} color="#0284C7" />
          </View>
          <Text style={styles.emptyTitle}>Loading AWB Detail...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Error state
  if (error) {
    return (
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={styles.container}
      >
        <View style={[styles.scrollView, styles.emptyState]}>
          <View style={[styles.emptyIcon, { backgroundColor: '#FEE2E2' }]}>
            <PackageIcon size={32} color="#DC2626" />
          </View>
          <Text style={styles.emptyTitle}>Error loading AWB detail</Text>
          <Text style={styles.emptySubtitle}>{error.message}</Text>
          <View
            style={[styles.badge, {
              backgroundColor: '#0284C7',
              marginTop: 16
            }]}
          >
            <Text style={[styles.badgeText, { color: 'white' }]}>Go Back</Text>
          </View>
        </View>
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
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>COMPLETED</Text>
          </View>
        </View>

        {/* AWB Information Card */}
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <PackageIcon size={24} color="white" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{awbData?.airwaybill_number || 'N/A'}</Text>
              <Text style={styles.subtitle}>AWB Number</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <CalendarIcon size={16} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoText}>{formatDate(awbData?.created_at)}</Text>
          </View>

          <View style={styles.infoRow}>
            <CameraIcon size={16} color="#9CA3AF" />
            <Text style={styles.infoLabel}>Photos:</Text>
            <Text style={styles.infoText}>{awbData?.xray_photos_count || 0} X-ray photos</Text>
          </View>
        </View>

        {/* Airwaybill Photo */}
        {awbData?.photo_airwaybill && (
          <View style={styles.card}>
            <Text style={styles.title}>Airwaybill Photo</Text>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                onLoad={handleImageLoad}
              />
            </View>
          </View>
        )}

        {/* X-ray Photos */}
        {xrayPhotos.length > 0 && (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>X-ray Photos</Text>
              <Text style={styles.subtitle}>{xrayPhotos.length} photos</Text>
            </View>
            <View style={styles.photoGrid}>
              {xrayPhotos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.photo}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No Photos State */}
        {!awbData?.photo_airwaybill && xrayPhotos.length === 0 && (
          <View style={[styles.card, styles.emptyState]}>
            <View style={styles.emptyIcon}>
              <CameraIcon size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Photos Available</Text>
            <Text style={styles.emptySubtitle}>
              This AWB doesn't have any photos yet
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

export default DetailScreen;