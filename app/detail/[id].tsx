import { useAuth } from '@/lib/store/auth';
import { gql, useQuery } from '@apollo/client';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Calendar, Camera, CheckCircle, Image as ImageIcon, Package, Search, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

// Clean design system - matching tabs/index theme
const COLORS = {
  primary: '#0284C7',
  primaryDark: '#0369A1',
  primaryLight: '#0EA5E9',
  success: '#10B981',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#64748B',
    inverse: '#FFFFFF'
  },
  border: '#F1F5F9',
  shadow: 'rgba(0, 0, 0, 0.03)'
};

const SPACING = {
  xs: 4,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36
};

const BORDER_RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  full: 9999
};

// Clean component styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: SPACING.sm,
    paddingBottom: SPACING.lg,
    flexGrow: 1,
  },
  // Status indicator
  statusContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusChip: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    color: COLORS.text.inverse,
    fontWeight: '500',
    fontSize: 12,
  },
  // Clean card design
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Main info card
  heroCard: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  awbNumber: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text.inverse,
    marginBottom: 2,
  },
  awbLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: SPACING.xs,
    minWidth: 60,
  },
  // Section styles
  section: {
    marginBottom: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  // Photo containers
  photoContainer: {
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: '#F8FAFA',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  // Photo grid
  photoGrid: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: '#F8FAFA',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Empty states
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#F8FAFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Photo components
  photoSection: {
    marginBottom: SPACING.sm,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  photoCount: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 24,
    alignItems: 'center',
  },
  photoCountText: {
    color: COLORS.text.inverse,
    fontSize: 11,
    fontWeight: '500',
  },
  // Photo item styles as card UI
  photoItemModern: {
    width: 90,
    height: 90,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumber: {
    position: 'absolute',
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  photoNumberText: {
    color: COLORS.text.inverse,
    fontSize: 10,
    fontWeight: '500',
  },
  // Main photo container as card UI
  heroPhotoContainer: {
    width: '100%',
    height: 160,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  heroPhotoLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const DetailScreen = () => {
  const params = useLocalSearchParams();
  const { id } = params;
  const { session } = useAuth();
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState<{ [key: number]: boolean }>({});
  const [selectedAirwaybillPhoto, setSelectedAirwaybillPhoto] = useState<string | null>(null);
  const [airwaybillPhotoLoading, setAirwaybillPhotoLoading] = useState(false);

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
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '/storage');

  const xrayPhotos = awbData?.airwaybillXrayDetails?.map((detail: any) => {
    const photoPath = detail.xray_photo;
    if (photoPath && !photoPath.startsWith('http')) {
      return `${baseUrl}/${photoPath}`;
    }
    return photoPath;
  }).filter(Boolean) || [];

  // Debug: Log untuk melihat data structure
  console.log('AWB Data:', JSON.stringify(awbData, null, 2));
  console.log('X-ray Photos:', xrayPhotos);
  console.log('AirwaybillXrayDetails:', awbData?.airwaybillXrayDetails);
  console.log('Base URL:', baseUrl);

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

const imageUrl = `${baseUrl}/${awbData?.photo_airwaybill}`;

  // Loading state
  if (graphQLLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
          style={{ flex: 1 }}
        >
          <View style={[styles.scrollView, styles.emptyContainer]}>
            <View style={styles.emptyIcon}>
              <Package size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Loading Details</Text>
            <Text style={styles.emptySubtitle}>Please wait a moment...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
          style={{ flex: 1 }}
        >
          <View style={[styles.scrollView, styles.emptyContainer]}>
            <View style={[styles.emptyIcon, { backgroundColor: '#FEF2F2' }]}>
              <X size={28} color="#EF4444" />
            </View>
            <Text style={styles.emptyTitle}>Unable to Load</Text>
            <Text style={styles.emptySubtitle}>{error.message}</Text>
          </View>
        </LinearGradient>
      </View>
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        alwaysBounceVertical={true}
      >
        {/* Status Chip */}
        <View style={styles.statusContainer}>
          <View style={styles.statusChip}>
            <CheckCircle size={14} color={COLORS.text.inverse} style={{ marginRight: SPACING.xs }} />
            <Text style={styles.chipText}>Completed</Text>
          </View>
        </View>

        {/* Main Info Card */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Package size={24} color={COLORS.text.inverse} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.awbNumber}>{awbData?.airwaybill_number || 'N/A'}</Text>
              <Text style={styles.awbLabel}>Airway Bill</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <Calendar size={16} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoText}>{formatDate(awbData?.created_at)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Camera size={16} color="rgba(255, 255, 255, 0.7)" />
            <Text style={styles.infoLabel}>Photos</Text>
            <Text style={styles.infoText}>{awbData?.xray_photos_count || 0} X-ray</Text>
          </View>
        </LinearGradient>

        {/* Airwaybill Photo Card */}
        {awbData?.photo_airwaybill && (
          <View style={[styles.card, { marginBottom: SPACING.sm }]}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ImageIcon size={16} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                <Text style={styles.sectionTitle}>Airwaybill Photo</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.heroPhotoContainer}
              onPress={() => setSelectedAirwaybillPhoto(imageUrl)}
              activeOpacity={0.8}
              disabled={airwaybillPhotoLoading}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.heroPhoto}
                onLoadStart={() => setAirwaybillPhotoLoading(true)}
                onLoadEnd={() => setAirwaybillPhotoLoading(false)}
                resizeMode="cover"
              />

              {/* Loading Overlay */}
              {airwaybillPhotoLoading && (
                <View style={styles.heroPhotoLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* X-ray Photos Card */}
        {xrayPhotos.length > 0 && (
          <View style={[styles.card, { marginBottom: SPACING.sm }]}>
            <View style={styles.photoHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Search size={16} color={COLORS.primary} style={{ marginRight: SPACING.xs }} />
                <Text style={styles.sectionTitle}>X-ray Photos</Text>
              </View>
              <View style={styles.photoCount}>
                <Text style={styles.photoCountText}>{xrayPhotos.length}</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: 4 }}
            >
              {xrayPhotos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.photoItemModern}
                  onPress={() => setSelectedPhoto(photo)}
                  activeOpacity={0.8}
                >
                  {/* Photo Number Badge */}
                  <View style={styles.photoNumber}>
                    <Text style={styles.photoNumberText}>{index + 1}</Text>
                  </View>

                  {/* Loading Overlay */}
                  {photoLoading[index] && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                  )}

                  {/* X-ray Photo */}
                  <Image
                    source={{ uri: photo }}
                    style={styles.photoThumbnail}
                    onLoadStart={() => setPhotoLoading(prev => ({ ...prev, [index]: true }))}
                    onLoadEnd={() => setPhotoLoading(prev => ({ ...prev, [index]: false }))}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Empty State - No X-Ray Photos */}
        {awbData?.photo_airwaybill && xrayPhotos.length === 0 && (
          <View style={styles.card}>
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Search size={24} color={COLORS.text.tertiary} />
              </View>
              <Text style={styles.emptyTitle}>No X-Ray Photos</Text>
              <Text style={styles.emptySubtitle}>
                X-ray photos will appear here once they're added
              </Text>
            </View>
          </View>
        )}

        {/* Empty State - No Photos */}
        {!awbData?.photo_airwaybill && xrayPhotos.length === 0 && (
          <View style={styles.card}>
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Camera size={24} color={COLORS.text.tertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Photos Available</Text>
              <Text style={styles.emptySubtitle}>
                Photos will be added to this AWB soon
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* X-ray Photo Modal */}
      {selectedPhoto && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedPhoto(null)}
            activeOpacity={0.9}
          >
            <X size={20} color={COLORS.text.inverse} />
          </TouchableOpacity>
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              minimumZoomScale={1}
              maximumZoomScale={3}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </View>
      )}

      {/* Airwaybill Photo Modal */}
      {selectedAirwaybillPhoto && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedAirwaybillPhoto(null)}
            activeOpacity={0.9}
          >
            <X size={20} color={COLORS.text.inverse} />
          </TouchableOpacity>
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              minimumZoomScale={1}
              maximumZoomScale={3}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: selectedAirwaybillPhoto }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

export default DetailScreen;