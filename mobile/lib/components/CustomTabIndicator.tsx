import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface CustomTabIndicatorProps {
  tabs: { key: string; title: string; icon: string }[];
  activeTab: string;
  onTabPress: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}

const CustomTabIndicator: React.FC<CustomTabIndicatorProps> = ({ 
  tabs, 
  activeTab, 
  onTabPress,
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            activeTab === tab.key && styles.activeTabButton,
          ]}
          onPress={() => onTabPress(tab.key)}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab.key && styles.activeTabText
          ]}>
            {tab.icon} {tab.title}
          </Text>
          {activeTab === tab.key && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeTabButton: {
    backgroundColor: '#F3F4F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '60%',
    height: 3,
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
});

export default CustomTabIndicator;