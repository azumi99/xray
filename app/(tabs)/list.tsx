import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { VStack, Input, InputField, InputIcon, InputSlot, HStack, Box, LinearGradient, Badge } from '@gluestack-ui/themed';
import { SearchIcon, PackageIcon, CalendarIcon, FilterIcon, ArrowUpIcon, CameraIcon } from 'lucide-react-native';
import AwbListItem from '@/components/AwbListItem';
import EmptyState from '@/components/EmptyState';
import { mockAwbList } from '@/mocks/awbList';
import { formatDateTime } from '@/utils/formatDate';
import StatusBarSafeArea from '@/components/StatusBarSafeArea';

const ListScreen = () => {
  const [awbList, setAwbList] = useState(mockAwbList);
  const [filteredAwbList, setFilteredAwbList] = useState(mockAwbList);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

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
      const filtered = awbList.filter(item =>
        item.awbNumber.toLowerCase().includes(query.toLowerCase()) ||
        item.customerName.toLowerCase().includes(query.toLowerCase()) ||
        item.origin.toLowerCase().includes(query.toLowerCase()) ||
        item.destination.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredAwbList(filtered);
    }
  };

  const handleItemPress = (id: string) => {
    console.log('Navigate to detail for id:', id);
  };

  const handleAddAwb = () => {
    console.log('Add new AWB using camera');
  };

  const scrollToTop = () => {
    // Implementation for scroll to top would go here
    // This requires a ref to the ScrollView
  };

  return (
    <Box flex={1} bg="$background0">
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 200 }}
      />
      <StatusBarSafeArea>
        <Box flex={1} style={{ padding: 10 }}>
          {/* Sticky Header with enhanced styling */}
          <Box bg="transparent" py="$md" px="$lg" shadow="$2" style={{ zIndex: 10 }}>
            {/* Enhanced Header */}
            <VStack mb="$md" space="md">
              <HStack alignItems="center" justifyContent="space-between" mb="sm">
                <HStack alignItems="center" space="md">
                  <Box
                    w="$12"
                    h="$12"
                    borderRadius="$2xl"
                    bg="$primary600"
                    alignItems="center"
                    justifyContent="center"
                    shadow="$2"
                  >
                    <PackageIcon size={24} color="white" />
                  </Box>
                  <VStack space="sm">
                    <Text fontWeight="$bold" fontSize="$2xl" color="$text0">
                      AWB List
                    </Text>
                    <Text color="$text400" fontSize="$sm">
                      Manage your airwaybills
                    </Text>
                  </VStack>
                </HStack>

                <TouchableOpacity style={styles.filterButton}>
                  <Box
                    w="$10"
                    h="$10"
                    borderRadius="$full"
                    bg="$background100"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <FilterIcon size={18} color="#6B7280" />
                  </Box>
                </TouchableOpacity>
              </HStack>
            </VStack>

            {/* Enhanced Search Bar */}
            <Box>
              <Input
                borderRadius="$2xl"
                bg="$background0"
                py="sm"
                px="md"
                borderWidth={1}
                borderColor="$background200"
                shadow="$1"
              >
                <InputIcon as={SearchIcon} ml="$1" mt="$3" color="$text400" size="sm" />
                <InputField
                  placeholder="Search by AWB number"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  color="$text0"
                  fontSize="$md"
                />
                {searchQuery.length > 0 && (
                  <InputSlot pr="$3">
                    <TouchableOpacity onPress={() => handleSearch('')}>
                      <Text color="$text400" fontSize="$sm">Clear</Text>
                    </TouchableOpacity>
                  </InputSlot>
                )}
              </Input>
            </Box>
          </Box>

          {/* Scrollable Content */}
          <ScrollView
            contentContainerStyle={{
              paddingTop: 10, // Small padding since header is now sticky
              paddingBottom: 120
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0284C7']}
                tintColor="#0284C7"
              />
            }
            onScroll={(e) => {
              const scrollY = e.nativeEvent.contentOffset.y;
              setShowScrollTop(scrollY > 300);
            }}
            scrollEventThrottle={16}
          >
            {/* Stats Row */}
            <HStack justifyContent="space-between" alignItems="center" mb={10}>
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
                    <Text fontSize="$xs" color="$text400">Last updated today</Text>
                  </HStack>
                )}
              </HStack>
            </HStack>

            {/* AWB List or Empty State */}
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
              <Box>
                <EmptyState
                  title="No AWB Found"
                  subtitle={
                    searchQuery
                      ? "Try adjusting your search terms"
                      : "Capture your first airwaybill using the + button"
                  }
                  icon={searchQuery ? SearchIcon : PackageIcon}
                />
              </Box>
            )}
          </ScrollView>
        </Box>

        {/* Scroll to Top Button */}
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
              <ArrowUpIcon size={20} color="white" />
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