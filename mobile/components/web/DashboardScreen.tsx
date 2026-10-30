import { DashboardSidebar } from '@/components/web/DashboardSidebar';
import { DashboardHeader } from '@/components/web/DashboardHeader';
import { StatsCard } from '@/components/web/StatsCard';
import { AwbTable, type AwbRow } from '@/components/web/AwbTable';
import { useBreakpoint } from '@/components/web/useBreakpoint';
import { ScanCapture } from '@/components/web/ScanCapture';
import { subscribeAwbSnapshot } from '@/components/web/awbEvents';
import { logoutAPI } from '@/lib/api/authAPI';
import { useAuth } from '@/lib/store/auth';
import { useGroupModeStore } from '@/lib/store/groupModeStore';
import { useThemeStore } from '@/lib/store/themeStore';
import { gql, useQuery } from '@apollo/client';
import { PackageIcon, TagIcon } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit/v2';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

const GET_DASHBOARD_AWBS = gql`
  query GetDashboardAwbs($first: Int, $page: Int, $search: String, $noSearch: Boolean!, $ungrouped: Boolean!, $filters: SearchFilterInput) {
    airwaybillxrays(first: $first, page: $page, ungrouped: $ungrouped, orderBy: { column: CREATED_AT, order: DESC }) {
      paginatorInfo { total currentPage lastPage hasMorePages }
      data {
        id
        hostawb { airlinesCode flightNo origin consigneeCountry }
        airwaybill_number
        hawb
        kurir
        penerima_nama
        penerima_kota
        berat
        jumlah_koli
        cod
        status
        created_at
        xray_photos_count
        colly_label
        colly_total
      }
    }
    searchAirwaybillxrays(search: $search, first: $first, page: $page, ungrouped: $ungrouped, filters: $filters) @skip(if: $noSearch) {
      paginatorInfo { total currentPage lastPage hasMorePages }
      data {
        id
        hostawb { airlinesCode flightNo origin consigneeCountry }
        airwaybill_number
        hawb
        kurir
        penerima_nama
        penerima_kota
        berat
        jumlah_koli
        cod
        status
        created_at
        xray_photos_count
        colly_label
        colly_total
      }
    }
    analytics: airwaybillxrays(first: 500, page: 1, orderBy: { column: CREATED_AT, order: DESC }) {
      data { airwaybill_number hawb status xray_photos_count created_at colly_label colly_total }
    }
  }
`;

const PAGE_SIZE = 20;

const TONES = {
  blue: { fg: '#0369A1' },
  green: { fg: '#15803D' },
  amber: { fg: '#B45309' },
};

