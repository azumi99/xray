import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Box, HStack } from '@gluestack-ui/themed';
import { PackageIcon, UserIcon, PlusIcon, ScanText } from 'lucide-react-native';

interface BottomNavProps {
  onAddPress?: () => void;
  onOcrPress?: () => void;
}

const BottomNav = ({ onAddPress, onOcrPress }: BottomNavProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('list');

  const handleTabPress = (tab: string, route: string) => {
    setActiveTab(tab);
    router.push(route);
  };

  const handleAddPress = () => {
    if (onAddPress) {
      onAddPress();
    } else {
      console.log('Add button pressed');
    }
  };

  const handleOcrPress = () => {
    if (onOcrPress) {
      onOcrPress();
    } else {
      console.log('OCR button pressed');
    }
  };

  return (
    <Box
      position="absolute"
      bottom={20}
      left="5%"
      right="5%"
      borderRadius="$2xl"
      bg="rgba(255, 255, 255, 0.98)"
      style={{
        backdropFilter: 'blur(15px)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      py="$3"
    >
      <HStack alignItems="center" justifyContent="space-between" px="$6">
        {/* List Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress('list', '/(tabs)/list')}
          style={[styles.tabItem]}
        >
          <Box
            bg={activeTab === 'list' ? 'rgba(2, 132, 199, 0.1)' : 'transparent'}
            p="$2"
            borderRadius="$full"
            mb="$1"
          >
            <PackageIcon
              size={20}
              color={activeTab === 'list' ? '#0284C7' : '#6B7280'}
            />
          </Box>
          <Text
            style={[
              styles.tabText,
              activeTab === 'list' && styles.activeTabText
            ]}
          >
            List
          </Text>
        </TouchableOpacity>

        {/* OCR Tab */}
        <TouchableOpacity
          onPress={handleOcrPress}
          style={[styles.tabItem]}
        >
          <Box
            bg={activeTab === 'ocr' ? 'rgba(2, 132, 199, 0.1)' : 'transparent'}
            p="$2"
            borderRadius="$full"
            mb="$1"
          >
            <ScanText
              size={20}
              color={activeTab === 'ocr' ? '#0284C7' : '#6B7280'}
            />
          </Box>
          <Text
            style={[
              styles.tabText,
              activeTab === 'ocr' && styles.activeTabText
            ]}
          >
            OCR
          </Text>
        </TouchableOpacity>

        {/* Spacer for Add Button */}
        <View style={{ width: 60 }} />

        {/* Profile Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress('profile', '/(tabs)/profile')}
          style={[styles.tabItem]}
        >
          <Box
            bg={activeTab === 'profile' ? 'rgba(2, 132, 199, 0.1)' : 'transparent'}
            p="$2"
            borderRadius="$full"
            mb="$1"
          >
            <UserIcon
              size={20}
              color={activeTab === 'profile' ? '#0284C7' : '#6B7280'}
            />
          </Box>
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

      {/* Add Button - Centered and raised */}
      <TouchableOpacity
        onPress={handleAddPress}
        activeOpacity={0.8}
        style={styles.addButtonContainer}
      >
        <Box
          bg="#0284C7"
          p="$4"
          borderRadius="$full"
          style={styles.addButton}
          borderWidth={3}
          borderColor="white"
        >
          <PlusIcon size={28} color="white" strokeWidth={3} />
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  tabText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0284C7',
    fontWeight: '600',
  },
  addButtonContainer: {
    position: 'absolute',
    top: -25,
    alignSelf: 'center',
    zIndex: 10,
  },
  addButton: {
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default BottomNav;