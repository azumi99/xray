import React, { useRef, useState } from 'react';
import {
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  VStack,
  Input,
  InputField,
  InputIcon,
  InputSlot,
  HStack,
  Box,
  Badge,
  Text,
} from '@gluestack-ui/themed';
import {
  SearchIcon,
  PackageIcon,
  CalendarIcon,
  FilterIcon,
  ArrowUpIcon,
} from 'lucide-react-native';
import AwbListItem from '@/components/AwbListItem';
import EmptyState from '@/components/EmptyState';
import { mockAwbList } from '@/mocks/awbList';
import { formatDateTime } from '@/utils/formatDate';
import StatusBarSafeArea from '@/components/StatusBarSafeArea';
import { LinearGradient } from 'expo-linear-gradient';

const ListScreen = () => {
  const [awbList] = useState(mockAwbList);
  const [filteredAwbList, setFilteredAwbList] = useState(mockAwbList);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredAwbList(awbList);
    } else {
      const lower = query.toLowerCase();
      const filtered = awbList.filter(
        (item) =>
          item.awbNumber.toLowerCase().includes(lower) ||
          item.customerName.toLowerCase().includes(lower) ||
          item.origin.toLowerCase().includes(lower) ||
          item.destination.toLowerCase().includes(lower)
      );
      setFilteredAwbList(filtered);
    }
  };

  const handleItemPress = (id: string) => {
    console.log('Navigate to detail for id:', id);
  };


  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = e.nativeEvent.contentOffset.y;
    setShowScrollTop(scrollY > 300);
  };

  return (
    <Box flex={1} bg="$background0">
      {/* Soft background gradient di atas */}
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        start={[0, 0]}
        end={[0, 1]}
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
              start={[0, 0]}
              end={[1, 1]}
            >
              <VStack mb="$md" space="md" p="$4">
                <HStack alignItems="center" justifyContent="space-between" mb="$2">
                  <HStack alignItems="center" space="md">
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
                    <VStack space="xs">
                      <Text fontWeight="$bold" fontSize="$2xl" color="$text0">
                        AWB List
                      </Text>
                      <Text color="rgba(255, 255, 255, 0.8)" fontSize="$sm">
                        Manage your airwaybills
                      </Text>
                    </VStack>
                  </HStack>

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
                </HStack>

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
                      placeholder="Search by AWB number, customer, or route"
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
              paddingBottom: 120,
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
            <HStack justifyContent="space-between" alignItems="center" mb={10} mt={4}>
              <HStack alignItems="center" space="sm">
                <Badge
                  bg="$primary100"
                  px="$3"
                  py="$1"
                  borderRadius="$full"
                >
                  <Text color="$primary600" fontWeight="$600" fontSize="$sm">
                    {filteredAwbList.length} items
                  </Text>
                </Badge>

                {filteredAwbList.length > 0 && (
                  <HStack alignItems="center" space="xs">
                    <CalendarIcon size={12} color="#6B7280" />
                    <Text fontSize="$xs" color="$text400">
                      Last updated today
                    </Text>
                  </HStack>
                )}
              </HStack>
            </HStack>

            {/* AWB List / Empty State */}
            {filteredAwbList.length > 0 ? (
              <VStack space="sm">
                {filteredAwbList.map((item, index) => (
                  <AwbListItem
                    key={item.id}
                    awbNumber={item.awbNumber}
                    date={formatDateTime(item.date)}
                    onPress={() => handleItemPress(item.id)}
                    index={index}
                    status={item.status}
                    customerName={item.customerName}
                    origin={item.origin}
                    destination={item.destination}
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
            style={styles.scrollToTopButton}
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
    bottom: 80,
    right: 20,
    borderRadius: 50,
  },
};

export default ListScreen;
