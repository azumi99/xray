import { DashboardHeader } from '@/components/web/DashboardHeader';
import { DashboardSidebar } from '@/components/web/DashboardSidebar';
import { useBreakpoint } from '@/components/web/useBreakpoint';
import { logoutAPI } from '@/lib/api/authAPI';
import { useAuth } from '@/lib/store/auth';
import { useThemeStore } from '@/lib/store/themeStore';
import { gql, useQuery } from '@apollo/client';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const GET_AWB_DETAIL = gql`
  query GetAirwaybillXrayWithDetails($id: ID!) {
    airwaybillxray(id: $id) {
      id
      airwaybill_number
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
      photo_airwaybill
      status
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
      airwaybillXrayDetails {
        id
        xray_photo
        created_at
      }
    }
  }
`;

type Preview = { url: string; caption: string };

export default function DetailWebScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isLoading, user } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const { isSmall } = useBreakpoint();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);

  const { data, loading } = useQuery(GET_AWB_DETAIL, {
    variables: { id },
    skip: !session || !id,
    fetchPolicy: 'no-cache',
  });

  useEffect(() => {
    if (!isLoading && !session) router.replace('/(auth)/login');
  }, [isLoading, session]);

  const baseUrl = (process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql').replace('/graphql', '');
  const fileUrl = (path: string) => path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const awb = data?.airwaybillxray;

  if (loading || isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1220' : '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  if (!awb) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1220' : '#F8FAFC' }}>
        <Text style={{ color: '#9CA3AF' }}>AWB data not found</Text>
      </View>
    );
  }

  const collyMembers: Array<{
    id: string; colly_index: number; colly_label?: string | null; status?: string | null;
    photo_airwaybill?: string | null; top_photo?: string | null; side_photo?: string | null;
  }> = awb.colly_members ?? [];

  const card = { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB' };
  const textMain = isDark ? '#F9FAFB' : '#111827';
  const textSub = isDark ? '#9CA3AF' : '#6B7280';

  // Status grup konsisten dgn AWB list: 0 foto → WAITING, sebagian → INCOMPLETE, lengkap → COMPLETE
  const collyTotal = awb.colly_total ?? collyMembers.length;
  const collyScanned = collyMembers.filter((m) => m.top_photo || m.side_photo).length;
  const statusDone = awb.status === 'done';
  const allDone = collyMembers.length > 0 && collyMembers.every((m) => m.status === 'done');
  const groupStatus: 'complete' | 'incomplete' | 'waiting' = allDone && collyScanned >= collyTotal && collyTotal > 0 ? 'complete' : collyScanned > 0 ? 'incomplete' : 'waiting';
  const statusCfg = groupStatus === 'complete'
    ? { bg: 'rgba(22, 163, 74, 0.12)', fg: '#16A34A', label: 'COMPLETE' }
    : groupStatus === 'incomplete'
      ? { bg: 'rgba(234, 88, 12, 0.12)', fg: '#EA580C', label: 'INCOMPLETE' }
      : { bg: 'rgba(245, 158, 11, 0.12)', fg: '#D97706', label: 'WAITING' };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: isDark ? '#0B1220' : '#F8FAFC' }}>
      <DashboardSidebar
        active="awb"
        onNavigate={(key) => router.push(key === 'dashboard' ? '/dashboard' : (`/dashboard/${key}` as never))}
        onLogout={async () => {
          await logoutAPI();
          router.replace('/(auth)/login');
        }}
      />

      <View style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <DashboardHeader title={awb.airwaybill_number || 'Detail AWB'} subtitle={awb.kurir || undefined} />

        <ScrollView contentContainerStyle={{ padding: isSmall ? 16 : 28, gap: 16, width: '100%' }}>
          {/* Hero: identitas AWB */}
          <View style={{ ...card, padding: isSmall ? 18 : 24, gap: 14 }}>
            <View style={{ flexDirection: isSmall ? 'column' : 'row', justifyContent: 'space-between', alignItems: isSmall ? 'flex-start' : 'center', gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: textSub, letterSpacing: 1 }}>MAWB</Text>
                <Text style={{ fontSize: isSmall ? 20 : 26, fontWeight: '800', color: textMain, letterSpacing: 0.3 }}>
                  {awb.airwaybill_number || '-'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {awb.hawb ? (
                  <View style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284C7' }}>HAWB {awb.hawb}</Text>
                  </View>
                ) : null}
                {collyTotal > 0 ? (
                  <View style={{ backgroundColor: collyScanned >= collyTotal ? 'rgba(22, 163, 74, 0.12)' : collyScanned > 0 ? 'rgba(2, 132, 199, 0.12)' : 'rgba(107, 114, 128, 0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: collyScanned >= collyTotal ? '#16A34A' : collyScanned > 0 ? '#0369A1' : '#6B7280' }}>
                      {collyScanned} / {collyTotal}
                    </Text>
                  </View>
                ) : null}
                <View style={{ backgroundColor: statusCfg.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: statusCfg.fg }}>
                    {statusCfg.label}
                  </Text>
                </View>
              </View>
            </View>
            {/* meta chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([
                ['Colly', `${collyMembers.length || awb.colly_total || 0}${awb.colly_total ? ` / ${awb.colly_total}` : ''}`],
                ['X-ray Photos', String(awb.xray_photos_count ?? 0)],
                ['Created', awb.created_at ? new Date(awb.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-'],
                ['By', user?.name || '-'],
              ] as Array<[string, string]>).map(([label, value]) => (
                <View key={label} style={{ backgroundColor: isDark ? '#0D1526' : '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 1 }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#E5E7EB' : '#374151' }}>{value}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => router.push('/dashboard/awb')}
              style={{ alignSelf: 'flex-start', backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: isDark ? '#93C5FD' : '#0369A1' }}>← Back to List</Text>
            </TouchableOpacity>
          </View>

          {/* Data Manifest (dari database rdwarehouse) */}
          {awb.hostawb ? (
            <View style={{ ...card, padding: isSmall ? 18 : 24, gap: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: textMain }}>
                Data Manifest {awb.hostawb.hawb ? `· ${awb.hostawb.hawb}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {([
                  ['Airline', [awb.hostawb.airlinesCode, awb.hostawb.flightNo].filter(Boolean).join(' ') || null],
                  ['Flight Date', awb.hostawb.dateOfFlight],
                  ['Origin', awb.hostawb.origin],
                  ['Quantity', awb.hostawb.quantity != null ? String(awb.hostawb.quantity) : null],
                  ['Weight (kg)', awb.hostawb.weight != null ? String(awb.hostawb.weight) : null],
                  ['Volume', awb.hostawb.volume != null ? String(awb.hostawb.volume) : null],
                  ['HS Code', awb.hostawb.hsCode],
                  ['Goods Description', awb.hostawb.descriptionGoods],
                  ['Shipper', [awb.hostawb.shipperName, awb.hostawb.shipperCity].filter(Boolean).join(' — ') || null],
                  ['Consignee', [awb.hostawb.consigneeName, awb.hostawb.consigneeCity].filter(Boolean).join(' — ') || null],
                  ['BC 11', awb.hostawb.bc11],
                  ['Customs Date', awb.hostawb.tglBc],
                  ['SPPB', [awb.hostawb.sppb, awb.hostawb.tglSppb].filter(Boolean).join(' / ') || null],
                  ['Bag Number', awb.hostawb.bagNumber],
                  ['Entry Date', [awb.hostawb.dateEntry, awb.hostawb.timeEntry].filter(Boolean).join(' ') || null],
                ] as Array<[string, string | null]>)
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <View key={label} style={{ width: isSmall ? '100%' : '47%', flexGrow: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#1F2937' : '#F3F4F6', paddingBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: textSub }}>{label}</Text>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: isDark ? '#E5E7EB' : '#374151', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          {/* Colly: foto per colly, klik → modal preview */}
          {collyMembers.length > 0 ? (
            <View style={{ ...card, padding: isSmall ? 18 : 24, gap: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: textMain }}>
                Colly ({collyMembers.length}{awb.colly_total ? ` of ${awb.colly_total} manifests` : ''})
              </Text>
              {collyMembers.map((member) => {
                const items = [
                  ...(member.photo_airwaybill ? [{ label: 'Label AWB', url: fileUrl(member.photo_airwaybill) }] : []),
                  ...(member.top_photo ? [{ label: 'X-ray Top', url: fileUrl(member.top_photo) }] : []),
                  ...(member.side_photo ? [{ label: 'X-ray Side', url: fileUrl(member.side_photo) }] : []),
                ];
                return (
                  <View key={member.id} style={{ backgroundColor: isDark ? '#0D1526' : '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', padding: 14, gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#0284C7', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>{member.colly_index}</Text>
                      </View>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: textMain, flexShrink: 1 }}>
                        {member.colly_label || `Colly ${member.colly_index}`}
                      </Text>
                      <View style={{ backgroundColor: member.status === 'done' ? 'rgba(22, 163, 74, 0.12)' : 'rgba(245, 158, 11, 0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5, color: member.status === 'done' ? '#16A34A' : '#D97706' }}>
                          {member.status === 'done' ? 'COMPLETE' : 'WAITING'}
                        </Text>
                      </View>
                    </View>
                    {items.length > 0 ? (
                      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                        {items.map((item, i) => (
                          <TouchableOpacity
                            key={i}
                            onPress={() => setPreview({ url: item.url, caption: `${member.colly_label || `Colly ${member.colly_index}`} · ${item.label}` })}
                            style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB', backgroundColor: isDark ? '#111827' : '#FFFFFF' }}
                          >
                            <Image source={{ uri: item.url }} style={{ width: isSmall ? '100%' : 200, height: isSmall ? 150 : 130, resizeMode: 'cover' }} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 5 }}>
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: isDark ? '#93C5FD' : '#0369A1' }}>{item.label}</Text>
                              <Text style={{ fontSize: 10.5, color: textSub }}>· click to enlarge</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 12, color: textSub }}>No photos for this colly</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Modal preview foto */}
      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(3, 7, 18, 0.88)', alignItems: 'center', justifyContent: 'center', padding: isSmall ? 16 : 40 }}>
          <TouchableOpacity
            onPress={() => setPreview(null)}
            style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
          {preview ? (
            <View style={{ gap: 14, alignItems: 'center', maxWidth: '100%' }}>
              <Image
                source={{ uri: preview.url }}
                style={{ width: isSmall ? '100%' : 880, maxWidth: '100%', height: isSmall ? 320 : 520, resizeMode: 'contain', borderRadius: 12 }}
              />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#E5E7EB', textAlign: 'center' }}>
                {preview.caption}
              </Text>
              <TouchableOpacity
                onPress={() => typeof window !== 'undefined' && preview ? window.open(preview.url, '_blank') : undefined}
                style={{ backgroundColor: 'rgba(2, 132, 199, 0.9)', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>Open full size ↗</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
