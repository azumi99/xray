import AwbListItem from '@/components/AwbListItem';
import EmptyState from '@/components/EmptyState';
import StatusBarSafeArea from '@/components/StatusBarSafeArea';
import SwipeList from '@/components/SwipeList';
import { useAuth } from '@/lib/store/auth';
import { formatDateTime } from '@/utils/formatDate';
import { gql, useQuery } from '@apollo/client';
import {
  Badge,
  Box,
  HStack,
  Input,
  InputField,
  InputIcon,
  InputSlot,
  Text,
  VStack,
  Spinner,
} from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowUpIcon,
  CalendarIcon,
  FilterIcon,
  PackageIcon,
  SearchIcon,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// GraphQL query - dengan pagination dan order by created_at DESC
const GET_AWB_LIST = gql`
  query GetAwbList($first: Int, $page: Int) {
    airwaybillxrays(first: $first, page: $page, orderBy: { column: CREATED_AT, order: DESC }) {
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
        created_at
        updated_at
        xray_photos_count
      }
    }
  }
`;

const ListScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Infinite scroll states
  const [currentPage, setCurrentPage] = useState(1);
  const [allAwbData, setAllAwbData] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);

  const { session, isLoading: authLoading } = useAuth();
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
      console.log('GraphQLErrors:', error.graphQLErrors);
      console.log('NetworkError:', error.networkError);
    },
    onCompleted: (data) => {
      // Initialize data on first load - gunakan urutan dari backend
      if (currentPage === 1) {
        setAllAwbData(data?.airwaybillxrays?.data || []);
        setHasMorePages(data?.airwaybillxrays?.paginatorInfo?.hasMorePages || false);
      }
    }
  });

  const swipeListRef = useRef<any>(null);

  // Filter list tanpa sorting - gunakan urutan dari backend
  const filteredAwbList = useMemo(() => {
    let list = allAwbData;

    // Jika ada search query, lakukan filter
    if (searchQuery.trim() !== '') {
      const lower = searchQuery.toLowerCase();
      list = allAwbData.filter((item: any) =>
        item.airwaybill_number.toLowerCase().includes(lower)
      );
    }

    // Tidak perlu sorting, gunakan urutan dari backend (seharusnya sudah terbaru dulu)
    return list;
  }, [allAwbData, searchQuery]);

  // Debug log untuk memantau urutan dari backend
  useEffect(() => {
    if (allAwbData.length > 0) {
      console.log('📊 Data order from backend:');
      console.log('First 3 items:',
        allAwbData.slice(0, 3).map(item => ({
          awb: item.airwaybill_number,
          date: new Date(item.created_at).toLocaleDateString(),
          full: new Date(item.created_at).toISOString()
        }))
      );
      console.log('Last 3 items:',
        allAwbData.slice(-3).map(item => ({
          awb: item.airwaybill_number,
          date: new Date(item.created_at).toLocaleDateString(),
          full: new Date(item.created_at).toISOString()
        }))
      );

      // Cek apakah urutan sudah benar (terbaru dulu)
      const firstDate = new Date(allAwbData[0].created_at).getTime();
      const lastDate = new Date(allAwbData[allAwbData.length - 1].created_at).getTime();
      const isCorrectOrder = firstDate > lastDate;
      console.log(`📈 Order correct (newest first): ${isCorrectOrder ? '✅ YES' : '❌ NO'}`);
    }
  }, [allAwbData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reset infinite scroll state
      setCurrentPage(1);
      setAllAwbData([]);
      setHasMorePages(true);

      const refreshData = await refetch({
        first: 20,
        page: 1,
      });

      // Gunakan data dari backend tanpa sorting
      if (refreshData?.data?.airwaybillxrays?.data) {
        setAllAwbData(refreshData.data.airwaybillxrays.data);
      }
    } catch (err) {
      console.error('Refetch error:', err);
    }
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Reset infinite scroll when search changes
    setCurrentPage(1);
    setAllAwbData([]);
    setHasMorePages(true);
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
      const result = await fetchMore({
        variables: {
          first: 20,
          page: nextPage,
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const previousData = previousResult?.airwaybillxrays?.data || [];
          const newData = fetchMoreResult?.airwaybillxrays?.data || [];
          const hasMore = fetchMoreResult?.airwaybillxrays?.paginatorInfo?.hasMorePages || false;

          // Update state - gabungkan data tanpa sorting (percaya pada backend)
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

    // Infinite scroll detection
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 1000; // Load more when 1000px from bottom

    if (isCloseToBottom && hasMorePages && !loadingMore && !graphQLLoading) {
      loadMoreData();
    }
  };

  // Loading state - hanya untuk auth loading, GraphQL loading ditampilkan dengan subtle
  if (authLoading) {
    return (
      <StatusBarSafeArea>
        <Box flex={1} bg="white">
          <LinearGradient
            colors={['#F8FAFC', '#F1F5F9', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          >
            <VStack flex={1} alignItems="center" justifyContent="center">
              <Box
                w="$16"
                h="$16"
                borderRadius="$xl"
                bg="#EFF6FF"
                alignItems="center"
                justifyContent="center"
              >
                <PackageIcon size={40} color="#0284C7" />
              </Box>
              <Text mt="$4" color="#64748B" fontSize="$lg">
                Loading...
              </Text>
            </VStack>
          </LinearGradient>
        </Box>
      </StatusBarSafeArea>
    );
  }

  // Error state
  if (error) {
    return (
      <StatusBarSafeArea>
        <Box flex={1} bg="white">
          <LinearGradient
            colors={['#F8FAFC', '#F1F5F9', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          >
            <VStack flex={1} alignItems="center" justifyContent="center" p="$4">
              <Box
                w="$16"
                h="$16"
                borderRadius="$xl"
                bg="#FEF2F2"
                alignItems="center"
                justifyContent="center"
              >
                <PackageIcon size={40} color="#DC2626" />
              </Box>
              <Text mt="$4" color="#64748B" fontSize="$lg" textAlign="center">
                Error loading AWB list
              </Text>
              <Text mt="$2" color="#94A3B8" fontSize="$sm" textAlign="center">
                {error.message}
              </Text>
              <TouchableOpacity onPress={onRefresh} style={{ marginTop: 20 }}>
                <Box px="$4" py="$2" bg="#0284C7" borderRadius="$md">
                  <Text color="white">Retry</Text>
                </Box>
              </TouchableOpacity>
            </VStack>
          </LinearGradient>
        </Box>
      </StatusBarSafeArea>
    );
  }

  return (
    <Box flex={1} bg="white">
      {/* White background gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 300,
        }}
      />

      <StatusBarSafeArea>
        <Box flex={1} style={{ padding: 10 }}>
          {/* Gradient Header */}
          <Box
            asChild
            shadow="$2"
            style={{
              zIndex: 10,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['#0EA5E9', '#0284C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <VStack mb="$md" space="md" p="$4">
                {/* Row: title + filter */}
                <Box
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  mb="$2"
                >
                  {/* Left: icon + text */}
                  <Box flexDirection="row" alignItems="center">
                    <Box
                      w="$12"
                      h="$12"
                      borderRadius="$2xl"
                      bg="rgba(255, 255, 255, 0.2)"
                      alignItems="center"
                      justifyContent="center"
                      shadow="$2"
                    >
                      <PackageIcon size={24} color="#FFFFFF" />
                    </Box>
                    <VStack ml="$3" space="xs">
                      <Text fontWeight="$bold" fontSize="$2xl" color="#FFFFFF">
                        AWB List
                      </Text>
                      <Text color="rgba(255, 255, 255, 0.8)" fontSize="$sm">
                        Manage your airwaybills
                      </Text>
                    </VStack>
                  </Box>

                  {/* Right: filter button */}
                  <TouchableOpacity style={styles.filterButton}>
                    <Box
                      w="$10"
                      h="$10"
                      borderRadius="$full"
                      bg="rgba(255, 255, 255, 0.2)"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <FilterIcon size={18} color="#FFFFFF" />
                    </Box>
                  </TouchableOpacity>
                </Box>

                {/* Search Bar */}
                <Box>
                  <Input
                    borderRadius="$2xl"
                    bg="rgba(255, 255, 255, 0.9)"
                    py="sm"
                    px="md"
                    borderWidth={1}
                    borderColor="rgba(255, 255, 255, 0.3)"
                    shadow="$1"
                  >
                    <InputSlot pl="$2">
                      <InputIcon as={SearchIcon} color="$text400" />
                    </InputSlot>

                    <InputField
                      placeholder="Search by AWB number"
                      value={searchQuery}
                      onChangeText={handleSearch}
                      color="$text900"
                      fontSize="$md"
                    />

                    {searchQuery.length > 0 && (
                      <InputSlot pr="$3">
                        <TouchableOpacity onPress={() => handleSearch('')}>
                          <Text color="$text400" fontSize="$sm">
                            Clear
                          </Text>
                        </TouchableOpacity>
                      </InputSlot>
                    )}
                  </Input>
                </Box>
              </VStack>
            </LinearGradient>
          </Box>

          {/* Content with SwipeList handling its own scrolling */}
          <Box style={{ flex: 1, paddingTop: 12 }} backgroundColor="transparent">
            {/* Subtle loading indicator for GraphQL loading */}
            {graphQLLoading && filteredAwbList.length === 0 && (
              <Box alignItems="center" py="$8">
                <VStack alignItems="center" space="sm">
                  <Spinner size="small" color="$primary600" />
                  <Text color="$text500" fontSize="$sm">Loading data...</Text>
                </VStack>
              </Box>
            )}

            {/* Stats Row - hanya tampilkan jika ada data atau tidak sedang loading awal */}
            {(!graphQLLoading || filteredAwbList.length > 0) && (
              <HStack
                justifyContent="space-between"
                alignItems="center"
                mb={10}
                mt={4}
              >
                <HStack alignItems="center" space="sm">
                  <Badge bg="$primary100" px="$3" py="$1" borderRadius="$full">
                    <Text color="$primary600" fontWeight="$600" fontSize="$sm">
                      {filteredAwbList.length} items
                    </Text>
                  </Badge>

                  {filteredAwbList.length > 0 && (
                    <HStack alignItems="center" space="xs">
                      <CalendarIcon size={12} color="#6B7280" />
                      <Text fontSize="$xs" color="$text400">
                        Newest first
                      </Text>
                    </HStack>
                  )}
                </HStack>
              </HStack>
            )}

            {/* AWB List / Empty State */}
            {filteredAwbList.length > 0 ? (
              <>
                <SwipeList
                  ref={swipeListRef}
                  data={filteredAwbList}
                  onItemClick={handleItemPress}
                  onRefresh={onRefresh}
                  refreshing={refreshing}
                  onScroll={handleScroll}
                  contentContainerStyle={{
                    paddingBottom: fabBottomPosition + (loadingMore ? 100 : 40),
                  }}
                />

                {/* Loading indicator for infinite scroll */}
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
                      <Spinner size="small" color="$primary600" />
                      <Text color="$text500" fontSize="$sm">Loading more...</Text>
                    </VStack>
                  </Box>
                )}

                {/* End of data indicator */}
                {!hasMorePages && filteredAwbList.length > 0 && (
                  <Box alignItems="center" py="$2">
                    <Text color="$text400" fontSize="$xs">End of results</Text>
                  </Box>
                )}
              </>
            ) : (
              <Box mt="$8">
                <EmptyState
                  title="No AWB Found"
                  subtitle={
                    searchQuery
                      ? 'Try adjusting your search terms'
                      : 'Capture your first airwaybill using the + button'
                  }
                  icon={searchQuery ? SearchIcon : PackageIcon}
                />
              </Box>
            )}
          </Box>
        </Box>

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
              bg="$primary600"
              alignItems="center"
              justifyContent="center"
              shadow="$4"
            >
              <ArrowUpIcon size={20} color="#FFFFFF" />
            </Box>
          </TouchableOpacity>
        )}
      </StatusBarSafeArea>
    </Box>
  );
};

const styles = {
  filterButton: {
    borderRadius: 50,
  },
  scrollToTopButton: {
    position: 'absolute' as const,
    right: 20,
    borderRadius: 50,
    zIndex: 999,
  },
};

export default ListScreen;