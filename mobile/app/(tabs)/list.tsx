import EmptyState from '@/components/EmptyState';
import StatusBarSafeArea from '@/components/StatusBarSafeArea';
import SwipeList from '@/components/SwipeList';
import { subscribeAwbSnapshot } from '@/lib/api/awbEvents';
import { useAuth } from '@/lib/store/auth';
import { useGroupModeStore } from '@/lib/store/groupModeStore';
import { useThemeStore } from '@/lib/store/themeStore';
import { gql, useQuery } from '@apollo/client';
import {
  Box,
  HStack,
  Input,
  InputField,
  Spinner,
  VStack
} from '@gluestack-ui/themed';
import { useFocusEffect, router } from 'expo-router';
import {
  ArrowUpIcon,
  SlidersHorizontalIcon,
  PackageIcon,
  SearchIcon
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Switch,
  Text,
   TouchableOpacity,
   View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// GraphQL query - dengan pagination dan order by created_at DESC
const GET_AWB_LIST = gql`
  query GetAwbList($first: Int, $page: Int) {
    airwaybillxrays(first: $first, page: $page, ungrouped: true, orderBy: { column: CREATED_AT, order: DESC }) {
      paginatorInfo {
        count
        currentPage
        firstItem
        hasMorePages
        lastItem
        lastPage
        perPage
        total
      }
      data {
        id
        airwaybill_number
        photo_airwaybill
        hawb
        kurir
        status
        created_at
        updated_at
        xray_photos_count
        colly_label
        colly_total
      }
    }
  }
`;

const ListScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hasScrolledDown, setHasScrolledDown] = useState(false);

  // Infinite scroll states
  const [currentPage, setCurrentPage] = useState(1);
  const [allAwbData, setAllAwbData] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);

  const { session, isLoading: authLoading } = useAuth();
  const { theme } = useThemeStore();
  const { groupMode, setGroupMode } = useGroupModeStore();
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  // Calculate dynamic bottom positioning for FAB
  const bottomNavHeight = 60;
  const fabMargin = 20;
  const fabBottomPosition = bottomNavHeight + Math.max(insets.bottom, 16) + fabMargin;

  // GraphQL fetch dengan infinite scroll support
  const {
    data,
    loading: graphQLLoading,
    error,
    refetch,
    fetchMore,
  } = useQuery(GET_AWB_LIST, {
    skip: !session,
    variables: {
      first: 20, // Load 20 items per page
      page: 1,
    },
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
    onError: (error) => {
      console.log('GraphQL Error:', JSON.stringify(error, null, 2));
    },
    onCompleted: (data) => {
      // Initialize data on first load
      if (currentPage === 1) {
        setAllAwbData(data?.airwaybillxrays?.data || []);
        setHasMorePages(data?.airwaybillxrays?.paginatorInfo?.hasMorePages || false);
      }
    }
  });

  const swipeListRef = useRef<any>(null);

  // SSE realtime: update list saat backend ada perubahan (insert batch/scan/delete)
  useEffect(() => {
    if (!session) return;
    return subscribeAwbSnapshot((snapshot) => {
      const rows = (snapshot.data ?? []) as any[];
      if (rows.length === 0) return;
      setAllAwbData((prev) => {
        // gabung: baris snapshot baru di depan, pertahankan lama yang tidak ada di snapshot
        const seen = new Set(rows.map((r) => String(r.id)));
        const old = prev.filter((r) => !seen.has(String(r.id)));
        return [...rows, ...old];
      });
    });
  }, [session]);

  // Anti refresh tak sengaja: refresh diabaikan bila baru terjadi <8 detik
  const lastRefreshAtRef = useRef(0);

  // Refetch otomatis saat kembali ke layar ini (misal setelah simpan dari OCR modal)
  useFocusEffect(
    React.useCallback(() => {
      if (session) {
        lastRefreshAtRef.current = Date.now();
        setCurrentPage(1);
        refetch({ first: 20, page: 1 }).then((refreshData) => {
          setAllAwbData(refreshData.data?.airwaybillxrays?.data || []);
          setHasMorePages(refreshData.data?.airwaybillxrays?.paginatorInfo?.hasMorePages || false);
        }).catch(() => {});
      }
    }, [session, refetch])
  );

  const filteredAwbList = useMemo(() => {
    let list = allAwbData;
    if (searchQuery.trim() !== '') {
      const lower = searchQuery.toLowerCase();
      list = allAwbData.filter((item: any) =>
        item.airwaybill_number.toLowerCase().includes(lower) ||
        (item.kurir && item.kurir.toLowerCase().includes(lower)) ||
        (item.hawb && item.hawb.toLowerCase().includes(lower))
      );
    }
    // Group mode: 1 baris per grup (mawb+hawb) — wakil = record terbaru grup,
    // plus info grup: jumlah record, colly scanned (foto/2), status complete/incomplete/waiting
    if (groupMode) {
      const groups = new Map<string, any[]>();
      for (const item of list) {
        const key = `${item.airwaybill_number ?? ''}|${item.hawb ?? ''}`;
        const arr = groups.get(key) ?? [];
        arr.push(item);
        groups.set(key, arr);
      }
      list = [...groups.values()].map((members) => {
        const latest = members.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b));
        // colly ter-scan = total foto / 2 (pasangan top+side), konsisten dgn web dashboard
        const scanned = Math.floor(members.reduce((sum, m) => sum + (m.xray_photos_count ?? 0), 0) / 2);
        const expected = latest.colly_total ?? members.length;
        const allDone = members.every((m) => m.status === 'done');
        const status = allDone && scanned >= expected && expected > 0 ? 'done' : scanned > 0 ? 'incomplete' : 'waiting';
        return { ...latest, status, colly_label: `colly-${scanned}-of-${expected}`, colly_total: expected, groupCount: members.length };
      });
    }
    return list;
  }, [allAwbData, searchQuery, groupMode]);

  const onRefresh = async () => {
    const now = Date.now();
    if (now - lastRefreshAtRef.current < 8000) {
      setRefreshing(false);
      return;
    }
    lastRefreshAtRef.current = now;
    setRefreshing(true);
    try {
      setCurrentPage(1);
      setAllAwbData([]);
      setHasMorePages(true);
      const refreshData = await refetch({ first: 20, page: 1 });
      if (refreshData?.data?.airwaybillxrays?.data) {
        setAllAwbData(refreshData.data.airwaybillxrays.data);
      }
    } catch (err) {
      console.error('Refetch error:', err);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('awb-list-refresh', () => {
      void onRefresh();
    });
    return () => subscription.remove();
  }, [onRefresh]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query === '') {
      setRefreshing(true);
      setCurrentPage(1);
      setAllAwbData([]);
      setHasMorePages(true);
      try {
        const refreshData = await refetch({ first: 20, page: 1 });
        if (refreshData?.data?.airwaybillxrays?.data) {
          setAllAwbData(refreshData.data.airwaybillxrays.data);
          setHasMorePages(refreshData.data.airwaybillxrays.paginatorInfo?.hasMorePages || false);
        }
      } catch (err) {
        console.error('Refetch error on clear search:', err);
      } finally {
        setRefreshing(false);
      }
    }
  };

  const handleItemPress = (id: string) => {
    router.push(`/detail/${id}`);
  };

  const scrollToTop = () => {
    if (swipeListRef.current) {
      swipeListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const loadMoreData = async () => {
    if (loadingMore || !hasMorePages) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      await fetchMore({
        variables: { first: 20, page: nextPage },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const previousData = previousResult?.airwaybillxrays?.data || [];
          const newData = fetchMoreResult?.airwaybillxrays?.data || [];
          const hasMore = fetchMoreResult?.airwaybillxrays?.paginatorInfo?.hasMorePages || false;
          setCurrentPage(nextPage);
          setAllAwbData([...previousData, ...newData]);
          setHasMorePages(hasMore);
          return {
            airwaybillxrays: {
              ...fetchMoreResult.airwaybillxrays,
              data: [...previousData, ...newData],
            },
          };
        },
      });
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = e.nativeEvent.contentOffset.y;
    setShowScrollTop(scrollY > 200);
    if (scrollY > 100) setHasScrolledDown(true);
    if (scrollY === 0 && hasScrolledDown && !refreshing && !graphQLLoading) {
      setHasScrolledDown(false);
      onRefresh();
    }
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 1000;
    if (isCloseToBottom && hasMorePages && !loadingMore && !graphQLLoading) {
      loadMoreData();
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="large" color={isDark ? '#60A5FA' : '#0284C7'} />
        {/* <PackageIcon size={40} color="#3b82f6" /> 
        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading...</Text> */}
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <PackageIcon size={40} color="#ef4444" />
          <Text style={{ marginTop: 12, color: '#64748b', fontSize: 16 }}>Error loading Shipments</Text>
          <Text style={{ marginTop: 8, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>{error.message}</Text>
          <TouchableOpacity onPress={onRefresh} style={{ marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      
      <StatusBarSafeArea style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F5F7FA' }}>
          {/* Custom Header Section */}
          {/* Custom Header Section */}
          <Box style={{ zIndex: 10, backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
               <VStack mb="$4" space="md" p="$5">
                 {/* Row: title + filter */}
                 <Box
                   flexDirection="row"
                   alignItems="flex-start"
                   justifyContent="space-between"
                   mb="$2"
                 >
                   {/* Left: Title & Subtitle */}
                   <VStack>
                     <Text style={{ fontWeight: '800', fontSize: 28, color: isDark ? '#F9FAFB' : '#111827', letterSpacing: -0.5 }}>
                        AWB
                     </Text>
                   </VStack>
 
                   {/* Right: filter button */}
                   <TouchableOpacity
                       onPress={() => setShowFilterSheet(true)}
                       style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: isDark ? '#374151' : '#F3F4F6',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: isDark ? '#4B5563' : '#E5E7EB'
                       }}
                   >
                       <SlidersHorizontalIcon size={20} color={isDark ? '#60A5FA' : '#0284C7'} />
                   </TouchableOpacity>
                 </Box>
 
                 {/* Search Bar */}
                 <Box style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#374151' : '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: isDark ? '#4B5563' : '#F3F4F6' }}>
                    <SearchIcon size={20} color={isDark ? '#60A5FA' : '#0284C7'} />
                    <Input
                       variant="outline"
                       style={{ flex: 1, height: 44, marginLeft: 8, borderWidth: 0 }}
                       borderColor="transparent"
                    >
                      <InputField 
                        placeholder="Search AWB..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        color={isDark ? '#F9FAFB' : '#1F2937'}
                        style={{ fontSize: 15 }}
                      />
                    </Input>
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Text style={{ color: "#6B7280", fontSize: 13, fontWeight: '500' }}>Clear</Text>
                        </TouchableOpacity>
                    )}
                 </Box>
               </VStack>
          </Box>
 
          {/* Content with SwipeList handling its own scrolling */}
          <Box style={{ flex: 1 }} backgroundColor="transparent">
            {/* Stats Row */}
              <HStack
                justifyContent="space-between"
                alignItems="center"
                px="$5"
                pt="$6"
                pb="$2"
              >
                 <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5 }}>ACTIVE LOADS</Text>
                 
                 <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginRight: 4 }}>Newest</Text>
                 </TouchableOpacity>
              </HStack>

            {/* Subtle loading indicator for GraphQL loading */}
            {graphQLLoading && filteredAwbList.length === 0 && (
              <Box alignItems="center" py="$8">
                  <Spinner size="small" color={isDark ? "$blue400" : "$primary600"} />
                  {/* <Text style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Loading Shipments...</Text> */}
              </Box>
            )}
 
            {/* AWB List / Empty State */}
            {filteredAwbList.length > 0 ? (
              <>
                <SwipeList
                  ref={swipeListRef}
                  data={filteredAwbList}
                  onItemClick={handleItemPress}
                    onRefresh={onRefresh}
                    onDeleted={(id) => setAllAwbData((items) => items.filter((item) => String(item.id) !== String(id)))}
                    refreshing={refreshing}
                  onScroll={handleScroll}
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 8,
                    paddingBottom: fabBottomPosition + (loadingMore ? 100 : 40),
                  }}
                />
 
                {loadingMore && (
                  <Box
                    alignItems="center"
                    justifyContent="center"
                    py="$4"
                    style={{
                      position: 'absolute',
                      bottom: fabBottomPosition + 10,
                      left: 0,
                      right: 0,
                    }}
                  >
                    <VStack alignItems="center" space="sm">
                      <Spinner size="small" color={isDark ? "$blue400" : "$primary600"} />
                      {/* <Text style={{ color: "#64748b", fontSize: 14 }}>Loading more...</Text> */}
                    </VStack>
                  </Box>
                )}
 
                {!hasMorePages && filteredAwbList.length > 0 && (
                  <Box alignItems="center" py="$2">
                    <Text style={{ color: "#9ca3af", fontSize: 12 }}>End of results</Text>
                  </Box>
                )}
              </>
            ) : (
                !graphQLLoading && (
                  <Box mt="$8" px="$5">
                    <EmptyState
                      title="No Shipments"
                      subtitle={
                        searchQuery
                          ? 'Try adjusting your search terms'
                          : 'Your assigned shipments will appear here.'
                      }
                      icon={searchQuery ? SearchIcon : PackageIcon}
                    />
                  </Box>
                )
            )}
          </Box>
 
        {/* Filter Action Sheet */}
        <Modal visible={showFilterSheet} transparent animationType="slide" onRequestClose={() => setShowFilterSheet(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={() => setShowFilterSheet(false)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Math.max(insets.bottom, 20) + 10 }}>
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: isDark ? '#4B5563' : '#E5E7EB', alignSelf: 'center', marginBottom: 18 }} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 4 }}>List Options</Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 18 }}>Configure how the AWB list is displayed</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? '#111827' : '#F8FAFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#F9FAFB' : '#1F2937', marginBottom: 2 }}>Group by MAWB & HAWB</Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{groupMode ? 'Grouped — one row per manifest group' : 'Ungrouped — every scan record shown'}</Text>
                </View>
                <Switch value={groupMode} onValueChange={setGroupMode} trackColor={{ false: '#d1d5db', true: '#0284c7' }} thumbColor="#f3f4f6" />
              </View>
              <TouchableOpacity onPress={() => setShowFilterSheet(false)} style={{ marginTop: 16, backgroundColor: '#0284C7', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Done</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Scroll To Top Button */}
        {showScrollTop && (
          <TouchableOpacity
            onPress={scrollToTop}
            style={[
              styles.scrollToTopButton,
              {
                bottom: fabBottomPosition,
              }
            ]}
            activeOpacity={0.8}
          >
            <Box
              w="$12"
              h="$12"
              borderRadius="$full"
              bg="#0284C7"
              alignItems="center"
              justifyContent="center"
            >
              <ArrowUpIcon size={20} color="#fff" />
            </Box>
          </TouchableOpacity>
        )}
        </View>
      </StatusBarSafeArea>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollToTopButton: {
    position: 'absolute',
    right: 20,
    borderRadius: 50,
    zIndex: 999,
  },
  filterButton: {
    borderRadius: 50,
  }
});

export default ListScreen;