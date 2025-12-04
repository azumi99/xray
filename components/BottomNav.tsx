import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Box, HStack } from '@gluestack-ui/themed';
import { PackageIcon, UserIcon, PlusIcon } from 'lucide-react-native';

const BottomNav = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('list');

  const handleTabPress = (tab: string, route: string) => {
    setActiveTab(tab);
    router.push(route);
  };

  const handleAddPress = () => {
    router.push('/add-camera');
  };

  return (
    <Box
      position="absolute"
      bottom={10}
      left="10%"
      right="10%"
      borderRadius="$3xl"
      bg="rgba(255, 255, 255, 0.95)"
      shadow="$6"
      overflow="hidden"
      style={{
        backdropFilter: 'blur(20px)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      }}
      pb="$8"
    >
      <HStack alignItems="center" justifyContent="space-around" px="lg" py="sm">
        {/* List Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress('list', '/(tabs)/list')}
          style={[
            styles.tabItem,
            activeTab === 'list' && styles.activeTab
          ]}
        >
          <PackageIcon
            size={22}
            color={activeTab === 'list' ? '#0284C7' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'list' && styles.activeTabText
            ]}
          >
            List
          </Text>
        </TouchableOpacity>

        {/* Spacer for floating button */}
        <View style={styles.spacer} />

        {/* Profile Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress('profile', '/(tabs)/profile')}
          style={[
            styles.tabItem,
            activeTab === 'profile' && styles.activeTab
          ]}
        >
          <UserIcon
            size={22}
            color={activeTab === 'profile' ? '#0284C7' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'profile' && styles.activeTabText
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </HStack>

      {/* Modern Floating Add Button with Gradient Effect */}
      <TouchableOpacity
        onPress={handleAddPress}
        activeOpacity={0.9}
        style={[
          styles.addButton,
          {
            shadowColor: '#0284C7',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 12,
          }
        ]}
      >
        <Box
          style={styles.addInnerButton}
          bg="linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)"
        >
          <PlusIcon size={28} color="white" strokeWidth={3} />
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  tabText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: '#0284C7',
    fontWeight: '600',
  },
  spacer: {
    width: 80,
  },
  addButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  addInnerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default BottomNav;