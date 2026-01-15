import { useAuth } from '@/lib/store/auth';
import { useThemeStore } from '@/lib/store/themeStore';
import { gql, useQuery } from '@apollo/client';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, CheckCircle, Copy, Maximize2, Package, Plane, Scan, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// GraphQL query for AWB detail
const GET_AWB_DETAIL = gql`
  query GetAirwaybillXrayWithDetails($id: ID!) {
    airwaybillxray(id: $id) {
      id
      airwaybill_number
      photo_airwaybill
      hawb
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

// Clean design system - using new palette from request
const COLORS = {
  primary: '#0088dd',
  primaryDark: '#0066aa',
  secondary: '#f3f6f9',
  surface: {
    light: '#ffffff',
    dark: '#1f2937',
  },
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    light: '#9ca3af',
  },
  success: {
    bg: '#f0fdf4',
    text: '#16a34a',
    border: '#dcfce7',
  }
};

const SPACING = {
  xs: 4,
  sm: 12,
  md: 20,
  lg: 24,
  xl: 32
};

const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 24, // 1.5rem / 3xl
  full: 9999
};

// Styles for modal mostly, others handled by Tailwind
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Light bg
  },
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
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    resizeMode: 'contain',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

const DetailScreen = () => {
  const params = useLocalSearchParams();
  const { id } = params;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState<{ [key: number]: boolean }>({});
  const [selectedAirwaybillPhoto, setSelectedAirwaybillPhoto] = useState<string | null>(null);
  const [airwaybillPhotoLoading, setAirwaybillPhotoLoading] = useState(false);

  // Validasi id sebelum menjalankan query
  const isValidId = id && typeof id === 'string' && id !== 'new';

  // GraphQL query for AWB detail
 
  const {
    data,
    loading: graphQLLoading,
    error,
  } = useQuery(GET_AWB_DETAIL, {
    variables: { id },
    skip: !session || !isValidId,
    fetchPolicy: 'network-only',
  });

  const awbData = data?.airwaybillxray;
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '/storage');
 console.log('data:', data);
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
  console.log('ID Parameter:', id);
  console.log('Session:', session);
  console.log('GraphQL Loading:', graphQLLoading);
  console.log('GraphQL Error:', error);

  const handleImageLoad = () => {
    if (awbData?.photo_airwaybill) {
      const imageUrl = `${baseUrl}/${awbData?.photo_airwaybill}`;
      Image.getSize(imageUrl, (width, height) => {
        const screenWidth = Dimensions.get('window').width - 40; // Account for padding
        const aspectRatio = height / width;
        setImageDimensions({
          width: screenWidth,
          height: screenWidth * aspectRatio
        });
      }, (error) => {
        console.error('Error getting image size:', error);
      });
    }
  };
  console.log('Image Dimensions:', awbData);

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

  const imageUrl = awbData?.photo_airwaybill ?
    (awbData?.photo_airwaybill.startsWith('http') ?
      awbData?.photo_airwaybill :
      `${baseUrl}/${awbData?.photo_airwaybill}`) :
    '';

  // Loading state
  if (graphQLLoading || (!data && isValidId)) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#FAFAFA' }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 24, 
            backgroundColor: isDark ? '#1F2937' : '#f3f6f9', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 16
          }}>
            <Package size={24} color={COLORS.primary} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#F9FAFB' : '#1f2937', marginBottom: 4 }}>Loading Details</Text>
          <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6b7280' }}>Please wait a moment...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#FAFAFA' }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 24, 
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 16
          }}>
            <X size={24} color="#ef4444" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#F9FAFB' : '#1f2937', marginBottom: 4 }}>Unable to Load</Text>
          <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6b7280' }}>{error.message}</Text>
        </View>
      </View>
    );
  }

  // Handle case when ID is invalid
  if (!isValidId) {
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
            <Text style={styles.emptyTitle}>Invalid ID</Text>
            <Text style={styles.emptySubtitle}>The requested item ID is not valid</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Handle case when no data is returned despite valid ID
  if (!awbData && !graphQLLoading) {
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
            <Text style={styles.emptyTitle}>No Data Found</Text>
            <Text style={styles.emptySubtitle}>The requested item could not be found</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Handle case when no session is available
  if (!session) {
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
            <Text style={styles.emptyTitle}>Authentication Required</Text>
            <Text style={styles.emptySubtitle}>Please log in to view this content</Text>
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

  // Render main content
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#FAFAFA' }]}>
      <View style={{
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        paddingTop: insets.top,
        borderBottomWidth: 0.5,
        borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        zIndex: 10,
      }}>
        <View style={{
          height: 56,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          gap: 16
        }}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ 
              width: 40, 
              height: 40, 
              alignItems: 'center', 
              justifyContent: 'center', 
              marginLeft: -8 
            }}
          >
            <ArrowLeft size={24} color={isDark ? '#60A5FA' : '#0284C7'} />
          </TouchableOpacity>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: isDark ? '#F9FAFB' : '#1F2937' 
          }}>
            AWB Details
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Section */}
        <View style={{ gap: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Current Status
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: isDark ? 'rgba(22, 163, 74, 0.2)' : '#f0fdf4', 
              paddingHorizontal: 12, 
              paddingVertical: 4, 
              borderRadius: 9999,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(22, 163, 74, 0.4)' : '#dcfce7'
            }}>
              <CheckCircle size={14} color="#16a34a" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#16a34a' }}>Completed</Text>
            </View>
          </View>

          {/* Air Cargo Card */}
          <View style={{ 
            backgroundColor: isDark ? '#1F2937' : '#ffffff', 
            borderRadius: 24, 
            padding: 24, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 10 }, 
            shadowOpacity: 0.05, 
            shadowRadius: 20, 
            elevation: 4,
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#f9fafb',
            overflow: 'hidden',
            position: 'relative'
          }}>
             {/* Background Decoration */}
             <View style={{
               position: 'absolute',
               top: -48,
               right: -48,
               width: 160,
               height: 160,
               borderRadius: 80,
               backgroundColor: isDark ? '#374151' : '#eff6ff',
               opacity: 0.5
             }} />
             
             <View style={{ position: 'relative', zIndex: 10 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                 <View style={{ 
                   width: 32, 
                   height: 32, 
                   alignItems: 'center', 
                   justifyContent: 'center', 
                   backgroundColor: isDark ? 'rgba(0, 136, 221, 0.2)' : '#eff6ff', 
                   borderRadius: 16 
                 }}>
                   <Plane size={18} color="#0088dd" />
                 </View>
                 <Text style={{ fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#0088dd' }}>
                   Air Cargo
                 </Text>
               </View>

               <View style={{ gap: 24 }}>
                 <View>
                   <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af', marginBottom: 6 }}>
                     Master AWB (MAWB)
                   </Text>
                   <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                     <Text style={{ fontSize: 24, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', letterSpacing: -0.5 }}>
                       {awbData?.airwaybill_number || '---'}
                     </Text>
                     <TouchableOpacity 
                       onPress={() => {
                        // Implement copy functionality if needed
                       }}
                       style={{ padding: 4 }}
                     >
                       <Copy size={18} color="#d1d5db" />
                     </TouchableOpacity>
                   </View>
                 </View>

                 <View style={{ height: 1, backgroundColor: isDark ? '#374151' : '#f3f4f6', width: '100%' }} />

                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                   <View>
                     <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af', marginBottom: 4 }}>
                       House AWB (HAWB)
                     </Text>
                     <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? '#D1D5DB' : '#1f2937' }}>
                       {awbData?.hawb || '---'}
                     </Text>
                   </View>
                   <View style={{ alignItems: 'flex-end' }}>
                     <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, color: '#9ca3af', marginBottom: 4 }}>
                       Created
                     </Text>
                     <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#9CA3AF' : '#4b5563' }}>
                       {awbData?.created_at ? new Date(awbData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}, {awbData?.created_at ? new Date(awbData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                     </Text>
                   </View>
                 </View>
               </View>
             </View>
          </View>
        </View>

        {/* Photos Section */}
        <View style={{ gap: 16, marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>Photos</Text>
            <View style={{ backgroundColor: isDark ? '#374151' : '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {awbData?.photo_airwaybill ? '1' : '0'} of 1
              </Text>
            </View>
          </View>

          {awbData?.photo_airwaybill ? (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => setSelectedAirwaybillPhoto(imageUrl)}
              style={{ 
                width: '100%', 
                aspectRatio: 1.6, 
                borderRadius: 24, 
                overflow: 'hidden', 
                backgroundColor: '#e5e7eb',
                position: 'relative',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
                borderWidth: 1,
                borderColor: '#f3f4f6'
              }}
            >
              <Image 
                source={{ uri: imageUrl }} 
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />
              {/* Gradient Overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '40%' }}
              />
              
              {/* Expand Button */}
              <View style={{ position: 'absolute', top: 16, right: 16 }}>
                 <View style={{ 
                   width: 32, 
                   height: 32, 
                   borderRadius: 16, 
                   backgroundColor: 'rgba(255,255,255,0.2)', 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   backdropFilter: 'blur(8px)' // Note: backdropFilter not supported in pure RN, but transparency works
                 }}>
                   <Maximize2 size={16} color="#ffffff" />
                 </View>
              </View>

              {/* Bottom Info */}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
                <View style={{ 
                  alignSelf: 'flex-start',
                  paddingHorizontal: 10, 
                  paddingVertical: 4, 
                  backgroundColor: 'rgba(255,255,255,0.15)', 
                  borderRadius: 8, 
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)'
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Front View
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                   <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' }}>
                     <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>D</Text>
                   </View>
                   <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>
                     Uploaded by Driver
                   </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ 
               width: '100%', 
               aspectRatio: 1.6, 
               borderRadius: 24, 
               backgroundColor: isDark ? '#1F2937' : '#f9fafb',
               borderWidth: 1,
               borderColor: isDark ? '#374151' : '#f3f4f6',
               alignItems: 'center',
               justifyContent: 'center'
            }}>
              <Camera size={32} color="#d1d5db" />
              <Text style={{ marginTop: 8, color: '#9ca3af', fontSize: 12 }}>No Cover Photo</Text>
            </View>
          )}
        </View>

        {/* X-Ray Scan Section */}
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>X-Ray Scan</Text>
          </View>

          {xrayPhotos.length === 0 ? (
            <View style={{ 
              padding: 40, 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(249, 250, 251, 0.5)', 
              borderRadius: 24, 
              borderWidth: 1, 
              borderColor: isDark ? '#4B5563' : '#e5e7eb', 
              borderStyle: 'dashed' 
            }}>
              <View style={{ 
                width: 56, 
                height: 56, 
                borderRadius: 28, 
                backgroundColor: isDark ? '#1F2937' : '#ffffff', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDark ? '#374151' : '#f3f4f6',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 2
              }}>
                <Scan size={28} color="#d1d5db" strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 4 }}>No Scans Yet</Text>
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', maxWidth: 200, lineHeight: 18, marginBottom: 24 }}>
                Awaiting inspection team upload.
              </Text>
              
              {/* <TouchableOpacity style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: 6, 
                backgroundColor: '#ffffff', 
                paddingHorizontal: 16, 
                paddingVertical: 10, 
                borderRadius: 9999, 
                borderWidth: 1, 
                borderColor: '#e5e7eb',
                shadowColor: '#000', 
                shadowOffset: { width: 0, height: 2 }, 
                shadowOpacity: 0.05, 
                shadowRadius: 15,
                elevation: 1
              }}>
                <Plus size={16} color="#0088dd" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#0088dd' }}>Add Scan</Text>
              </TouchableOpacity> */}
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {xrayPhotos.map((photo: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedPhoto(photo)}
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#f3f4f6',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2
                  }}
                >
                  <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                  {/* Overlay count */}
                  <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>#{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {/* Add More Button */}
              {/* <TouchableOpacity style={{
                  width: 140,
                  height: 140,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f9fafb',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderStyle: 'dashed'
              }}>
                 <Plus size={24} color="#9ca3af" />
                 <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '500', color: '#6b7280' }}>Add Scan</Text>
              </TouchableOpacity> */}
            </ScrollView>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      {selectedPhoto && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedPhoto(null)}
            activeOpacity={0.9}
          >
             <X size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.modalContent}>
            <Image
                source={{ uri: selectedPhoto }}
                style={styles.modalImage}
                resizeMode="contain"
             />
          </View>
        </View>
      )}

      {selectedAirwaybillPhoto && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setSelectedAirwaybillPhoto(null)}
            activeOpacity={0.9}
          >
             <X size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.modalContent}>
            <Image
                source={{ uri: selectedAirwaybillPhoto }}
                style={styles.modalImage}
                resizeMode="contain"
             />
          </View>
        </View>
      )}
    </View>
  );

};

export default DetailScreen;