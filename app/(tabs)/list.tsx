import AwbListItem from '@/components/AwbListItem';
import EmptyState from '@/components/EmptyState';
import StatusBarSafeArea from '@/components/StatusBarSafeArea';
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
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// GraphQL query - fetch semua data karena backend tidak support orderBy
const GET_AWB_LIST = gql`
  query GetAwbList {
    airwaybillXrays(first: 100, page: 1) {
      data {
        id
        airwaybill_number
        photo_airwaybill
        created_at
        updated_at
        xray_photos_count
      }
      paginatorInfo {
        currentPage
        lastPage
        total
      }
    }
  }
`;

const ListScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { session, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  // Calculate dynamic bottom positioning for FAB
  const bottomNavHeight = 60;
  const fabMargin = 20;
  const fabBottomPosition = bottomNavHeight + Math.max(insets.bottom, 16) + fabMargin;

  // GraphQL fetch - gunakan no-cache untuk memastikan data terbaru
  const {
    data,
    loading: graphQLLoading,
    error,
    refetch,
  } = useQuery(GET_AWB_LIST, {
    skip: !session,
    fetchPolicy: 'no-cache', // Gunakan no-cache untuk menghindari masalah cache
    notifyOnNetworkStatusChange: true,
  });

  // console.log('GraphQL data:', JSON.stringify(data, null, 1));
  
  const awbList = data?.airwaybillXrays?.data || [];

  const scrollRef = useRef<ScrollView | null>(null);

  // Sort dan filter list
  const filteredAwbList = useMemo(() => {
    // Filter dulu jika ada search query
    let list = awbList;
    
    if (searchQuery.trim() !== '') {
      const lower = searchQuery.toLowerCase();
      list = awbList.filter((item: any) =>
        item.airwaybill_number.toLowerCase().includes(lower)
      );
    }

    // Sort descending (terbaru di atas) - PAKSA SORT di sini
    const sortedList = [...list].sort((a, b) => {
      // Parse date strings menjadi timestamp
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      
      // Debug log untuk memastikan sorting
      if (list.length <= 3) {
        console.log('Sort comparison:', {
          a: a.airwaybill_number,
          b: b.airwaybill_number,
          dateA: new Date(a.created_at).toISOString(),
          dateB: new Date(b.created_at).toISOString(),
          result: dateB - dateA
        });
      }
      
      // Descending: terbaru dulu (dateB - dateA)
      return dateB - dateA;
    });

    return sortedList;
  }, [awbList, searchQuery]);

  // Debug log untuk melihat hasil sorting
  useEffect(() => {
    if (filteredAwbList.length > 0) {
      console.log('Filtered AWB List (first 3):', 
        filteredAwbList.slice(0, 3).map(item => ({
          number: item.airwaybill_number,
          created: new Date(item.created_at).toISOString()
        }))
      );
    }
  }, [filteredAwbList]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (err) {
      console.error('Refetch error:', err);
    }
    setRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleItemPress = (id: string) => {
    router.push(`/detail/${id}`);
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = e.nativeEvent.contentOffset.y;
    setShowScrollTop(scrollY > 200);
  };

  // Loading state
  if (authLoading || graphQLLoading) {
    return (
      <StatusBarSafeArea>
        <Box flex={1} bg="$background0">
          <LinearGradient
            colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          >
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
                Loading AWB List...
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
        <Box flex={1} bg="$background0">
          <LinearGradient
            colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          >
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
                Error loading AWB list
              </Text>
              <Text mt="$2" color="$text400" fontSize="$sm" textAlign="center">
                {error.message}
              </Text>
              <TouchableOpacity onPress={onRefresh} style={{ marginTop: 20 }}>
                <Box px="$4" py="$2" bg="$primary600" borderRadius="$md">
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
    <Box flex={1} bg="$background0">
      {/* Soft background gradient */}
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
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

          {/* Scrollable Content */}
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: fabBottomPosition + 40,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0284C7']}
                tintColor="#0284C7"
              />
            }
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Stats Row */}
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

            {/* AWB List / Empty State */}
            {filteredAwbList.length > 0 ? (
              <VStack space="sm">
                {filteredAwbList.map((item: any, index: number) => (
                  <AwbListItem
                    key={item.id}
                    awbNumber={item.airwaybill_number}
                    date={formatDateTime(new Date(item.created_at))}
                    onPress={() => handleItemPress(item.id)}
                    index={index}
                    status="Pending"
                  />
                ))}
              </VStack>
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
          </ScrollView>
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