import { useAuth } from '@/lib/store/auth';
import { useGroupModeStore } from '@/lib/store/groupModeStore';
import { useThemeStore } from '@/lib/store/themeStore';
import { gql, useQuery } from '@apollo/client';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Copy, Maximize2, Package, Scan, X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
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
      hostawb {
        mawb
        hawb
        airlinesCode
        flightNo
        dateOfFlight
        origin
        quantity
        weight
        volume
        hsCode
        descriptionGoods
        shipperName
        shipperCity
        consigneeName
        consigneeCity
        bc11
        tglBc
        sppb
        tglSppb
        dateEntry
        timeEntry
        bagNumber
      }
      status
      colly_label
      colly_total
      colly_members {
        id
        colly_index
        colly_label
        status
        photo_airwaybill
        created_at
        top_photo
        side_photo
      }
      kurir
      tanggal
      pengirim
      penerima_nama
      penerima_alamat
      penerima_kota
      penerima_kode_pos
      penerima_telepon
      berat
      jumlah_koli
      isi_barang
      nilai_deklarasi
      tipe_pajak
      cod
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
  const { session, user } = useAuth();
  const { theme } = useThemeStore();
  const { groupMode } = useGroupModeStore();
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
  // Grup colly: mode group → tampil info grup (scanned/total + status), non-group → info record tunggal
  const collyMembers: any[] = awbData?.colly_members ?? [];
  const collyTotal = awbData?.colly_total ?? collyMembers.length;
  const collyScanned = Math.floor(collyMembers.reduce((sum, m) => sum + (m.top_photo || m.side_photo ? 1 : 0), 0));
  const allDone = collyMembers.length > 0 && collyMembers.every((m) => m.status === 'done');
  const groupStatus = allDone && collyScanned >= collyTotal && collyTotal > 0 ? 'complete' : collyScanned > 0 ? 'incomplete' : 'waiting';
  const baseUrl = (process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql').replace('/graphql', '');
  const fileUrl = (path: string) => path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
 console.log('data:', data);
  const xrayPhotos = awbData?.airwaybillXrayDetails?.map((detail: any) => detail.xray_photo ? fileUrl(detail.xray_photo) : null).filter(Boolean) || [];

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
      const imageUrl = fileUrl(awbData.photo_airwaybill);
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

  const imageUrl = awbData?.photo_airwaybill ? fileUrl(awbData.photo_airwaybill) : '';

  // Loading state
  if (graphQLLoading && isValidId) {
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
        {/* AWB Card — minimalis */}
        <View style={{ gap: 10, marginBottom: 24 }}>
          <View style={{
            backgroundColor: isDark ? '#1F2937' : '#ffffff',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isDark ? '#1F2937' : '#F3F4F6',
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ flexShrink: 1, fontSize: 20, fontWeight: '800', letterSpacing: 0.3, color: isDark ? '#F9FAFB' : '#111827' }}>
                {awbData?.airwaybill_number || '---'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {groupMode && collyTotal > 0 ? (
                  <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: collyScanned >= collyTotal ? 'rgba(22, 163, 74, 0.12)' : collyScanned > 0 ? 'rgba(2, 132, 199, 0.12)' : 'rgba(107, 114, 128, 0.12)' }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, color: collyScanned >= collyTotal ? '#16A34A' : collyScanned > 0 ? '#0369A1' : '#6B7280' }}>
                      {collyScanned} / {collyTotal}
                    </Text>
                  </View>
                ) : null}
                <View style={{
                  borderRadius: 999,
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  backgroundColor: groupMode
                    ? groupStatus === 'complete' ? 'rgba(22, 163, 74, 0.12)' : groupStatus === 'incomplete' ? 'rgba(234, 88, 12, 0.12)' : 'rgba(245, 158, 11, 0.12)'
                    : awbData?.status === 'done' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, color: groupMode
                    ? groupStatus === 'complete' ? '#16A34A' : groupStatus === 'incomplete' ? '#EA580C' : '#D97706'
                    : awbData?.status === 'done' ? '#16A34A' : '#D97706' }}>
                    {groupMode
                      ? groupStatus === 'complete' ? 'COMPLETE' : groupStatus === 'incomplete' ? 'INCOMPLETE' : 'WAITING'
                      : awbData?.status === 'done' ? 'COMPLETE' : 'WAITING'}
                  </Text>
                </View>
              </View>
            </View>
            {awbData?.hawb ? (
              <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280' }} numberOfLines={1}>
                HAWB: {awbData.hawb}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 10.5, fontWeight: '500', color: isDark ? '#9CA3AF' : '#6B7280' }}>
                {awbData?.created_at ? new Date(awbData.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} · {awbData?.created_at ? new Date(awbData.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (awbData?.airwaybill_number) Clipboard.setStringAsync(awbData.airwaybill_number);
                }}
                style={{ padding: 4 }}
              >
                <Copy size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data Manifest (dari database rdwarehouse) */}
        {awbData?.hostawb ? (
          <View style={{ gap: 12, marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', paddingHorizontal: 4 }}>
              Data Manifest{awbData.hostawb.hawb ? ` · ${awbData.hostawb.hawb}` : ''}
            </Text>
            <View style={{
              backgroundColor: isDark ? '#1F2937' : '#ffffff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: isDark ? '#1F2937' : '#F3F4F6',
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}>
              {([
                ['Maskapai', [awbData.hostawb.airlinesCode, awbData.hostawb.flightNo].filter(Boolean).join(' ') || null],
                ['Tgl Flight', awbData.hostawb.dateOfFlight],
                ['Origin', awbData.hostawb.origin],
                ['Quantity', awbData.hostawb.quantity != null ? String(awbData.hostawb.quantity) : null],
                ['Berat (kg)', awbData.hostawb.weight != null ? String(awbData.hostawb.weight) : null],
                ['Volume', awbData.hostawb.volume != null ? String(awbData.hostawb.volume) : null],
                ['HS Code', awbData.hostawb.hsCode],
                ['Deskripsi Barang', awbData.hostawb.descriptionGoods],
                ['Shipper', [awbData.hostawb.shipperName, awbData.hostawb.shipperCity].filter(Boolean).join(' — ') || null],
                ['Consignee', [awbData.hostawb.consigneeName, awbData.hostawb.consigneeCity].filter(Boolean).join(' — ') || null],
                ['BC 11', awbData.hostawb.bc11],
                ['Tgl BC', awbData.hostawb.tglBc],
                ['SPPB', [awbData.hostawb.sppb, awbData.hostawb.tglSppb].filter(Boolean).join(' / ') || null],
                ['Bag Number', awbData.hostawb.bagNumber],
                ['Tgl Entry', [awbData.hostawb.dateEntry, awbData.hostawb.timeEntry].filter(Boolean).join(' ') || null],
              ] as Array<[string, string | null]>)
                .filter(([, value]) => value)
                .map(([label, value], index, arr) => (
                  <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 10, borderBottomWidth: index < arr.length - 1 ? 1 : 0, borderBottomColor: isDark ? '#111827' : '#F3F4F6' }}>
                    <Text style={{ fontSize: 12.5, color: isDark ? '#9CA3AF' : '#6B7280' }}>{label}</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '600', color: isDark ? '#E5E7EB' : '#111827', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
                  </View>
                ))}
            </View>
          </View>
        ) : null}

        {/* Colly Members — hanya di mode group: kartu per colly dgn foto top/side */}
        {groupMode && collyMembers.length > 0 ? (
          <View style={{ gap: 12, marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', paddingHorizontal: 4 }}>
              Colly ({collyScanned} / {collyTotal} scanned)
            </Text>
            {collyMembers.map((m) => {
              const labelMatch = String(m.colly_label ?? '').match(/^colly-(\d+)-of-(\d+)$/);
              const idx = m.colly_index ?? (labelMatch ? Number(labelMatch[1]) : '?');
              const hasPhoto = !!(m.top_photo || m.side_photo);
              return (
                <View key={m.id} style={{
                  backgroundColor: isDark ? '#1F2937' : '#ffffff',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isDark ? '#1F2937' : '#F3F4F6',
                  padding: 14,
                  gap: 10,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: hasPhoto ? '#0284C7' : isDark ? '#374151' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: hasPhoto ? '#FFFFFF' : '#9CA3AF' }}>{idx}</Text>
                    </View>
                    <Text style={{ flexShrink: 1, fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </Text>
                    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: m.status === 'done' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(245, 158, 11, 0.12)' }}>
                      <Text style={{ fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6, color: m.status === 'done' ? '#16A34A' : '#D97706' }}>
                        {m.status === 'done' ? 'COMPLETE' : 'WAITING'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {m.top_photo ? (
                      <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedPhoto(fileUrl(m.top_photo))} style={{ flex: 1, aspectRatio: 1.5, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                        <Image source={{ uri: fileUrl(m.top_photo) }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                      </TouchableOpacity>
                    ) : null}
                    {m.side_photo ? (
                      <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedPhoto(fileUrl(m.side_photo))} style={{ flex: 1, aspectRatio: 1.5, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                        <Image source={{ uri: fileUrl(m.side_photo) }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                      </TouchableOpacity>
                    ) : null}
                    {!m.top_photo && !m.side_photo ? (
                      <View style={{ flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: isDark ? '#374151' : '#E5E7EB', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>No X-ray photos yet</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Photos Section — foto label selalu tampil di kedua mode */}
        <View style={{ gap: 12, marginBottom: 32 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', paddingHorizontal: 4 }}>Photos</Text>

          {awbData?.photo_airwaybill ? (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => setSelectedAirwaybillPhoto(imageUrl)}
              style={{
                width: '100%',
                aspectRatio: 1.6,
                borderRadius: 14,
                overflow: 'hidden',
                backgroundColor: '#e5e7eb',
                position: 'relative',
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
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                        {(user?.name || 'D').charAt(0).toUpperCase()}
                      </Text>
                   </View>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>
                      Uploaded by {user?.name || 'Driver'}
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

        {/* X-Ray Scan Section — hanya mode single (non-group); mode group pakai kartu Colly */}
        {!groupMode ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', paddingHorizontal: 4 }}>X-Ray Scan</Text>

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
        ) : null}

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