export function DashboardScreen({ section }: { section: 'dashboard' | 'awb' | 'scan' }) {
  const { session, isLoading } = useAuth();
  const { theme } = useThemeStore();
  const { groupMode, setGroupMode } = useGroupModeStore();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ airlines: '', mawb: '', hawb: '', origin: '', dateFrom: '', dateTo: '' });
  const [appliedFilters, setAppliedFilters] = useState<{ airlines?: string; mawb?: string; hawb?: string; origin?: string; dateFrom?: string; dateTo?: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | number | null>(null);
  const [chartW, setChartW] = useState(0);
  const [sseSnapshot, setSseSnapshot] = useState<{ data: AwbRow[]; paginatorInfo?: { total?: number } } | null>(null);
  const trimmed = search.trim();
  const filtersActive = !!(trimmed || appliedFilters);
  const { isSmall } = useBreakpoint();
  const { width: winWidth } = useWindowDimensions();

  const { data, loading, refetch } = useQuery(GET_DASHBOARD_AWBS, {
    variables: { first: PAGE_SIZE, page, search: trimmed, noSearch: !filtersActive, ungrouped: !groupMode, filters: appliedFilters },
    skip: !session,
    fetchPolicy: 'no-cache',
  });

  useEffect(() => {
    if (!isLoading && !session) router.replace('/(auth)/login');
  }, [isLoading, session]);

  // Reset ke halaman 1 saat pencarian berubah
  useEffect(() => { setPage(1); }, [trimmed, appliedFilters]);

  // SSE: refresh realtime saat ada perubahan data AWB di backend
  // (satu koneksi bersama via subscribeAwbSnapshot, lihat awbEvents.ts)
  useEffect(() => {
    if (typeof window === 'undefined' || !session) return;
    return subscribeAwbSnapshot((snapshot) => {
      setSseSnapshot(snapshot as { data: AwbRow[]; paginatorInfo?: { total?: number } } | null);
      // Segarkan halaman aktif agar tabel tetap sinkron (SSE snapshot hanya halaman 1)
      void refetch({ first: PAGE_SIZE, page, search: trimmed, noSearch: !filtersActive, ungrouped: !groupMode, filters: appliedFilters });
    });
  }, [session, refetch, page, trimmed]);

  const paginator = filtersActive ? data?.searchAirwaybillxrays?.paginatorInfo : data?.airwaybillxrays?.paginatorInfo;
  const rows: AwbRow[] = useMemo(() => {
    const raw = filtersActive ? (data?.searchAirwaybillxrays?.data ?? []) : (data?.airwaybillxrays?.data ?? []);
    return raw.map((row: AwbRow & { hostawb?: { airlinesCode?: string | null; flightNo?: string | null; origin?: string | null; consigneeCountry?: string | null } | null }) => ({
      ...row,
      airline: [row.hostawb?.airlinesCode, row.hostawb?.flightNo].filter(Boolean).join(' ') || null,
      origin: row.hostawb?.origin ?? null,
      consigneeCountry: row.hostawb?.consigneeCountry ?? null,
    }));
  }, [data, filtersActive]);

  const total = paginator?.total ?? sseSnapshot?.paginatorInfo?.total ?? rows.length;
  const currentPage = paginator?.currentPage ?? page;
  const lastPage = paginator?.lastPage ?? 1;
  const totalHawb = new Set((data?.analytics?.data ?? []).map((row: { hawb?: string | null }) => row.hawb).filter(Boolean)).size;
  // Statistik per grup (mawb+hawb), konsisten dgn AWB list:
  // WAITING = 0 foto; INCOMPLETE = sebagian foto (< quantity); COMPLETE = semua done & jumlah foto >= quantity
  const groups = useMemo(() => {
    const map = new Map<string, { mawb: string; hawb: string; done: boolean; photos: number; expected: number; createdDay: string }>();
    for (const row of data?.analytics?.data ?? []) {
      const mawb = row.airwaybill_number ?? '';
      const hawb = row.hawb ?? '';
      const key = `${mawb}|${hawb}`;
      const m = row.colly_label?.match(/^colly-(\d+)-of-(\d+)$/);
      const expected = row.colly_total ?? (m ? Number(m[2]) : 1);
      const day = String(row.created_at).slice(0, 10);
      const g = map.get(key) ?? { mawb, hawb, done: true, photos: 0, expected, createdDay: day };
      if (row.status !== 'done') g.done = false;
      g.photos += row.xray_photos_count ?? 0;
      map.set(key, g);
    }
    return map;
  }, [data?.analytics?.data]);
  const totalDone = [...groups.values()].filter((g) => g.done && g.photos > 0 && g.photos / 2 >= g.expected).length;
  const totalIncomplete = [...groups.values()].filter((g) => g.photos > 0 && g.photos / 2 < g.expected && !(g.done && g.photos / 2 >= g.expected)).length;
  const totalWaiting = [...groups.values()].filter((g) => g.photos === 0).length;
  const daily = useMemo(() => {
    const map = new Map<string, { photos: number; done: number; incomplete: number }>();
    for (const g of groups.values()) {
      const item = map.get(g.createdDay) ?? { photos: 0, done: 0, incomplete: 0 };
      item.photos += g.photos;
      const complete = g.done && g.photos > 0 && g.photos / 2 >= g.expected;
      if (complete) item.done += 1; else if (g.photos > 0) item.incomplete += 1;
      map.set(g.createdDay, item);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([date, v]) => ({ date, photos: v.photos, done: v.done, incomplete: v.incomplete }));
  }, [groups]);
  const chartMax = Math.max(1, ...daily.flatMap((item) => [item.photos, item.done, item.incomplete]));

  // Chart responsive: ukur lebar asli kartu via onLayout (akurat di semua breakpoint web/mobile)
  const chartWidth = chartW > 0 ? chartW : Math.max(280, Math.min(winWidth - (isSmall ? 48 : 120), 620));

  const handleLogout = async () => {
    await logoutAPI();
    router.replace('/(auth)/login');
  };

  if (isLoading || (!session && !loading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1220' : '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  const tableCard = loading && rows.length === 0 ? (
    <View style={{ padding: 48, alignItems: 'center' }}><ActivityIndicator color="#0284C7" /></View>
  ) : (
    <AwbTable
      rows={rows}
      page={currentPage}
      lastPage={lastPage}
      total={total}
      groupMode={groupMode}
      onChangePage={setPage}
      onOpen={(id) => router.push(`/dashboard/detail/${id}`)}
    />
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: isDark ? '#0B1220' : '#F8FAFC' }}>
      <DashboardSidebar
        active={section}
        onNavigate={(key) => router.push(key === 'dashboard' ? '/dashboard' : (`/dashboard/${key}` as never))}
        onLogout={handleLogout}
      />

      <View style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <DashboardHeader
          title={section === 'awb' ? 'AWB List' : section === 'scan' ? 'X-ray Capture' : 'Dashboard'}
          subtitle={section === 'scan' ? 'Live top and side capture' : `${total} AWB records stored`}
          search={section === 'awb' ? search : undefined}
          onSearch={section === 'awb' ? setSearch : undefined}
        />

        <ScrollView contentContainerStyle={{ padding: isSmall ? 16 : 28, gap: 24, width: '100%' }}>
          {section === 'dashboard' ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ flexGrow: 1, flexBasis: isSmall ? '100%' : 220, minWidth: 0 }}>
                  <StatsCard icon={<PackageIcon size={22} color={TONES.blue.fg} />} label="MAWB" value={total} tone="blue" />
                </View>
                <View style={{ flexGrow: 1, flexBasis: isSmall ? '100%' : 220, minWidth: 0 }}>
                  <StatsCard icon={<TagIcon size={22} color={TONES.green.fg} />} label="HAWB" value={totalHawb} tone="green" />
                </View>
                <View style={{ flexGrow: 1, flexBasis: isSmall ? '100%' : 180, minWidth: 0, backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#F3F4F6', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}><TagIcon size={22} color="#B45309" /></View>
                  <View><Text style={{ fontSize: 22, fontWeight: '800', color: '#D97706' }}>{totalWaiting}</Text><Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Waiting</Text></View>
                </View>
                <View style={{ flexGrow: 1, flexBasis: isSmall ? '100%' : 180, minWidth: 0, backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#F3F4F6', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' }}><TagIcon size={22} color="#EA580C" /></View>
                  <View><Text style={{ fontSize: 22, fontWeight: '800', color: '#EA580C' }}>{totalIncomplete}</Text><Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Incomplete</Text></View>
                </View>
                <View style={{ flexGrow: 1, flexBasis: isSmall ? '100%' : 180, minWidth: 0, backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#F3F4F6', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}><TagIcon size={22} color="#16A34A" /></View>
                  <View><Text style={{ fontSize: 22, fontWeight: '800', color: '#16A34A' }}>{totalDone}</Text><Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Complete</Text></View>
                </View>
              </View>
              <View
                onLayout={(e) => { const w = e.nativeEvent.layout.width - (isSmall ? 32 : 48); if (w > 0 && Math.abs(w - chartW) > 1) setChartW(w); }}
                style={{ backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', padding: isSmall ? 16 : 24, gap: 14 }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>Daily X-ray Photos, Complete & Incomplete</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Last 7 active days</Text>
                <LineChart
                  data={daily.map((item) => ({ date: item.date.slice(5), photos: item.photos, done: item.done, incomplete: item.incomplete }))}
                  xKey="date"
                  yKeys={["photos", "done", "incomplete"]}
                  interaction={{
                    mode: "scrub",
                    selectionPersistence: "whileActive",
                    onSelect: (event) => setSelectedDay(event.xLabel),
                  }}
                  tooltip={{ shared: true, anchor: "pointer", placement: "above", offset: 18, positionAnimationDuration: 320 }}
                  crosshair
                  series={[{ yKey: "photos", label: "Photos" }, { yKey: "done", label: "Complete" }, { yKey: "incomplete", label: "Incomplete" }]}
                  width={chartWidth}
                  height={260}
                  legend={{ position: "bottom", wrap: true }}
                />
              </View>
              <View style={{ backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', padding: isSmall ? 20 : 28, gap: 12, maxWidth: isSmall ? undefined : 640 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>Summary</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 20 }}>
                  {total} MAWB records with {totalHawb} HAWB: {totalWaiting} waiting, {totalIncomplete} incomplete, and {totalDone} complete.
                  Open AWB List to view complete records, or scan a new label from the mobile app.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/dashboard/awb')}
                  style={{ alignSelf: 'flex-start', backgroundColor: '#0284C7', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 20, marginTop: 4 }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 }}>View AWB List →</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {section === 'awb' ? (
            <>
              <View style={{ backgroundColor: isDark ? '#111827' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', padding: isSmall ? 14 : 18, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <View style={{ gap: 3 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Display Mode</Text>
                  </View>
                  <View style={{ flexDirection: 'row', borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB', backgroundColor: isDark ? '#0B1220' : '#F1F5F9', padding: 3, gap: 2 }}>
                    {[
                      { label: 'Grouping', active: groupMode, on: true },
                      { label: 'Non-Grouping', active: !groupMode, on: false },
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        onPress={() => setGroupMode(opt.on)}
                        style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 9, backgroundColor: opt.active ? '#0284C7' : 'transparent' }}
                      >
                        <Text style={{ fontSize: 12.5, fontWeight: '700', color: opt.active ? '#FFFFFF' : (isDark ? '#CBD5E1' : '#475569') }}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#F3F4F6', paddingTop: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {([
                      { key: 'airlines', label: 'Airlines', placeholder: 'e.g. GA' },
                      { key: 'mawb', label: 'MAWB', placeholder: 'e.g. 023-00110902' },
                      { key: 'hawb', label: 'HAWB', placeholder: 'e.g. TC826040075' },
                      { key: 'origin', label: 'Origin', placeholder: 'e.g. CGK' },
                    ] as const).map((f) => (
                      <View key={f.key} style={{ gap: 5, flexGrow: 1, flexBasis: isSmall ? '100%' : 170, minWidth: isSmall ? '100%' : 155 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</Text>
                        <input
                          value={filters[f.key]}
                          onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { const obj = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')); setAppliedFilters(Object.keys(obj).length ? obj : null); } }}
                          placeholder={f.placeholder}
                          style={{ width: '100%', padding: '9px 11px', fontSize: 12.5, borderRadius: 9, border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`, backgroundColor: isDark ? '#0B1220' : '#F8FAFC', color: isDark ? '#E5E7EB' : '#111827', boxSizing: 'border-box' }}
                        />
                      </View>
                    ))}
                    <View style={{ gap: 5, flexGrow: 2, flexBasis: isSmall ? '100%' : 300, minWidth: isSmall ? '100%' : 260 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date Range</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))} style={{ flex: 1, minWidth: 0, padding: '9px 10px', fontSize: 12, borderRadius: 9, border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`, backgroundColor: isDark ? '#0B1220' : '#F8FAFC', color: isDark ? '#E5E7EB' : '#111827', boxSizing: 'border-box' }} />
                        <Text style={{ color: '#9CA3AF', fontSize: 13 }}>–</Text>
                        <input type="date" value={filters.dateTo} onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))} style={{ flex: 1, minWidth: 0, padding: '9px 10px', fontSize: 12, borderRadius: 9, border: `1px solid ${isDark ? '#1F2937' : '#E5E7EB'}`, backgroundColor: isDark ? '#0B1220' : '#F8FAFC', color: isDark ? '#E5E7EB' : '#111827', boxSizing: 'border-box' }} />
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => { const obj = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')); setAppliedFilters(Object.keys(obj).length ? obj : null); }}
                      style={{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#0284C7' }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>Apply Filters</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setFilters({ airlines: '', mawb: '', hawb: '', origin: '', dateFrom: '', dateTo: '' }); setAppliedFilters(null); }}
                      style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#1F2937' : '#E5E7EB' }}
                    >
                      <Text style={{ color: isDark ? '#CBD5E1' : '#475569', fontWeight: '700', fontSize: 12.5 }}>Reset</Text>
                    </TouchableOpacity>
                    {appliedFilters ? <Text style={{ fontSize: 11.5, color: '#9CA3AF' }}>Filters active</Text> : null}
                  </View>
                </View>
              </View>
              {tableCard}
            </>
          ) : null}

          {section === 'scan' ? <ScanCapture /> : null}

          <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
            AWB X-Ray Web Dashboard
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}
