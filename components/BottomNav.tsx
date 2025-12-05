import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PackageIcon, UserIcon, ScanText } from 'lucide-react-native';

interface BottomNavProps {
  onOcrPress?: () => void;
}

const BottomNav = ({ onOcrPress }: BottomNavProps) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('list');
  const insets = useSafeAreaInsets();

  const handleTabPress = (tab: string, route: string) => {
    setActiveTab(tab);
    router.push(route);
  };

  const handleOcrPress = () => {
    if (onOcrPress) {
      onOcrPress();
    } else {
      console.log('OCR button pressed');
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 16), // Use safe area insets with minimum 16px
        }
      ]}
    >
      <View style={styles.navContainer}>
        {/* List Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress('list', '/(tabs)/list')}
          style={[styles.tabItem, styles.sideTabItem]}
          activeOpacity={0.7}
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

        {/* Profile Tab */}
        <TouchableOpacity
          onPress={() => handleTabPress('profile', '/(tabs)/profile')}
          style={[styles.tabItem, styles.sideTabItem]}
          activeOpacity={0.7}
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
      </View>

      {/* OCR Tab - Absolute Position */}
      <TouchableOpacity
        onPress={handleOcrPress}
        style={styles.crAbsoluteTab}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.crIconContainer,
            activeTab === 'ocr' && styles.crIconContainerActive
          ]}
        >
          <ScanText
            size={26}
            color={activeTab === 'ocr' ? '#FFFFFF' : '#0284C7'}
          />
        </View>
        <Text
          style={[
            styles.ocrTabText,
            activeTab === 'ocr' && styles.ocrTabTextActive
          ]}
        >
          OCR
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32, // Increased padding for more breathing room
    paddingVertical: 8,
    minHeight: 60,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 44, // Minimum touch target size
  },
  sideTabItem: {
    flex: 0, // Don't flex to allow space-between to work
    minWidth: 80, // Minimum width for comfortable touch targets
    paddingHorizontal: 16, // Extra horizontal padding
  },
  tabText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#0284C7',
    fontWeight: '600',
  },
  // OCR Tab Absolute Position Styles
  crAbsoluteTab: {
    position: 'absolute',
    top: -25, // Slightly higher for better visual separation
    left: '50%',
    marginLeft: -35, // Center the button (half of 70px width)
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    zIndex: 10,
  },
  crIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  crIconContainerActive: {
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  ocrTabText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  ocrTabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
});

export default BottomNav;